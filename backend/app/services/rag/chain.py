from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
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
                    """You are a healthcare assistant. Answer ONLY using the provided medical context and graph knowledge.

                    Instructions:
                    1. Grounding: If the answer isn't in the Context, state that the information is unavailable.
                    2. Reasoning: Briefly analyze symptoms before concluding.
                    3. Citations: Use parenthetical citations, e.g., (Source: Title).
                    4. Graph: Include 'Graph Knowledge' as related concepts if present; otherwise, ignore.

                    Context: {context}
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

        profile_data = await fetch_user_profile(user_id)
        vector_context = await search_healthcare_guidelines(question)
        graph_knowledge = await search_knowledge_graph(question)

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

    async def get_response(self, user_id: str, question: str):
        """Fetches live data and returns the FULL response at once (No streaming)."""

        # Fetch data just like before
        profile_data = await fetch_user_profile(user_id)
        vector_context = await search_healthcare_guidelines(question)
        graph_knowledge = await search_knowledge_graph(question)

        combined_context = (
            f"User Profile:\n{profile_data}\n\nMedical Guidelines:\n{vector_context}"
        )
        sources = "Qdrant Vector DB, Neo4j Knowledge Graph, PostgreSQL User Data"

        # Use .ainvoke() instead of .astream()!
        # This waits for the entire generation to finish.
        response = await self.rag_chain.ainvoke(
            {
                "question": question,
                "history": [],
                "context": combined_context,
                "graph_info": graph_knowledge,
                "sources_info": sources,
            }
        )

        return response
