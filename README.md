# Summarize.ai — AI-Powered Text Summarizer

**[Live Demo](https://ai-summarizer-chi-six.vercel.app)** | **[API Docs](https://ai-summarizer-iwtj.onrender.com/docs)**

A full-stack web application that summarizes long texts, web articles, and PDF documents using artificial intelligence. Features user authentication, summary history, and multi-language support. Built with **FastAPI** and **React**.

> **Note:** The backend is hosted on Render's free tier, so the first request may take ~50 seconds while the server wakes up.

![screenshot](frontend/src/assets/hero.png)

## Features

- **Text Summarization** — Paste any long text and get a concise AI-generated summary
- **URL Scraping** — Enter a URL and the app automatically extracts and summarizes the article content
- **PDF Upload** — Upload PDF files (up to 5MB) and get them summarized instantly
- **Multi-Language** — Summarize in English, Turkish, German, or French
- **Adjustable Length** — Choose between short (~20-50 words), medium (~50-150 words), and detailed (~150-300 words) outputs
- **User Authentication** — Register and log in with JWT-based authentication
- **Summary History** — View your past summaries with date, language, and length info
- **Smart Truncation** — Handles large texts gracefully with automatic truncation and user notification
- **Input Validation** — Minimum character limit, file size checks, and proper error messages
- **Copy to Clipboard** — One-click copy for the generated summary
- **Responsive Design** — Dark theme UI that works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Tailwind CSS, Vite |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI Model** | Hugging Face Inference API (`Qwen/Qwen2.5-7B-Instruct`) |
| **Database** | SQLite, SQLAlchemy ORM |
| **Authentication** | JWT (python-jose), bcrypt (passlib) |
| **PDF Processing** | PyPDF2 |
| **Web Scraping** | BeautifulSoup4, httpx |
| **Containerization** | Docker |
| **Backend Hosting** | Render (Docker) |
| **Frontend Hosting** | Vercel |

## Architecture

```
Client (React on Vercel)
    ├── POST /register → Create account
    ├── POST /login → Get JWT token
    ├── POST /summarize → Summarize text/URL (saves to DB if logged in)
    ├── POST /summarize-pdf → Summarize PDF (saves to DB if logged in)
    └── GET /history → View past summaries (requires auth)
                ↓
FastAPI Backend (Render)
    ├── Auth layer (JWT + bcrypt)
    ├── SQLite database (users + summaries)
    ├── Web scraper (BeautifulSoup4)
    ├── PDF extractor (PyPDF2)
    └── AI summarizer (Hugging Face API)
```

## API Endpoints

### `GET /`
Health check endpoint.

### `POST /register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

### `POST /login`
Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

### `POST /summarize`
Summarize text or a web article. Works for both guests and authenticated users. Authenticated users get their summaries saved.

**Request Body:**
```json
{
  "text": "Your long text here...",
  "url": null,
  "length": "medium",
  "language": "English"
}
```

**Response:**
```json
{
  "summary": "AI-generated summary text.",
  "truncated": false
}
```

### `POST /summarize-pdf`
Upload and summarize a PDF file (max 5MB). Uses multipart form data.

### `GET /history`
Get the authenticated user's summary history with pagination.

**Query Parameters:** `skip` (default: 0), `limit` (default: 10)

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Hugging Face account (free) — [huggingface.co](https://huggingface.co)

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```
HUGGINGFACE_API_KEY=your_hf_token_here
JWT_SECRET_KEY=your_secret_key_here
```

Start the server:

```bash
python -m uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Visit `http://127.0.0.1:8000/docs` for interactive API documentation.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Docker Setup

```bash
cd backend
docker build -t ai-summarizer-backend .
docker run -p 8000:8000 ai-summarizer-backend
```

## Project Structure

```
ai-summarizer/
├── backend/
│   ├── main.py            # FastAPI application & endpoints
│   ├── database.py        # SQLAlchemy models & DB setup
│   ├── auth.py            # JWT authentication logic
│   ├── Dockerfile         # Docker configuration
│   ├── .dockerignore
│   ├── .env               # API keys (not committed)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── index.css      # Tailwind imports
│   │   └── main.jsx       # React entry point
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Author

**Berat Tansu Çabuk** — Software Engineering Student

- GitHub: [@BeratTansu](https://github.com/BeratTansu)
- LinkedIn: [Berat Tansu Çabuk](https://www.linkedin.com/in/berat-tansu-çabuk-02b55b244/)
- Portfolio: [berattansu.dev](https://berattansu.dev)

## License

This project is open source and available under the [MIT License](LICENSE).