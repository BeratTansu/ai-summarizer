from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import os
import io
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

load_dotenv()
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

# 5MB Sınırı (5 * 1024 * 1024 bytes)
MAX_FILE_SIZE = 5242880 

class SummarizeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    length: str = "medium"
    language: str = "English"

def scrape_url(url: str):
    try:
        response = httpx.get(url, timeout=10.0)
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all("p")
        return " ".join([p.text for p in paragraphs])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL okuma hatası: {str(e)}")

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
        raise HTTPException(status_code=400, detail=f"PDF metni çıkarılamadı: {str(e)}")

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
        raise HTTPException(status_code=response.status_code, detail=f"AI Hatası: {response.text}")
    
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()

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

@app.get("/")
def home():
    return {"message": "AI Summarizer API is running"}

@app.post("/summarize")
def create_summary(request: SummarizeRequest):
    if request.url:
        text_to_summarize = scrape_url(request.url)
    elif request.text:
        text_to_summarize = request.text
    else:
        raise HTTPException(status_code=400, detail="Metin veya URL gereklidir.")
    
    is_truncated = False
    if len(text_to_summarize) > 4000:
        text_to_summarize = text_to_summarize[:4000]
        is_truncated = True
    
    result = summarize_text(text_to_summarize, request.length, request.language)
    return {"summary": result, "truncated": is_truncated}

@app.post("/summarize-pdf")
async def summarize_pdf(
    file: UploadFile = File(...),
    length: str = Form("medium"),
    language: str = Form("English")
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları yüklenebilir.")

    # 1. DOSYA BOYUTU KONTROLÜ (Backend Güvenliği)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Dosya çok büyük. Maksimum limit 5MB.")

    try:
        text_from_pdf = extract_text_from_pdf(content)
        
        if not text_from_pdf.strip():
            raise HTTPException(status_code=400, detail="PDF boş veya okunabilir metin içermiyor.")

        is_truncated = False
        if len(text_from_pdf) > 4000:
            text_from_pdf = text_from_pdf[:4000]
            is_truncated = True

        summary = summarize_text(text_from_pdf, length, language)
        return {"summary": summary, "truncated": is_truncated}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))