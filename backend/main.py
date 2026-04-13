from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

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

def summarize_text(text: str, length: str, language: str):
    if (length == "short"):
        max_len = 50
        min_len = 20
    elif (length == "long"):
        max_len = 250
        min_len = 100
    else:
        max_len = 130
        min_len = 50
    
    prompted_text = f"Provide a detailed summary of the following text in {language} language:\n\n{text}"
    api_url = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": prompted_text, "parameters": {"max_length": max_len, "min_length": min_len}}
    response = httpx.post(api_url, headers=headers, json=payload, timeout=30.0)
    data = response.json()

    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=503, detail=f"Hugging Face Hatası: {data['error']}")

    return data[0]["summary_text"]

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
