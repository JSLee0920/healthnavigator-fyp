# HealthNavigator: AI-Powered Personal Health Assistant Chatbot

HealthNavigator is an advanced, production-grade healthcare AI assistant powered by a Hybrid Retrieval-Augmented Generation (RAG) architecture. It combines the semantic search capabilities of a Vector Database with the deep relational logic of a Graph Database to provide highly accurate, context-aware medical insights.

## Key Features

- **Hybrid RAG Architecture:** Fuses Qdrant (Vector DB) for semantic similarity search with Neo4j (Graph DB) for relational medical entity traversal.
- **Local Entity Extraction:** Utilizes a locally hosted GLiNER model for Named Entity Recognition (NER), extracting Symptoms, Body Parts, Medications, and Conditions without relying on costly external APIs.
- **Asynchronous Data Ingestion:** Features a secure admin portal for uploading medical datasets (PDFs, MedlinePlus XMLs) that are chunked, embedded, and graphed in the background without blocking the main event loop.
- **High-Performance Backend:** Built on FastAPI with asynchronous SQLAlchemy and PostgreSQL for secure user authentication and session management.
- **Modern Frontend:** A responsive Next.js web application utilizing Zustand for global state, TanStack Query for server state caching, and Context API for isolated compound component states.

## Technology Stack

### Frontend

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **State Management:** Zustand (Global/Auth), TanStack Query (Data Fetching), React Context API (Component Scoped)

### Backend

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (via Async SQLAlchemy)
- **Security:** JWT Authentication, bcrypt password hashing, HTTP-Only Cookies, Role-Based Access Control (RBAC)

### AI & Data Pipeline

- **LLM:** Llama 3.3 70B (via Groq API)
- **Vector Database:** Qdrant (Async Client)
- **Graph Database:** Neo4j
- **Embeddings:** HuggingFace (`all-MiniLM-L6-v2`)
- **Data Processing:** LangChain (RecursiveCharacterTextSplitter, PyMuPDF, Document Loaders)
- **NLP/NER:** GLiNER (Local extraction)

## System Architecture

1. **Ingestion:** Admins upload complex medical PDFs or XMLs via the secure Next.js dashboard. FastAPI securely saves the file and offloads processing to a background task.
2. **Processing:** `UniversalDataParser` dynamically routes the file. Text is safely chunked (800 chars) to prevent ML model memory overflow.
3. **Embedding:** Text chunks are embedded using local HuggingFace models and upserted to Qdrant using deterministic UUIDs to prevent duplication.
4. **Graphing:** GLiNER scans chunks for medical entities and creates structured relationships (`[Topic] -[:MENTIONS]-> [Symptom]`) in Neo4j via concurrent async transactions.
5. **Retrieval & Generation:** User queries hit the hybrid search engine, gathering vector-matched text and graph-traversed entities, passing the enriched context to Llama 3.1 for a final, hallucination-free response.

## Security Measures

- **HTTP-Only Cookies:** JWT tokens are stored securely to prevent XSS attacks.
- **Admin Backdoor:** Role-based access control requires a cryptographic `.env` secret to register ingestion-capable admin accounts.
- **Rate Limiting:** IP-based slowapi limits applied to authentication routes to prevent brute force attacks.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL, Neo4j, and Qdrant instances running
