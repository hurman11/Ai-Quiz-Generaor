# QuizGen — AI-Powered Quiz Generator for Classrooms

A modern, classroom-friendly quiz generator powered by **Groq AI (Llama 3.3 70B)**. Teachers create quizzes, students take them — with real-time score tracking and a warm, approachable EdTech design.

---

## Prerequisites

- **Node.js** 18+ and **npm** — [https://nodejs.org](https://nodejs.org)
- **Python** 3.11+ — [https://python.org](https://python.org)
- **Groq API Key** — Get one at [https://console.groq.com](https://console.groq.com)

---

## Getting Your Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy the key — you'll need it for the backend `.env` file

---

## Backend Setup

```bash
# Navigate to the backend directory
cd quiz-generator/backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file from the example
copy .env.example .env
# (or on macOS/Linux: cp .env.example .env)

# Edit .env and add your Groq API key
# GROQ_API_KEY=your_actual_key_here

# Start the backend server
python main.py
```

The backend will start on **http://localhost:8000**.

Verify it's running:
```bash
curl http://localhost:8000/health
# Expected: {"status":"online","model":"llama-3.3-70b-versatile"}
```

---

## Frontend Setup

```bash
# Navigate to the frontend directory
cd quiz-generator/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:3000**.

---

## Usage

### As a Teacher:
1. Open **http://localhost:3000** and click **"I'm a Teacher"**
2. Log in with username: `teacher`, password: `admin123`
3. In the dashboard, go to **Generate Quiz** and create a quiz
4. Share the student link: **http://localhost:3000/student**
5. Monitor results in real-time under **Student Results**

### As a Student:
1. Open **http://localhost:3000/student** (or click "I'm a Student" from the homepage)
2. Enter your name and start the quiz
3. Answer each question — see instant feedback with explanations
4. View your final score and encouraging feedback

---

## Tech Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Backend  | Python 3.11+, FastAPI, Uvicorn, Groq SDK      |
| Frontend | Next.js 14, TypeScript, Tailwind CSS          |
| AI       | Groq API (Llama 3.3 70B Versatile)            |
| Styling  | EdTech theme, Framer Motion, Plus Jakarta Sans |

---

## Project Structure

```
quiz-generator/
├── backend/
│   ├── main.py              # FastAPI server with Groq AI integration
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
└── frontend/
    ├── package.json          # Node.js dependencies
    ├── tailwind.config.ts    # Tailwind theme configuration
    ├── tsconfig.json         # TypeScript configuration
    ├── next.config.js        # Next.js configuration
    ├── postcss.config.mjs    # PostCSS configuration
    ├── types/
    │   └── quiz.ts           # TypeScript interfaces
    ├── app/
    │   ├── globals.css       # Global styles & design system
    │   ├── layout.tsx        # Root layout with fonts
    │   ├── page.tsx          # Role selection (Teacher/Student)
    │   ├── teacher/
    │   │   ├── login/
    │   │   │   └── page.tsx  # Teacher login
    │   │   └── dashboard/
    │   │       └── page.tsx  # Teacher dashboard (Generate/Active/Results)
    │   └── student/
    │       └── page.tsx      # Student quiz flow
    └── components/
        ├── QuizForm.tsx       # Topic input & settings
        ├── QuizQuestion.tsx   # Question display & answers
        └── ScoreCard.tsx      # Results & score display
```

---

## API Endpoints

| Method | Endpoint         | Description                     |
|--------|------------------|---------------------------------|
| GET    | /health          | Server status check             |
| POST   | /generate-quiz   | Generate quiz from topic/material |
| POST   | /submit-result   | Submit student quiz result      |
| GET    | /results         | Get all submitted student results |

---

## License

MIT
