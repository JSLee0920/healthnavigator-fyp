import asyncio
from typing import Optional
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from pydantic import SecretStr
from app.core.config import settings

from app.services.rag.retrievers import (
    fetch_user_profile,
    search_healthcare_guidelines,
    search_knowledge_graph,
)


class HybridRagService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=SecretStr(settings.GROQ_API_KEY),
            model="llama-3.3-70b-versatile",
            temperature=0.1,
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are a HealthNavigator, a professional healthcare assistant. Synthesize the provided information naturally to answer the user.

                    Instructions:
                    1. Grounding: If the answer isn't in the provided information, state that the information is unavailable.
                    2. Reasoning: Briefly analyze symptoms before concluding.
                    3. Graph: Include 'Graph Knowledge' as related concepts if present; otherwise, ignore.
                    4. Citations: List the actual 'Healthcare Sources' provided below at the very end of your response under a strict "**Sources:**" heading. Do NOT use inline citations.

                    Healthcare Information: {context}
                    Graph Knowledge: {graph_info}
                    Sources: {sources_info}""",
                ),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{question}"),
            ]
        )

        self.rag_chain = (
            {
                "context": lambda x: x["context"],
                "question": lambda x: x["question"],
                "history": lambda x: x["history"],
                "graph_info": lambda x: x["graph_info"],
                "sources_info": lambda x: x["sources_info"],
            }
            | self.prompt
            | self.llm
            | StrOutputParser()
        )

    async def stream_response(self, user_id: str, question: str):
        """Fetches live data and streams the LLM response."""

        profile_data, vector_context, graph_knowledge = await asyncio.gather(
            fetch_user_profile(user_id),
            search_healthcare_guidelines(question),
            search_knowledge_graph(question),
        )

        combined_context = (
            f"User Profile:\n{profile_data}\n\nMedical Guidelines:\n{vector_context}"
        )
        sources = "Qdrant Vector DB, Neo4j Knowledge Graph, PostgreSQL User Data"

        async for chunk in self.rag_chain.astream(
            {
                "question": question,
                "history": [],
                "context": combined_context,
                "graph_info": graph_knowledge,
                "sources_info": sources,
            }
        ):
            yield f"data: {chunk}\n\n"

        yield "data: [DONE]\n\n"

    async def reformulate_query(self, history: list[dict], user_question: str) -> str:
        """
        Takes the chat history and the new question, and asks Llama 3 to
        rewrite it as a standalone question so the vector database understands it.
        """
        if not history:
            return user_question

        # Format the history into a readable string for the LLM
        history_text = "\n".join(
            [f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-4:]]
        )  # grab last 4 messages

        # The System Prompt that forces the LLM to ONLY rewrite the question
        system_prompt = """
        You are an AI language model assisting with query reformulation for a healthcare database search.
        Given the following conversation history and a follow-up question, rephrase the follow-up question to be a standalone question. 
        If the follow-up question is already standalone and does not reference past context (like "it", "they", "this condition"), return it exactly as it is.
        DO NOT answer the question. ONLY return the reformulated question.
        """

        user_prompt = f"Chat History:\n{history_text}\n\nFollow-up question: {user_question}\n\nStandalone question:"

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]

            response = await self.llm.ainvoke(messages, temperature=0.1, max_tokens=50)

            raw_content = response.content

            if isinstance(raw_content, list):
                text_content = str(raw_content[0])
            else:
                text_content = str(raw_content)

            reformulated_question = text_content.strip()

            print(
                f"Original: '{user_question}' | Reformulated: '{reformulated_question}'"
            )
            return reformulated_question

        except Exception as e:
            print(f"Reformulation failed, falling back to original query: {e}")
            return user_question

    async def get_response(
        self, user_id: str, question: str, chat_history: Optional[list] = None
    ):
        """Fetches live data and returns the FULL response at once (No streaming)."""
        if chat_history is None:
            chat_history = []

        standalone_question = await self.reformulate_query(chat_history, question)

        profile_data, vector_context, graph_knowledge = await asyncio.gather(
            fetch_user_profile(user_id),
            search_healthcare_guidelines(standalone_question),
            search_knowledge_graph(standalone_question),
        )

        combined_context = (
            f"User Profile:\n{profile_data}\n\nMedical Guidelines:\n{vector_context}"
        )
        sources = "Qdrant Vector DB, Neo4j Knowledge Graph, PostgreSQL User Data"
        langchain_history = []
        for msg in chat_history:
            if msg.get("role") == "user":
                langchain_history.append(HumanMessage(content=msg.get("content", "")))
            else:
                langchain_history.append(AIMessage(content=msg.get("content", "")))

        response = await self.rag_chain.ainvoke(
            {
                "question": question,
                "history": langchain_history,
                "context": combined_context,
                "graph_info": graph_knowledge,
                "sources_info": sources,
            }
        )

        return response
