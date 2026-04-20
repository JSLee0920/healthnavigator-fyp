import asyncio
import os
import pandas as pd
from ragas import SingleTurnSample, EvaluationDataset, evaluate
from ragas.metrics import Faithfulness, AnswerRelevancy, ContextPrecision, ContextRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import SecretStr

from app.services.rag.chain import HybridRagService
from app.core.config import settings

MANUAL_TEST_SET = [
    {
        "question": "What exactly is an abscess and what are the standard treatments for it?",
        "ground_truth": "An abscess is a pocket of pus that forms when the immune system fights an infection. Standard treatments include drainage and antibiotics.",
    },
    {
        "question": "When should I seek immediate medical help for abdominal pain?",
        "ground_truth": "You should seek immediate medical help if the abdominal pain is sudden and sharp, or if you are vomiting blood.",
    },
    {
        "question": "What specific dosage of antibiotics is recommended to treat an abscess in a 10-year-old child?",
        "ground_truth": "I cannot answer this based on the provided healthcare guidelines.",
    },
]

TEST_USER_ID = "39af4f00-038c-4a5f-a833-39fde31361fe"


async def run_evaluation():
    print("Initializing Hybrid RAG Service...")
    rag_service = HybridRagService()

    llm = ChatGroq(
        api_key=SecretStr(settings.GROQ_API_KEY), model="llama-3.3-70b-versatile"
    )
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    judge_llm = LangchainLLMWrapper(llm)
    judge_embeddings = LangchainEmbeddingsWrapper(embeddings)

    metrics = [
        Faithfulness(llm=judge_llm),
        AnswerRelevancy(llm=judge_llm, embeddings=judge_embeddings),
        ContextPrecision(llm=judge_llm),
        ContextRecall(llm=judge_llm),
    ]

    all_questions = []
    for item in MANUAL_TEST_SET:
        all_questions.append({"q": item["question"], "gt": item["ground_truth"]})

    synthetic_path = "eval_results/synthetic_questions.csv"
    if os.path.exists(synthetic_path):
        print(f"Detected synthetic questions at {synthetic_path}. Loading...")
        df_synthetic = pd.read_csv(synthetic_path)
        for _, row in df_synthetic.iterrows():
            all_questions.append({"q": row["user_input"], "gt": row["reference"]})

    print(f"Total questions queued for evaluation: {len(all_questions)}\n")

    # --- Phase 1: Vector-Only Evaluation ---
    print("==================================================")
    print(" PHASE 1: RUNNING VECTOR-ONLY (Qdrant) EVALUATION")
    print("==================================================")
    vector_samples = []

    for item in all_questions:
        print(f"[Vector] Evaluating: '{item['q']}'")
        eval_data = await rag_service.get_evaluation_data(
            question=item["q"],
            include_profile=False,
            use_graph=False,
            user_id=TEST_USER_ID,
        )
        # Create the new Ragas Sample object
        sample = SingleTurnSample(
            user_input=item["q"],
            response=eval_data["answer"],
            retrieved_contexts=eval_data["contexts"],
            reference=item["gt"],
        )
        vector_samples.append(sample)

    vector_dataset = EvaluationDataset(samples=vector_samples)
    vector_score = evaluate(dataset=vector_dataset, metrics=metrics)
    vector_score.to_pandas().to_csv(  # type: ignore
        "eval_results/vector_only_scorecard.csv", index=False
    )

    print("--> Vector-Only Results saved to eval_results/vector_only_scorecard.csv\n")

    # --- Phase 2: Hybrid Evaluation ---
    print("==================================================")
    print(" PHASE 2: RUNNING HYBRID (Qdrant + Neo4j) EVALUATION")
    print("==================================================")
    hybrid_samples = []

    for item in all_questions:
        print(f"[Hybrid] Evaluating: '{item['q']}'")
        eval_data = await rag_service.get_evaluation_data(
            question=item["q"],
            include_profile=False,
            use_graph=True,
            user_id=TEST_USER_ID,
        )
        sample = SingleTurnSample(
            user_input=item["q"],
            response=eval_data["answer"],
            retrieved_contexts=eval_data["contexts"],
            reference=item["gt"],
        )
        hybrid_samples.append(sample)

    hybrid_dataset = EvaluationDataset(samples=hybrid_samples)
    hybrid_score = evaluate(dataset=hybrid_dataset, metrics=metrics)
    hybrid_score.to_pandas().to_csv("eval_results/hybrid_scorecard.csv", index=False)  # type: ignore
    print("--> Hybrid Results saved to eval_results/hybrid_scorecard.csv\n")

    print("\nEvaluation Process is finished!")


if __name__ == "__main__":
    asyncio.run(run_evaluation())
