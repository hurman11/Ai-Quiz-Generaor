# 🎓 Nexus: Bringing Classrooms to Life with Groq

Imagine a classroom where teachers spend less time writing tests and more time inspiring students. Where every mistake a student makes isn't just a red mark on a paper, but an opportunity for a personalized mini-lesson from an AI tutor. 

Welcome to **Nexus** (an AI Quiz Generator)—a platform designed to bridge the gap between educational material and interactive learning, powered by cutting-edge AI.

## 📖 The Story

We built this project to solve a real-world problem: teachers are overwhelmed with administrative tasks, and students often lack immediate, personalized feedback when they struggle. 

With this platform:
1. **Teachers** simply upload their existing course materials (PDFs, Word documents, or plain text).
2. **Our AI (powered by Groq)** instantly reads the material and crafts a high-quality, relevant multiple-choice quiz.
3. **Students** join a live session, taking the quiz in real-time while the teacher watches the scores roll in.
4. **The Magic:** When a student gets an answer wrong, our integrated **AI Tutor** steps in to explain *why*, ensuring they actually learn the concept rather than just memorizing the right letter.

## 🛠️ How We Built It

We split the project into a robust Python backend and a lightning-fast React frontend, ensuring a seamless real-time experience for an entire classroom.

### The Engine: Python Backend 🐍
At its core, our backend acts as the brain of the operation, coordinating the AI, managing the live game state, and securely storing student data.

*   **FastAPI & Uvicorn**: Chosen for their blazing speed to handle real-time classroom interactions.
*   **Groq**: The star of the show. We use Groq's lightning-fast inference to generate quizzes on the fly and power our empathetic AI Tutor.
*   **PyPDF2 & python-docx**: We built a custom extraction pipeline so teachers can upload their existing `.pdf` and `.docx` files without needing to reformat anything.
*   **PostgreSQL (Neon)**: A reliable, scalable database to keep track of user accounts, quiz histories, and real-time scores. We use `psycopg2-binary` to connect.
*   **Security First**: We use `bcrypt` to hash passwords and `pyjwt` for secure, token-based authentication. `pydantic` ensures all data flowing through the API is clean and valid.

### The Interface: Next.js Frontend ⚛️
Because classrooms are chaotic, the interface needs to be clean, intuitive, and distraction-free.

*   Built with **Next.js** and **TypeScript** for a bug-free, robust experience.
*   Styled beautifully with **Tailwind CSS**.
*   Communicates smoothly with our Python REST API via standard `fetch()` calls, pulling live data for the Teacher's Dashboard (`HostView`) and the Student's Screen (`LiveStudentView`).

## 🔌 How It Connects

The frontend and backend talk to each other through a clean, well-documented REST API defined in `backend/main.py`:

*   **Authentication**: Secure login, registration, and profile fetching (`/auth/register`, `/auth/login`, `/auth/me`).
*   **The Teacher's Flow**: Uploading documents (`/extract-text`), generating the AI quiz (`/generate-quiz`), and launching the live room (`/active-quiz`).
*   **The Student's Flow**: Joining the room (`/active-quiz`), submitting answers in real-time (`/submit-answer`), and getting instant help from the AI Tutor (`/ai-tutor`).

## 🚀 Getting Started

1. **Backend**: Navigate to the `backend` folder, install dependencies from `requirements.txt`, set up your `.env` with your Groq API key and Neon Postgres database URL, and start the FastAPI server.
2. **Frontend**: Navigate to the `frontend` folder, install packages, and start the Next.js development server.

---

*Built with ❤️ by Arthur Leywin to make learning more interactive and teaching a little bit easier.*
