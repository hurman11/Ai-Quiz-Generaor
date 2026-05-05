import os
import io
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq
from PyPDF2 import PdfReader
from docx import Document

load_dotenv()

app = FastAPI(title="QuizGen API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

SYSTEM_PROMPT = """You are a quiz generator. Respond ONLY with valid JSON matching this exact schema, no markdown fences, no explanation, nothing else:
{
  "title": string,
  "questions": [
    {
      "id": number,
      "question": string,
      "options": { "A": string, "B": string, "C": string, "D": string },
      "correct": "A" | "B" | "C" | "D",
      "explanation": string
    }
  ]
}"""

# In-memory storage
results: list = []
active_quiz_data: dict | None = None
registered_students: dict = {}

@app.get("/active-quiz")
async def get_active_quiz():
    if not active_quiz_data:
        raise HTTPException(status_code=404, detail="No active quiz available")
    return active_quiz_data

@app.post("/active-quiz")
async def set_active_quiz(quiz: dict):
    global active_quiz_data, registered_students, results
    active_quiz_data = quiz
    registered_students.clear()
    results.clear()
    return {"success": True}

@app.delete("/active-quiz")
async def clear_active_quiz():
    global active_quiz_data, registered_students, results
    active_quiz_data = None
    registered_students.clear()
    results.clear()
    return {"success": True}

class QuizRequest(BaseModel):
    material: str = Field(..., min_length=1, description="Subject name or pasted study text")
    num_questions: int = Field(default=10, ge=5, le=20, description="Number of questions")
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$", description="Difficulty level")

class ResultSubmission(BaseModel):
    student_name: str = Field(..., min_length=1)
    score: int = Field(..., ge=0)
    total: int = Field(..., ge=1)
    timestamp: str = Field(..., min_length=1)

class StudentRegister(BaseModel):
    name: str = Field(..., min_length=1)
    pin: str = Field(..., min_length=4, max_length=4)

@app.post("/student/register")
async def register_student(req: StudentRegister):
    key = f"{req.name}-{req.pin}"
    if key in registered_students:
        if registered_students[key] == "completed":
            raise HTTPException(status_code=403, detail="Access Denied: Quiz already completed")
        # if already registered but not completed, allow resuming
        return {"success": True, "status": "registered"}
    
    registered_students[key] = "registered"
    return {"success": True, "status": "new"}

@app.post("/student/complete")
async def complete_student(req: StudentRegister):
    key = f"{req.name}-{req.pin}"
    registered_students[key] = "completed"
    return {"success": True}

@app.get("/student/check")
async def check_student(name: str, pin: str):
    key = f"{name}-{pin}"
    status = registered_students.get(key)
    if not status:
        raise HTTPException(status_code=404, detail="Not registered")
    if status == "completed":
        raise HTTPException(status_code=403, detail="Access Denied")
    return {"success": True, "status": status}

@app.get("/health")
async def health_check():
    return {"status": "online", "model": MODEL}

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")

    user_message = (
        f"Generate a {request.difficulty} difficulty quiz with {request.num_questions} "
        f"questions on the following topic or material: {request.material}"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
        )

        content = response.choices[0].message.content

        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        quiz = json.loads(content)
        return quiz

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="Failed to parse quiz JSON from AI response. Please try again.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq API error: {str(exc)}",
        )

@app.post("/submit-result")
async def submit_result(submission: ResultSubmission):
    results.append({
        "student_name": submission.student_name,
        "score": submission.score,
        "total": submission.total,
        "timestamp": submission.timestamp,
    })
    return {"success": True}

@app.get("/results")
async def get_results():
    return {"results": results, "registered_count": len(registered_students)}


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Upload a PDF, DOCX, or TXT file and extract its text content."""

    # Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, TXT.",
        )

    # Read file bytes
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum size is 10 MB.",
        )

    try:
        text = ""

        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(contents))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        elif ext in (".docx", ".doc"):
            doc = Document(io.BytesIO(contents))
            for para in doc.paragraphs:
                if para.text.strip():
                    text += para.text + "\n"

        elif ext == ".txt":
            text = contents.decode("utf-8", errors="ignore")

        text = text.strip()
        if not text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from the uploaded file.",
            )

        return {"text": text, "filename": filename, "characters": len(text)}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(exc)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
