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

1. **Ingestion:** Admins upload complex medical PDFs or XMLs via the secure Next.js dashboard. FastAPI securely saves the file and offloads processing to a background task. MedlinePlus health-topic XML datasets can be downloaded from the official source: <https://medlineplus.gov/xml.html>.
2. **Processing:** `UniversalDataParser` dynamically routes the file. Text is safely chunked (800 chars) to prevent ML model memory overflow.
3. **Embedding:** Text chunks are embedded using local HuggingFace models and upserted to Qdrant using deterministic UUIDs to prevent duplication.
4. **Graphing:** GLiNER scans chunks for medical entities and creates structured relationships (`[Topic] -[:MENTIONS]-> [Symptom]`) in Neo4j via concurrent async transactions.
5. **Retrieval & Generation:** User queries hit the hybrid search engine, gathering vector-matched text and graph-traversed entities, passing the enriched context to Llama 3.3 70B which streams a final, hallucination-free response to the client.

## Security Measures

- **HTTP-Only Cookies:** JWT tokens are stored securely to prevent XSS attacks.
- **Admin Backdoor:** Role-based access control requires a cryptographic `.env` secret to register ingestion-capable admin accounts.
- **Rate Limiting:** IP-based slowapi limits applied to authentication routes to prevent brute force attacks.

## Getting Started

The project is a monorepo with two apps:

- `backend/` — FastAPI service (Python, managed with [uv](https://docs.astral.sh/uv/))
- `frontend/` — Next.js web app (managed with [pnpm](https://pnpm.io/))

### Prerequisites

- **Node.js 18+** and **pnpm** (`npm install -g pnpm`)
- **Python 3.13** and **uv** (`pip install uv`, or see the [uv install docs](https://docs.astral.sh/uv/getting-started/installation/))
- Running instances of **PostgreSQL**, **Neo4j**, and **Qdrant**
- A **Groq API key** (for the Llama 3.3 70B LLM) and a **Hugging Face token** (for downloading models)

The quickest way to get the three databases running locally is Docker:

```bash
# PostgreSQL (note: the default DATABASE_URL uses port 5433)
docker run -d --name healthnav-postgres -p 5433:5432 \
  -e POSTGRES_PASSWORD=your-postgres-password -e POSTGRES_DB=healthnav postgres:16

# Neo4j (browser at http://localhost:7474, bolt on 7687)
docker run -d --name healthnav-neo4j -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-neo4j-password neo4j:5

# Qdrant (REST on 6333)
docker run -d --name healthnav-qdrant -p 6333:6333 qdrant/qdrant
```

### 1. Backend setup

```bash
cd backend

# Install dependencies into a virtual environment from uv.lock
uv sync

# Create your environment file and fill in the values
cp .env.example .env
```

Edit `backend/.env` and set at least the following (see `.env.example` for all options):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL async connection string (default points at port `5433`) |
| `QDRANT_URL` | Qdrant REST URL, e.g. `http://localhost:6333` |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | Neo4j bolt connection |
| `GROQ_API_KEY` | Groq API key for Llama models |
| `HF_TOKEN` | Hugging Face token for downloading models |
| `SECRET_KEY` | JWT signing secret — generate with `openssl rand -hex 32` |
| `ADMIN_CREATION_SECRET` | Shared secret required to register an admin account |
| `FRONTEND_ORIGINS` | Comma-separated allowed CORS origins (default `http://localhost:3000`) |

Apply the database migrations, then start the API:

```bash
# Create the PostgreSQL schema
uv run alembic upgrade head

# Run the dev server (http://localhost:8000, docs at /docs)
uv run fastapi dev app/main.py
```

To register an admin account (required for the data-ingestion portal), send a `POST /auth/register-admin`
request including the `ADMIN_CREATION_SECRET` value you set in `.env`.

### 2. Frontend setup

```bash
cd frontend

# Install dependencies (this project uses pnpm)
pnpm install

# Create your local env file and point it at the backend
cp .env.local.example .env.local   # sets NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the dev server (http://localhost:3000)
pnpm dev
```

### 3. Verify

- Backend health check: <http://localhost:8000/health> should return `{"status": "online"}`
- API docs: <http://localhost:8000/docs>
- App: <http://localhost:3000>

### Production builds

```bash
# Frontend
cd frontend && pnpm build && pnpm start

# Backend (example, without the dev auto-reload)
cd backend && uv run fastapi run app/main.py
```
