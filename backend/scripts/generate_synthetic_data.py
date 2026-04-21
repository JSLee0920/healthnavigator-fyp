import os
import random
from langchain_core.documents import Document
from ragas.testset import TestsetGenerator
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.run_config import RunConfig
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import SecretStr

from app.core.config import settings
from app.services.ingestion.parser import UniversalDataParser


def generate_testset():
    print("Initializing Generator Models...")

    llm = ChatGroq(
        api_key=SecretStr(settings.GROQ_API_KEY), model="llama-3.1-8b-instant"
    )
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    generator_llm = LangchainLLMWrapper(llm)
    generator_embeddings = LangchainEmbeddingsWrapper(embeddings)

    generator = TestsetGenerator(
        llm=generator_llm, embedding_model=generator_embeddings
    )

    print("Loading XML Data...")
    raw_chunks = UniversalDataParser.load_file("mplus_topics_2024.xml")

    langchain_docs = []
    for chunk in raw_chunks:
        langchain_docs.append(
            Document(page_content=chunk["text"], metadata=chunk["metadata"])
        )

    print(f"Loaded {len(langchain_docs)} total documents.")
    random.shuffle(langchain_docs)
    sampled_docs = langchain_docs[:15]  # Grab 40 random chunks
    print(f"Sampled down to {len(sampled_docs)} documents")

    safe_config = RunConfig(max_workers=2, max_wait=3)

    print("Generating synthetic questions...")
    testset = generator.generate_with_langchain_docs(
        sampled_docs, testset_size=15, run_config=safe_config
    )

    # Export to CSV
    os.makedirs("eval_results", exist_ok=True)
    export_path = "eval_results/synthetic_questions.csv"

    df = testset.to_pandas()  # type: ignore
    df.to_csv(export_path, index=False)
    print(f"Successfully generated synthetic dataset and saved to {export_path}!")


if __name__ == "__main__":
    generate_testset()
