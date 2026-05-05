import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import psycopg2
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext
import jwt

# ML/Processing imports
import PyPDF2
from docx import Document
from groq import Groq

load_dotenv()

app = FastAPI(title="AI Quiz Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATABASE SETUP (NEON POSTGRES) ───
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Falling back to in-memory mode if DB calls fail.")

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.autocommit = True
    return conn

def init_db():
    if not DATABASE_URL:
        return
    with get_db() as conn:
        with conn.cursor() as cur:
            # Users table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL
                )
            """)
            # Active Quiz table (only one row ever exists)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS active_quiz (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    data JSONB NOT NULL,
                    quiz_uuid VARCHAR(255) NOT NULL
                )
            """)
            # Results table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS results (
                    id SERIAL PRIMARY KEY,
                    quiz_uuid VARCHAR(255) NOT NULL,
                    user_id INTEGER REFERENCES users(id),
                    student_name VARCHAR(255) NOT NULL,
                    score INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    UNIQUE(quiz_uuid, user_id)
                )
            """)
            
try:
    init_db()
except Exception as e:
    print(f"Failed to init DB: {e}")

# ─── AUTHENTICATION (JWT & BCRYPT) ───
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-cyber-key-123")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return int(user_id)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ─── AUTH ENDPOINTS ───
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/auth/register")
async def register(user: UserRegister):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (user.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            hashed_pw = get_password_hash(user.password)
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name",
                (user.name, user.email, hashed_pw)
            )
            new_user = cur.fetchone()
            token = create_access_token({"sub": str(new_user["id"])})
            return {"token": token, "user": {"id": new_user["id"], "name": new_user["name"], "email": user.email}}

@app.post("/auth/login")
async def login(user: UserLogin):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (user.email,))
            db_user = cur.fetchone()
            if not db_user or not verify_password(user.password, db_user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            token = create_access_token({"sub": str(db_user["id"])})
            return {"token": token, "user": {"id": db_user["id"], "name": db_user["name"], "email": db_user["email"]}}

@app.get("/auth/me")
async def get_me(user_id: int = Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return user

# ─── QUIZ MANAGEMENT ENDPOINTS ───
@app.get("/active-quiz")
async def get_active_quiz():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT data, quiz_uuid FROM active_quiz WHERE id = 1")
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No active quiz available")
            quiz_data = row["data"]
            quiz_data["quiz_uuid"] = row["quiz_uuid"]
            return quiz_data

@app.post("/active-quiz")
async def set_active_quiz(quiz: dict):
    new_uuid = str(uuid.uuid4())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO active_quiz (id, data, quiz_uuid) 
                VALUES (1, %s, %s) 
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, quiz_uuid = EXCLUDED.quiz_uuid
                """,
                (json.dumps(quiz), new_uuid)
            )
            # Delete old results so the teacher dashboard starts fresh
            cur.execute("DELETE FROM results")
    return {"success": True, "quiz_uuid": new_uuid}

@app.delete("/active-quiz")
async def clear_active_quiz():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM active_quiz WHERE id = 1")
            cur.execute("DELETE FROM results")
    return {"success": True}

# ─── STUDENT CHECK & SUBMISSION ───
@app.get("/student/check")
async def check_student(user_id: int = Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT quiz_uuid FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if not active_row:
                raise HTTPException(status_code=404, detail="No active quiz available")
            
            quiz_uuid = active_row["quiz_uuid"]
            
            # Check if this user has a result for this quiz
            cur.execute("SELECT id FROM results WHERE user_id = %s AND quiz_uuid = %s", (user_id, quiz_uuid))
            if cur.fetchone():
                return {"status": "completed"}
            return {"status": "new"}

class SubmitResult(BaseModel):
    score: int
    total: int

@app.post("/submit-result")
async def submit_result(result: SubmitResult, user_id: int = Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Get active quiz
            cur.execute("SELECT quiz_uuid FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if not active_row:
                raise HTTPException(status_code=404, detail="No active quiz available")
            quiz_uuid = active_row["quiz_uuid"]
            
            # Get user info
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
                
            try:
                cur.execute(
                    """
                    INSERT INTO results (quiz_uuid, user_id, student_name, score, total, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (quiz_uuid, user_id, user["name"], result.score, result.total, datetime.utcnow())
                )
            except psycopg2.errors.UniqueViolation:
                # Already submitted
                raise HTTPException(status_code=403, detail="Already completed this quiz")
                
    return {"success": True}

# ─── TEACHER RESULTS ENDPOINTS ───
@app.get("/results")
async def get_results():
    with get_db() as conn:
        with conn.cursor() as cur:
            # We only return results for the CURRENT active quiz
            cur.execute("SELECT quiz_uuid FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if not active_row:
                return {"results": [], "registered_count": 0}
            
            quiz_uuid = active_row["quiz_uuid"]
            
            # Get all results for this quiz
            cur.execute("SELECT student_name, score, total, timestamp FROM results WHERE quiz_uuid = %s ORDER BY timestamp DESC", (quiz_uuid,))
            results = cur.fetchall()
            
            # Total users registered in the system
            cur.execute("SELECT COUNT(*) as count FROM users")
            user_count = cur.fetchone()["count"]
            
            return {
                "results": [dict(r) for r in results],
                "registered_count": user_count
            }

@app.delete("/results")
async def clear_results():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM results")
    return {"success": True}


# ─── GENERATION LOGIC (UNCHANGED) ───
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
def get_extension(filename: str):
    return os.path.splitext(filename)[1].lower()

def extract_text_from_file(file_content: bytes, filename: str) -> str:
    ext = get_extension(filename)
    if ext == ".txt":
        return file_content.decode("utf-8", errors="ignore")
    elif ext == ".pdf":
        import io
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    elif ext in {".docx", ".doc"}:
        import io
        doc = Document(io.BytesIO(file_content))
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

def build_prompt(context: str, question_count: int, difficulty: str, format_type: str) -> str:
    return f"""
You are an expert educational AI. 
Generate a quiz based ONLY on the provided context.
Number of questions: {question_count}
Difficulty level: {difficulty}
Question format: {format_type} (If True/False, only provide 'True' and 'False' as options).

IMPORTANT: Output valid JSON exactly matching this structure. Do not wrap in markdown or backticks.
{{
  "title": "A short, descriptive title for the quiz based on the context",
  "questions": [
    {{
      "id": 1,
      "question": "The question text",
      "options": {{
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      }},
      "correct": "A",
      "explanation": "Why this is correct."
    }}
  ]
}}

Context material:
\"\"\"{context}\"\"\"
"""

def generate_via_groq(prompt: str) -> str:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise Exception("GROQ_API_KEY not configured")
    client = Groq(api_key=groq_api_key)
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

class QuizRequest(BaseModel):
    topic: str
    question_count: int
    difficulty: str
    format: str

@app.post("/generate-quiz/topic")
async def generate_quiz_topic(request: QuizRequest):
    prompt = build_prompt(
        context=f"The topic is: {request.topic}",
        question_count=request.question_count,
        difficulty=request.difficulty,
        format_type=request.format
    )
    try:
        result_text = generate_via_groq(prompt)
        return json.loads(result_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-quiz/file")
async def generate_quiz_file(
    file: UploadFile = File(...),
    question_count: int = 5,
    difficulty: str = "medium",
    format: str = "multiple-choice"
):
    try:
        content = await file.read()
        context_text = extract_text_from_file(content, file.filename)
        # truncate if too long (Groq token limit approx 8k context)
        context_text = context_text[:25000] 
        
        prompt = build_prompt(
            context=context_text,
            question_count=question_count,
            difficulty=difficulty,
            format_type=format
        )
        
        result_text = generate_via_groq(prompt)
        return json.loads(result_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
