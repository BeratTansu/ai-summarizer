from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import os
import io
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from sqlalchemy.orm import Session
from database import SessionLocal, engine, User, Summary, get_db
import auth

load_dotenv()
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

MAX_FILE_SIZE = 5242880 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SummarizeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    length: str = "medium"
    language: str = "English"

class UserCreate(BaseModel):
    email: str
    password: str

app = FastAPI()

origins = [
    "https://ai-summarizer-chi-six.vercel.app",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_pwd)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User successfully created!"}

@app.post("/login")
def login_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    if not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    access_token = auth.create_access_token(data={"sub": db_user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


def scrape_url(url: str):
    try:
        response = httpx.get(url, timeout=10.0)
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all("p")
        return " ".join([p.text for p in paragraphs])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL parsing error: {str(e)}")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + " "
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction error: {str(e)}")

def summarize_text(text: str, length: str, language: str):
    if (length == "short"):
        max_tokens = 250
    elif (length == "long"):
        max_tokens = 1000
    else:
        max_tokens = 500
    
    api_url = "https://router.huggingface.co/v1/chat/completions"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    
    payload = {
        "model": "Qwen/Qwen2.5-7B-Instruct",
        "messages": [
            {"role": "system", "content": f"You are an expert assistant. Summarize the text provided by the user in {language} language. Return ONLY the summary, no other text."},
            {"role": "user", "content": text}
        ],
        "max_tokens": max_tokens
    }
    
    response = httpx.post(api_url, headers=headers, json=payload, timeout=40.0)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"AI Error: {response.text}")
    
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


@app.get("/")
def home():
    return {"message": "AI Summarizer API is running"}

@app.post("/summarize")
def create_summary(request: SummarizeRequest, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if request.url:
        text_to_summarize = scrape_url(request.url)
    elif request.text:
        if len(request.text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Text is too short! Please enter at least 50 characters.")
        text_to_summarize = request.text
    else:
        raise HTTPException(status_code=400, detail="Text or URL is required.")
    
    is_truncated = False
    if len(text_to_summarize) > 4000:
        text_to_summarize = text_to_summarize[:4000]
        is_truncated = True
    
    result = summarize_text(text_to_summarize, request.length, request.language)
    
    if current_user:
        new_summary = Summary(
            user_id=current_user.id,
            original_text=text_to_summarize[:500] + "...", 
            summary_text=result,
            language=request.language,
            length=request.length
        )
        db.add(new_summary)
        db.commit()
    
    return {"summary": result, "truncated": is_truncated}

@app.post("/summarize-pdf")
async def summarize_pdf(
    file: UploadFile = File(...),
    length: str = Form("medium"),
    language: str = Form("English"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File is too large. Maximum limit is 5MB.")

    try:
        text_from_pdf = extract_text_from_pdf(content)
        
        if not text_from_pdf.strip():
            raise HTTPException(status_code=400, detail="PDF is empty or contains no readable text.")

        is_truncated = False
        if len(text_from_pdf) > 4000:
            text_from_pdf = text_from_pdf[:4000]
            is_truncated = True

        result = summarize_text(text_from_pdf, length, language)
        
        if current_user:
            new_summary = Summary(
                user_id=current_user.id,
                original_text=text_from_pdf[:500] + "...", 
                summary_text=result,
                language=language,
                length=length
            )
            db.add(new_summary)
            db.commit()

        return {"summary": result, "truncated": is_truncated}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/history")
def get_history(
    skip: int = 0, 
    limit: int = 10, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in to view history.")
    
    summaries = db.query(Summary)\
        .filter(Summary.user_id == current_user.id)\
        .order_by(Summary.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
        
    return {"history": summaries}