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
    # --- TOPIC 1: A1C ---
    {
        # Testing: Direct Vector Retrieval
        "question": "What does an A1C test measure and what is it used for?",
        "ground_truth": "An A1C test measures your average blood sugar level over the past 2 to 3 months. It is used to test for and monitor Type 2 diabetes.",
    },
    {
        # Testing: Knowledge Graph (Aliases)
        "question": "Are HbA1C and Glycohemoglobin the same test?",
        "ground_truth": "Yes, HbA1C and Glycohemoglobin are both alternate names for the A1C test.",
    },
    # --- TOPIC 2: Abdominal Pain ---
    {
        # Testing: List / Bullet Point Extraction
        "question": "What are some severe symptoms accompanying abdominal pain that require immediate medical help?",
        "ground_truth": "You should seek immediate medical help if your abdominal pain is sudden and sharp, accompanied by chest, neck, or shoulder pain, if you vomit blood or have blood in your stool, if your abdomen is stiff and hard, or if you cannot move your bowels while vomiting.",
    },
    {
        # Testing: Guardrail / Faithfulness (Hallucination Check)
        "question": "What is the recommended dosage of painkillers for a mild stomach ache?",
        "ground_truth": "I cannot answer this based on the provided healthcare guidelines.",
    },
    # --- TOPIC 3: Abortion ---
    {
        # Testing: Complex Reasoning (Distinguishing concepts)
        "question": "What is the medical difference between an induced abortion and a spontaneous abortion?",
        "ground_truth": "An induced abortion is a medical procedure to end a pregnancy, whereas a spontaneous abortion is the loss of a pregnancy before the 20th week, which is more commonly known as a miscarriage.",
    },
    # --- TOPIC 4: Abscess ---
    {
        # Testing: Direct Vector Retrieval
        "question": "What exactly is an abscess and what is the pus inside it made of?",
        "ground_truth": "An abscess is a pocket of pus that forms when the body's immune system fights an infection. The pus is a mixture of living and dead white blood cells, germs, and dead tissue.",
    },
    # --- TOPIC 5: Acute Bronchitis ---
    {
        # Testing: Detail Extraction
        "question": "How long does the cough associated with acute bronchitis typically last?",
        "ground_truth": "While most cases of acute bronchitis get better within several days, the cough can last for several weeks after the infection is gone.",
    },
    {
        # Testing: Guardrail / Faithfulness
        "question": "What specific antibiotic brand should I take for acute bronchitis caused by a virus?",
        "ground_truth": "I cannot answer this based on the provided healthcare guidelines. However, the guidelines state that antibiotics won't help if the cause of acute bronchitis is viral.",
    },
    # --- TOPIC 6: Acute Flaccid Myelitis (AFM) ---
    {
        # Testing: Complex Reasoning & Alias Test
        "question": "Is Acute Flaccid Myelitis (AFM) caused by the polio virus?",
        "ground_truth": "No. Although AFM is sometimes called a 'polio-like' illness because it causes muscle and reflex weakness, it is not caused by polioviruses. It is often caused by enteroviruses or other viruses like flaviviruses, herpesviruses, and adenoviruses.",
    },
    # --- TOPIC 7: Acute Lymphocytic Leukemia (ALL) ---
    {
        # Testing: Direct Vector Retrieval
        "question": "In Acute Lymphocytic Leukemia (ALL), what specific type of blood cell is overproduced by the bone marrow?",
        "ground_truth": "In Acute Lymphocytic Leukemia, the bone marrow makes too many lymphocytes, which are a type of white blood cell.",
    },
    {
        # Testing: Guardrail / Faithfulness (Hallucination Check)
        "question": "What is the exact survival rate percentage for children diagnosed with Acute Lymphocytic Leukemia?",
        "ground_truth": "I cannot answer this based on the provided healthcare guidelines.",
    },
    {
        # Testing: Risk Factor Extraction
        "question": "What are some factors that raise the risk of developing Acute Lymphocytic Leukemia?",
        "ground_truth": "Risk factors include being male, being white, being over age 70, having had chemotherapy or radiation therapy, being exposed to high levels of radiation, and having certain genetic disorders like Down syndrome.",
    },
]
TEST_USER_ID = "39af4f00-038c-4a5f-a833-39fde31361fe"


async def run_evaluation():
    print("Initializing Hybrid RAG Service...")
    rag_service = HybridRagService()

    llm = ChatGroq(
        api_key=SecretStr(settings.GROQ_API_KEY), model="llama-3.1-8b-instant"
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
