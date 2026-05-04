# Backend Code Explained — `main.py`

A simple, beginner-friendly breakdown of how the QuizGen backend works.

---

## 📦 Imports (Lines 1–7) — Grabbing Tools

```python
import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq
```

Think of these as **toolboxes** you bring into the workshop:

| Import | What it does |
|--------|-------------|
| `os` | Reads environment variables (like your API key) |
| `json` | Converts text ↔ JSON data |
| `FastAPI` | The framework that creates your web server |
| `CORSMiddleware` | Lets the frontend talk to the backend safely |
| `BaseModel, Field` | Validates incoming data (makes sure it's correct) |
| `load_dotenv` | Loads your `.env` file where your API key lives |
| `Groq` | The Groq SDK — your connection to the AI |

---

## ⚙️ Setup (Lines 9–19) — Starting the Engine

```python
load_dotenv()
app = FastAPI(title="QuizGen API", version="2.0.0")
```

- `load_dotenv()` — Reads your `.env` file so `GROQ_API_KEY` becomes available
- `FastAPI(...)` — Creates the app (your server)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    ...
)
```

**CORS** = "Allow my frontend (port 3000) to talk to my backend (port 8000)."
Without this, the browser would **block** the connection for security reasons. Browsers don't let websites talk to random servers unless the server says "yes, I trust this website."

---

## 🔑 AI Connection (Lines 21–24) — Dialing the AI

```python
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
```

- Grabs your API key from `.env`
- Sets which AI model to use (Llama 3.3 70B)
- Creates the Groq client — think of this as your **phone line to the AI**
- If no key exists, the client stays `None` (the phone is disconnected)

---

## 📝 System Prompt (Lines 26–38) — Telling the AI How to Behave

```python
SYSTEM_PROMPT = """You are a quiz generator. Respond ONLY with valid JSON..."""
```

This is the **instruction you give to the AI** before the user's request. It says:
> "You are a quiz generator. Only respond with JSON in this exact format."

This ensures the AI gives back **structured data** (a proper quiz), not random text. Without this, the AI might respond with paragraphs of explanation instead of a clean JSON quiz.

---

## 📋 Data Shapes (Lines 40–54) — Forms to Fill Out

```python
class QuizRequest(BaseModel):
    material: str
    num_questions: int
    difficulty: str

class ResultSubmission(BaseModel):
    student_name: str
    score: int
    total: int
    timestamp: str
```

These are like **paper forms**:
- `QuizRequest` — What the frontend **sends** when generating a quiz (topic, number of questions, difficulty)
- `ResultSubmission` — What students **send** after finishing (name, score, total, time)

If someone sends incomplete or wrong data, it **gets rejected automatically**. For example, if `num_questions` is less than 5 or more than 20, Pydantic says "no."

---

## 🏥 Health Check (Lines 57–59) — "Is the Server Alive?"

```python
@app.get("/health")
async def health_check():
    return {"status": "online", "model": MODEL}
```

A simple endpoint to check if the server is running. Hit `http://localhost:8000/health` and if you get back `{"status": "online", "model": "llama-3.3-70b-versatile"}`, everything is good.

---

## 🧠 Generate Quiz (Lines 62–106) — The Main Brain

```python
@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
```

This is the **heart of the app**. Here's what happens step by step:

1. **Check** — Is the API key set? If not, return an error.
2. **Build message** — Creates something like: *"Generate a medium difficulty quiz with 10 questions on biology"*
3. **Send to AI** — Passes the message to Groq's Llama model
4. **Get response** — The AI sends back a JSON string
5. **Clean up** — Strips markdown fences (` ```json `) if the AI accidentally added them
6. **Parse** — Converts the text into actual JSON data
7. **Return** — Sends the quiz back to the frontend

If anything goes wrong:
- Bad JSON from AI → `422` error ("try again")
- API connection issue → `502` error ("Groq API error")

---

## 📮 Submit Result (Lines 109–117) — Saving Student Scores

```python
@app.post("/submit-result")
async def submit_result(submission: ResultSubmission):
    results.append({...})
    return {"success": True}
```

When a student finishes a quiz, their result gets **saved to a list in memory** (`results = []` at the top of the file).

> ⚠️ **Important:** Since results are stored in memory, they disappear when you restart the server. For a production app, you'd use a database.

---

## 📊 Get Results (Lines 120–122) — Teacher Checks Scores

```python
@app.get("/results")
async def get_results():
    return results
```

The teacher dashboard calls this **every 5 seconds** to fetch all student results and display them in the results table. It simply returns the full list.

---

## 🚀 Start the Server (Lines 125–128) — Ignition

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

This is what runs when you type `python main.py`:
- **Uvicorn** is the server engine that actually handles web requests
- **`host="0.0.0.0"`** means it listens on all network interfaces
- **`port=8000`** means the server runs at `http://localhost:8000`
- **`reload=True`** means it auto-restarts when you edit the code (useful during development)

---

## 🔄 How It All Fits Together

```
Teacher generates quiz → Frontend sends POST to /generate-quiz
                        → Backend asks Groq AI
                        → AI returns JSON quiz
                        → Backend sends quiz to frontend
                        → Quiz stored in browser (localStorage)

Student takes quiz     → Answers stored locally
                        → On finish: POST to /submit-result
                        → Backend saves to memory list

Teacher checks results → Frontend polls GET /results every 5s
                        → Backend returns all saved results
                        → Dashboard shows the table
```

**In one sentence:** The backend is a middleman — it receives requests from the frontend, talks to Groq AI to generate quizzes, and stores/serves student results.
