import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional
import random

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
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

from psycopg2.pool import SimpleConnectionPool

# ─── DATABASE SETUP (NEON POSTGRES) ───
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Falling back to in-memory mode if DB calls fail.")

# Connection Pool
db_pool = None

def init_db_pool():
    global db_pool
    if DATABASE_URL:
        try:
            db_pool = SimpleConnectionPool(
                1, 20, # min, max connections
                dsn=DATABASE_URL,
                cursor_factory=RealDictCursor
            )
            print("Database connection pool initialized.")
        except Exception as e:
            print(f"Failed to init DB pool: {e}")

@app.on_event("startup")
def startup_event():
    init_db_pool()
    try:
        init_db()
    except Exception as e:
        print(f"Failed to init DB: {e}")

def get_db():
    if not db_pool:
        # Fallback for local dev if pool failed
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = True
        return conn
    
    conn = db_pool.getconn()
    conn.autocommit = True
    return conn

def release_db(conn):
    if db_pool:
        db_pool.putconn(conn)

# Helper to use in 'with' statement
from contextlib import contextmanager
@contextmanager
def db_session():
    conn = get_db()
    try:
        yield conn
    finally:
        release_db(conn)

def init_db():
    if not DATABASE_URL:
        return
    with db_session() as conn:
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
                    time_taken INTEGER DEFAULT 0,
                    question_details JSONB,
                    UNIQUE(quiz_uuid, user_id)
                )
            """)
            
            # Alter existing results table if it lacks the new columns (for backward compatibility)
            try:
                cur.execute("ALTER TABLE results ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0")
                cur.execute("ALTER TABLE results ADD COLUMN IF NOT EXISTS question_details JSONB")
            except Exception:
                pass
# ─── AUTHENTICATION (JWT & BCRYPT) ───
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-cyber-key-123")
ALGORITHM = "HS256"

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

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
def register(user: UserRegister):
    try:
        with db_session() as conn:
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server Crash: {str(e)} - Type: {type(e)}")

@app.post("/auth/login")
def login(user: UserLogin):
    try:
        with db_session() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (user.email,))
                db_user = cur.fetchone()
                if not db_user or not verify_password(user.password, db_user["password_hash"]):
                    raise HTTPException(status_code=401, detail="Invalid email or password")
                
                token = create_access_token({"sub": str(db_user["id"])})
                return {"token": token, "user": {"id": db_user["id"], "name": db_user["name"], "email": db_user["email"]}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server Crash: {str(e)} - Type: {type(e)}")

@app.get("/auth/me")
def get_me(user_id: int = Depends(get_current_user)):
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return user

# ─── QUIZ CACHE (DEFENSIVE LAYER) ───
QUIZ_CACHE = {
    "data": None,
    "quiz_uuid": None,
    "last_updated": None,
    "last_refresh": None
}

def refresh_quiz_cache():
    """Internal helper to sync cache with DB - Rate limited to once every 10s if empty"""
    now = datetime.utcnow()
    
    # If we refreshed very recently (within 10s), don't hit the DB again
    if QUIZ_CACHE["last_refresh"] and (now - QUIZ_CACHE["last_refresh"]).total_seconds() < 10:
        return

    print(f"Refreshing Quiz Cache from DB at {now}...")
    try:
        with db_session() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT data, quiz_uuid FROM active_quiz WHERE id = 1")
                row = cur.fetchone()
                QUIZ_CACHE["last_refresh"] = now
                if row:
                    QUIZ_CACHE["data"] = row["data"]
                    QUIZ_CACHE["quiz_uuid"] = row["quiz_uuid"]
                    QUIZ_CACHE["last_updated"] = now
                else:
                    QUIZ_CACHE["data"] = None
                    QUIZ_CACHE["quiz_uuid"] = None
    except Exception as e:
        print(f"Cache Refresh Error: {e}")
        # Don't reset last_refresh so we don't immediately retry on error
        QUIZ_CACHE["last_refresh"] = now 

# ─── QUIZ MANAGEMENT ENDPOINTS ───
@app.get("/active-quiz")
def get_active_quiz(code: Optional[str] = None):
    # Refresh cache if missing or stale
    if QUIZ_CACHE["data"] is None:
        refresh_quiz_cache()
    
    if QUIZ_CACHE["data"] is None:
        raise HTTPException(status_code=404, detail="No active quiz available")
    
    # Ensure data is consistent
    quiz_data = QUIZ_CACHE["data"].copy()
    
    if code is None:
        return {"active": True, "requires_code": True}
        
    if quiz_data.get("quiz_code") and str(quiz_data.get("quiz_code")) != str(code):
        raise HTTPException(status_code=403, detail="Invalid quiz code")
        
    quiz_data["quiz_uuid"] = QUIZ_CACHE["quiz_uuid"]
    return quiz_data

@app.post("/active-quiz")
def set_active_quiz(quiz: dict):
    new_uuid = quiz.get("quiz_uuid", str(uuid.uuid4()))
    quiz_code = quiz.get("quiz_code", str(random.randint(100000, 999999)))
    
    quiz["quiz_uuid"] = new_uuid
    quiz["quiz_code"] = quiz_code
    
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO active_quiz (id, data, quiz_uuid) 
                VALUES (1, %s, %s) 
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, quiz_uuid = EXCLUDED.quiz_uuid
                """,
                (json.dumps(quiz), new_uuid)
            )
    
    # Update cache immediately
    QUIZ_CACHE["data"] = quiz
    QUIZ_CACHE["quiz_uuid"] = new_uuid
    QUIZ_CACHE["last_updated"] = datetime.utcnow()
    
    return {"success": True, "quiz_uuid": new_uuid, "quiz_code": quiz_code}

@app.delete("/active-quiz")
def clear_active_quiz():
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM active_quiz WHERE id = 1")
    
    # Clear cache immediately
    QUIZ_CACHE["data"] = None
    QUIZ_CACHE["quiz_uuid"] = None
    QUIZ_CACHE["last_updated"] = datetime.utcnow()
    
    return {"success": True}

# ─── STUDENT CHECK & SUBMISSION ───
@app.get("/student/check")
def check_student(user_id: int = Depends(get_current_user)):
    with db_session() as conn:
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

@app.get("/student/history")
def get_student_history(user_id: int = Depends(get_current_user)):
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT quiz_uuid, score, total, timestamp FROM results WHERE user_id = %s ORDER BY timestamp DESC", 
                (user_id,)
            )
            results = cur.fetchall()
            return {"history": [dict(r) for r in results]}

class SubmitResult(BaseModel):
    score: int
    total: int
    time_taken: int = 0
    question_details: dict = {}

class SubmitAnswer(BaseModel):
    question_index: int
    answer: str

@app.post("/submit-answer")
def submit_answer(ans: SubmitAnswer, user_id: int = Depends(get_current_user)):
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT quiz_uuid, data FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if not active_row:
                raise HTTPException(status_code=404, detail="No active quiz")
            quiz_uuid = active_row["quiz_uuid"]
            
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
                
            cur.execute("SELECT question_details FROM results WHERE user_id = %s AND quiz_uuid = %s", (user_id, quiz_uuid))
            res_row = cur.fetchone()
            
            if not res_row:
                details = {str(ans.question_index): ans.answer}
                total_q = len(active_row["data"].get("questions", []))
                cur.execute(
                    """
                    INSERT INTO results (quiz_uuid, user_id, student_name, score, total, timestamp, time_taken, question_details)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (quiz_uuid, user_id, user["name"], 0, total_q, datetime.utcnow(), 0, json.dumps(details))
                )
            else:
                details = res_row["question_details"] or {}
                if isinstance(details, str): 
                    try:
                        details = json.loads(details)
                    except:
                        details = {}
                details[str(ans.question_index)] = ans.answer
                cur.execute(
                    "UPDATE results SET question_details = %s WHERE user_id = %s AND quiz_uuid = %s", 
                    (json.dumps(details), user_id, quiz_uuid)
                )
    return {"success": True}


@app.post("/submit-result")
def submit_result(result: SubmitResult, user_id: int = Depends(get_current_user)):
    with db_session() as conn:
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
                
            cur.execute(
                """
                INSERT INTO results (quiz_uuid, user_id, student_name, score, total, timestamp, time_taken, question_details)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (quiz_uuid, user_id) DO UPDATE SET
                    score = EXCLUDED.score,
                    total = EXCLUDED.total,
                    timestamp = EXCLUDED.timestamp,
                    time_taken = EXCLUDED.time_taken,
                    question_details = EXCLUDED.question_details
                """,
                (quiz_uuid, user_id, user["name"], result.score, result.total, datetime.utcnow(), result.time_taken, json.dumps(result.question_details))
            )
                
    return {"success": True}

# ─── TEACHER RESULTS ENDPOINTS ───
@app.get("/results")
def get_results():
    with db_session() as conn:
        with conn.cursor() as cur:
            # We only return results for the CURRENT active quiz
            cur.execute("SELECT quiz_uuid FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if not active_row:
                return {"results": [], "registered_count": 0}
            
            quiz_uuid = active_row["quiz_uuid"]
            
            # Get all results for this quiz
            cur.execute("SELECT student_name, score, total, timestamp, time_taken, question_details FROM results WHERE quiz_uuid = %s ORDER BY timestamp DESC", (quiz_uuid,))
            results = cur.fetchall()
            
            # Total users registered in the system
            cur.execute("SELECT COUNT(*) as count FROM users")
            user_count = cur.fetchone()["count"]
            
            return {
                "results": [dict(r) for r in results],
                "registered_count": user_count
            }

@app.delete("/results")
def clear_results():
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT quiz_uuid FROM active_quiz WHERE id = 1")
            active_row = cur.fetchone()
            if active_row:
                cur.execute("DELETE FROM results WHERE quiz_uuid = %s", (active_row["quiz_uuid"],))
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
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

class QuizRequest(BaseModel):
    material: str
    num_questions: int
    difficulty: str

@app.post("/extract-text")
def extract_text(file: UploadFile = File(...)):
    try:
        content = file.file.read()
        context_text = extract_text_from_file(content, file.filename)
        return {"text": context_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-quiz")
def generate_quiz(request: QuizRequest):
    # truncate if too long (Groq token limit approx 8k context)
    safe_material = request.material[:25000]
    prompt = build_prompt(
        context=safe_material,
        question_count=request.num_questions,
        difficulty=request.difficulty,
        format_type="multiple-choice"
    )
    try:
        result_text = generate_via_groq(prompt)
        return json.loads(result_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── AI TUTOR ENDPOINT ───
class TutorRequest(BaseModel):
    wrong_questions: list  # [{question, options, correct, user_answer}]

@app.post("/ai-tutor")
def ai_tutor(request: TutorRequest):
    if not request.wrong_questions:
        return {"explanation": "You got everything right! Great job! 🎉"}
    
    questions_text = ""
    for i, q in enumerate(request.wrong_questions, 1):
        correct_letter = q.get("correct", "?")
        user_letter = q.get("user_answer", "No answer")
        options = q.get("options", {})
        correct_text = options.get(correct_letter, "Unknown")
        user_text = options.get(user_letter, "No answer given")
        questions_text += f"""
Question {i}: {q.get('question', '')}
- Student answered: {user_letter} ({user_text})
- Correct answer: {correct_letter} ({correct_text})
"""
    
    tutor_prompt = f"""You are a friendly, encouraging AI tutor helping a student understand their mistakes on a quiz.
The student got the following questions wrong. For EACH question:
1. Explain WHY their answer was incorrect (briefly, 1-2 sentences)
2. Explain WHY the correct answer is right (clearly, 2-3 sentences)
3. Give a quick memory tip or analogy to help them remember

Be warm, supportive, and use simple language. Use emojis occasionally to keep it fun.
Keep your total response under 600 words.

Questions the student got wrong:
{questions_text}
"""
    
    try:
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            raise Exception("GROQ_API_KEY not configured")
        client = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": tutor_prompt}],
            temperature=0.7,
        )
        explanation = response.choices[0].message.content
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
