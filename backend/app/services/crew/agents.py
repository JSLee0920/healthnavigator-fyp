from crewai import Agent, Crew, Process, Task
from langchain_groq import ChatGroq
from app.core.config import settings
from app.services.crew.tools import (
    search_healthcare_guidelines,
    fetch_user_profile,
    search_knowledge_graph,
)
from pydantic import SecretStr


class HealthNavigatorCrew:
    def __init__(self):
        self.llm = ChatGroq(
            temperature=0.1,
            api_key=SecretStr(settings.GROQ_API_KEY),
            model="llama-3.3-70b-versatile",
        )

    def create_triage_agent(self) -> Agent:
        return Agent(
            role="Clinical Triage Specialist",
            goal="Analyze user symptoms, fetch their user profile, and determine severity.",
            backstory="You are an expert AI triage specialist.",
            verbose=True,
            tools=[
                fetch_user_profile,
                search_healthcare_guidelines,
                search_knowledge_graph,
            ],
            llm=self.llm,
        )

    def create_preventive_agent(self) -> Agent:
        return Agent(
            role="Preventive Health Advisor",
            goal="Provide general wellness advice based on the healthcare guidelines.",
            backstory="You specialize in preventative medicine using healthcare guidelines.",
            verbose=True,
            tools=[search_healthcare_guidelines],
            llm=self.llm,
        )

    async def run_query_stream(self, user_id: str, user_query: str):
        yield "data: Analyzing user profile...\n\n"

        triage = self.create_triage_agent()
        preventative = self.create_preventive_agent()

        analysis_task = Task(
            description=f"User ID: {user_id}. Query: '{user_query}'. Provide assessment.",
            expected_output="Markdown response with assessment.",
            agent=triage,
        )

        crew = Crew(
            agents=[triage, preventative],
            tasks=[analysis_task],
            process=Process.sequential,
        )

        yield "data: Consulting healthcare guidelines...\n\n"
        result = crew.kickoff()

        words = str(result).split(" ")

        for i in range(0, len(words), 5):
            chunk = " ".join(words[i : i + 5]) + " "
            yield f"data: {chunk}\n\n"

        yield "data: [DONE]\n\n"
