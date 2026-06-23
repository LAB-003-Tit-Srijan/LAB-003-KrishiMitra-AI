# NeuroLearn AI

NotebookLLM-style adaptive learning: **YouTube/PDF/transcript ingestion**, **RAG tutor**, **timestamp-aware chat**, **analytics**, **study rooms**, **SRS flashcards**, and **Gemini multimodal** Q&A.

---

## How to run (local)

### Prerequisites

- **Node.js 20+** and **npm**
- **MongoDB** (Atlas URI works)
- API keys: **OpenAI**, **Pinecone**, **Google Gemini** (`GEMINI_API_KEY`)

### 1. Backend

```bash
cd LAB-003-KrishiMitra-AI-main/backend
npm install
```

Create `backend/.env` (minimum):

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Short-lived JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `OPENAI_API_KEY` | Embeddings (`text-embedding-3-small` by default) |
| `PINECONE_API_KEY` | Vector DB |
| `PINECONE_INDEX` | Index name (dimensions must match embeddings — default model **1536** unless you set `OPENAI_EMBEDDING_DIMENSIONS`) |
| `GEMINI_API_KEY` | Tutor, classifier, summaries, streaming, vision |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:3000`) |
| `PORT` | Optional; default **8080** |

Optional:

| Variable | Purpose |
|----------|---------|
| `OPENAI_EMBEDDING_MODEL` | Default `text-embedding-3-small` |
| `OPENAI_EMBEDDING_DIMENSIONS` | Must match Pinecone index if using reduced dimensions |
| `PINECONE_NAMESPACE` | Default `neurolearn` |
| `REDIS_URL` | Optional caching |
| `CLOUDINARY_*` | Video upload to Cloudinary |

Start:

```bash
npm run dev
```

Health check: `GET http://localhost:8080/health`  
API base: `http://localhost:8080/api`

### 2. Frontend

```bash
cd LAB-003-KrishiMitra-AI-main/frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

Start:

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Unique features (what this repo adds)

| Feature | What it does |
|---------|----------------|
| **YouTube ingestion** | Captions + timestamps → chunks → MongoDB + Pinecone (`POST /api/lectures/youtube`). |
| **Educational policy** | Gemini classifies content; rejects non-educational material for **youtube**, **PDF/transcript/docx** uploads and manual JSON lectures (`lecture.controller.ts`). |
| **Timestamp tutor** | Questions like `12:40` merge nearest transcript chunks + vector RAG (`rag.service.ts`, `utils/timestamp.ts`). |
| **Streaming tutor** | Real Gemini SSE stream over Socket.IO (`chat.controller.ts`, `gemini.service.ts`). |
| **Structured summary / quiz / roadmap** | Dedicated endpoints under `/api/learning/*` and `/api/quiz/*`. |
| **Adaptive quiz** | Weak topics from `TopicConfidence` bias MCQs (`POST /api/quiz/generate-adaptive`). |
| **Mind map (Mermaid)** | `POST /api/learning/mindmap` → diagram text for Mermaid renderers. |
| **Translation** | `POST /api/learning/translate` (optional lecture grounding). |
| **Interview questions** | `POST /api/learning/interview-questions`. |
| **Live class assistant** | Short bullets from context (`POST /api/learning/live-assistant`). |
| **Image + lecture Q&A** | Multimodal Gemini (`POST /api/learning/image-qa`) with base64 image + optional `lectureId`. |
| **Voice pipeline** | Browser captures speech → send text to `POST /api/chat/from-voice-transcript` (same RAG as `/chat/ask`). |
| **XP / streak / minutes** | Chat, quiz, and watch heartbeat (`study-stats.ts`, User model). |
| **Watch time** | Learn page sends heartbeat seconds (`POST /api/study/watch-time`) → `watchSecondsTotal`. |
| **SRS flashcards** | SM-2-style intervals (`GET /api/srs/due`, `POST /api/srs/review`). |
| **Collaborative study room** | Socket events `join-study-room`, `study-room:message` — UI at **`/study-room`**. |

---

## Main files (map)

| Area | Files |
|------|--------|
| Server entry | `backend/src/index.ts` (Express + Socket.IO: lectures, users, **study rooms**) |
| Routes | `backend/src/routes/index.ts` |
| Lectures / YouTube / PDF gate | `backend/src/controllers/lecture.controller.ts`, `backend/src/services/youtube.service.ts` |
| RAG / embeddings | `backend/src/services/rag.service.ts`, `backend/src/config/env.ts` |
| Gemini (tutor, stream, vision, extras) | `backend/src/services/gemini.service.ts` |
| Chat + voice wrapper | `backend/src/controllers/chat.controller.ts` |
| Learning (summary, quiz, flashcards, …) | `backend/src/controllers/features/learning.controller.ts` |
| Extended (mind map, translate, adaptive quiz, …) | `backend/src/controllers/features/extended-features.controller.ts` |
| Watch time | `backend/src/controllers/study-session.controller.ts` |
| SRS | `backend/src/controllers/srs.controller.ts` |
| Analytics | `backend/src/controllers/analytics.controller.ts` |
| Models | `backend/src/models/User.ts`, `backend/src/models/Lecture.ts`, `backend/src/models/LearningModels.ts` |
| Frontend Learn (player + tutor + heartbeat) | `frontend/src/app/player/page.tsx`, `frontend/src/components/player/smart-player.tsx` |
| Study room | `frontend/src/app/study-room/page.tsx` |
| Auth session | `frontend/src/components/session-bootstrap.tsx`, `frontend/src/lib/api.ts` |

---

## API reference (authenticated unless noted)

**Auth (public):** `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` · **GET `/auth/me`**

**Lectures:** `GET/POST /lectures`, `GET /lectures/:id`, `POST /lectures/upload`, `POST /lectures/youtube`

**Tutor:** `POST /chat/ask`, `POST /chat/ask-stream` (body: `socketId` for streaming), `POST /chat/from-voice-transcript`

**Study:** `POST /study/watch-time` — body `{ "seconds": number }` (1–7200)

**Learning:**  
`POST /learning/summary` · `POST /learning/recommendations` · `POST /learning/mindmap` · `POST /learning/translate` · `POST /learning/interview-questions` · `POST /learning/live-assistant` · `POST /learning/image-qa` (JSON: `imageBase64`, `mimeType`, `question`, optional `lectureId`)

**Quiz:** `POST /quiz/generate` · `POST /quiz/generate-adaptive` (body: `lectureId`, optional `difficulty`, `adaptive`) · `POST /quiz/submit`

**Flashcards / SRS:** `POST /flashcards/generate` · `GET /srs/due?lectureId=` · `POST /srs/review` — body `{ flashcardId, grade: "again"|"hard"|"good"|"easy" }`

**Other:** `GET /timeline`, `POST /revision/generate`, `GET /analytics`, notifications CRUD

---

## Socket.IO events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-user` | client → server | Join room `user:<userId>` for dashboard notifications |
| `join-lecture` | client → server | Join `lecture:<id>` |
| `join-study-room` | client → server | Payload `{ roomId, displayName? }` |
| `leave-study-room` | client → server | Payload `{ roomId }` |
| `study-room:message` | client → server | Payload `{ roomId, text }`; broadcast to room |
| `study-room:presence` | server → client | Someone joined |
| `tutor:chunk` | server → client | Streaming tutor tokens + `references` when `done` |
| `analytics:update` | server → client | Quiz/chat/watch stats |
| `notification:new` | server → client | New notification |

---

## RAG pipeline (short)

1. Transcript chunks stored in MongoDB with **start/end seconds**.  
2. **OpenAI embeddings** → **Pinecone** with lecture filter.  
3. Question → optional **timestamp parse** → merged references → **Gemini** grounded answer.

---

## Deployment notes

- **Frontend:** Vercel (set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` to production API WebSocket origin).  
- **Backend:** Render/Fly/etc.; expose same port for HTTP + Socket.IO.  
- **Pinecone:** Index dimension must match embedding output (default **1536** for `text-embedding-3-small`).

---

## Product UI routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/dashboard` | Overview |
| `/workspace` | Upload + YouTube import + mini tutor |
| `/player` | **Learn:** video, transcript, AI sidebar, summary/quiz/plan, watch heartbeat |
| `/study-room` | Collaborative chat (Socket.IO) |
| `/ai-chat` | Full-page streaming tutor |
| `/revision-hub` | Revision tools |
| `/analytics` | XP, streak, minutes, watch hours, radar chart |

---

## Troubleshooting

- **`Educational classification requires GEMINI_API_KEY`:** Set `GEMINI_API_KEY` for gated uploads.  
- **Pinecone dimension mismatch:** Align `OPENAI_EMBEDDING_DIMENSIONS` with index or recreate index for model dimensions.  
- **Streaming errors:** Gemini SSE format can vary; check API quotas and model name in `gemini.service.ts`.
