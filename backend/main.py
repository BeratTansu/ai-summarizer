from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import io
from PyPDF2 import PdfReader

load_dotenv()
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

class SummarizeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    length: str = "medium"
    language: str = "en"

def scrape_url(url: str):
    try:
        response = httpx.get(url, timeout=10.0)
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all("p")
        return " ".join([p.text for p in paragraphs])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or unreachable URL: {str(e)}")

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
        raise HTTPException(status_code=400, detail=f"PDF okuma hatası: {str(e)}")

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
        "model": "Qwen/Qwen2.5-7B-Instruct", # Yeni modelimiz: Çok dilli (Türkçe) yeteneği muazzamdır
        "messages": [
            {"role": "system", "content": f"You are an expert assistant. Summarize the text provided by the user in {language} language. Return ONLY the summary, no other text."},
            {"role": "user", "content": text}
        ],
        "max_tokens": max_tokens
    }
    
    response = httpx.post(api_url, headers=headers, json=payload, timeout=40.0)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"HF Error: {response.text}")
    
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
    return {"message": "Welcome to AI Summarizer API"}

@app.post("/summarize")
def create_summary(request: SummarizeRequest):
    if request.url:
        text_to_summarize = scrape_url(request.url)
    elif request.text:
        text_to_summarize = request.text
    else:
        raise HTTPException(status_code=400, detail="Please provide either text or a url.")
    
    is_truncated = False
    if (len(text_to_summarize) > 4000):
        text_to_summarize = text_to_summarize[:4000]
        is_truncated = True
    
    result = summarize_text(text_to_summarize, request.length, request.language)

    return {"summary": result, "truncated": is_truncated}

@app.post("/summarize-pdf")
async def summarize_pdf(
    file: UploadFile = File(...),
    length: str = Form("medium"),
    language: str = Form("en")
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir PDF dosyası yükleyin.")

    try:
        content = await file.read()
        
        text_from_pdf = extract_text_from_pdf(content)
        
        if not text_from_pdf.strip():
            raise HTTPException(status_code=400, detail="PDF'den metin çıkarılamadı (PDF boş veya sadece resimlerden oluşuyor olabilir).")

        is_truncated = False
        if len(text_from_pdf) > 4000:
            text_from_pdf = text_from_pdf[:4000]
            is_truncated = True

        summary = summarize_text(text_from_pdf, length, language)

        return {"summary": summary, "truncated": is_truncated}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")