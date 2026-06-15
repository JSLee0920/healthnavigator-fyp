# HealthNavigator: AI-Powered Personal Health Assistant Chatbot

HealthNavigator is an advanced, production-grade healthcare AI assistant powered by a Hybrid Retrieval-Augmented Generation (RAG) architecture. It combines the semantic search capabilities of a Vector Database with the deep relational logic of a Graph Database to provide highly accurate, context-aware medical insights.

## Key Features

- **Hybrid RAG Architecture:** Fuses Qdrant (Vector DB) for semantic similarity search with Neo4j (Graph DB) for relational medical entity traversal.
- **Real-Time Streaming Responses:** Answers are streamed token-by-token over Server-Sent Events (SSE) with a fade-in effect for a responsive, ChatGPT-style experience.
- **Local Entity Extraction:** Utilizes a locally hosted GLiNER model for Named Entity Recognition (NER), extracting Symptoms, Body Parts, Medications, and Conditions without relying on costly external APIs.
- **Asynchronous Data Ingestion:** Features a secure admin portal for uploading medical datasets (PDFs, MedlinePlus XMLs) that are chunked, embedded, and graphed in the background without blocking the main event loop.
- **Exercise Tracking:** Lets users log workouts, set weekly activity goals, and monitor progress through streaks, weekly history, and paginated activity logs.
- **High-Performance Backend:** Built on FastAPI with asynchronous SQLAlchemy and PostgreSQL for secure user authentication and session management.
- **Modern Frontend:** A mobile-responsive Next.js web application utilizing Zustand for global state, TanStack Query for server state caching, Context API for isolated compound component states, and Sonner for toast notifications.

## Technology Stack

### Frontend

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS (mobile responsive)
- **State Management:** Zustand (Global/Auth), TanStack Query (Data Fetching), TanStack Form (Forms), React Context API (Component Scoped)
- **UX:** Server-Sent Events streaming, `react-markdown` rendering, Sonner toast notifications

### Backend

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (via Async SQLAlchemy)
- **Security:** JWT Authentication, bcrypt password hashing, HTTP-Only Cookies, Role-Based Access Control (RBAC)

### AI & Data Pipeline

- **LLM:** Llama 3.3 70B Versatile (via Groq API)
- **Vector Database:** Qdrant (Async Client)
- **Graph Database:** Neo4j
- **Embeddings:** HuggingFace (`all-MiniLM-L6-v2`)
- **Data Processing:** LangChain (RecursiveCharacterTextSplitter, PyMuPDF, Document Loaders)
- **NLP/NER:** GLiNER (`gliner_small-v2`, local extraction)
- **Evaluation:** RAGAS for retrieval and answer-quality assessment

## System Architecture

1. **Ingestion:** Admins upload complex medical PDFs or XMLs via the secure Next.js dashboard. FastAPI securely saves the file and offloads processing to a background task.
2. **Processing:** `UniversalDataParser` dynamically routes the file. Text is safely chunked (800 chars) to prevent ML model memory overflow.
3. **Embedding:** Text chunks are embedded using local HuggingFace models and upserted to Qdrant using deterministic UUIDs to prevent duplication.
4. **Graphing:** GLiNER scans chunks for medical entities and creates structured relationships (`[Topic] -[:MENTIONS]-> [Symptom]`) in Neo4j via concurrent async transactions.
5. **Retrieval & Generation:** User queries hit the hybrid search engine, gathering vector-matched text and graph-traversed entities, passing the enriched context to Llama 3.3 70B which streams a final, hallucination-free response to the client.

## Security Measures

- **HTTP-Only Cookies:** JWT tokens are stored securely to prevent XSS attacks.
- **Admin Backdoor:** Role-based access control requires a cryptographic `.env` secret to register ingestion-capable admin accounts.
- **Rate Limiting:** IP-based slowapi limits applied to authentication routes to prevent brute force attacks.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL, Neo4j, and Qdrant instances running
