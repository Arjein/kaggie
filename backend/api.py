from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage
from services.vector_store import vector_store_service
from services.database import db_service
import os

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded environment variables from .env file")
except ImportError:
    print("💡 python-dotenv not installed - using system environment variables only")
except Exception as e:
    print(f"⚠️ Could not load .env file: {e}")

app = FastAPI(title="Kaggler API", version="1.0.0")
print("CREDS PATH: ", os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
# CORS middleware - Security: Restrict origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Chrome extension origins (for development and production)
        "chrome-extension://*",
        # Production frontend (add your domain)
        # "https://your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Restrict to necessary methods
    allow_headers=["*"],
)

# Request models
class RagSearchRequest(BaseModel):
    embedding: list[float]
    competition_id: str
    k: int = 4

class ChatRequest(BaseModel):
    query: str
    thread_id: str
    competition_id: Optional[str] = None

class ConversationHistoryRequest(BaseModel):
    thread_id: str
    limit: int = 50

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/api/rag-search")
async def rag_search(request: RagSearchRequest):
    """Perform RAG search for relevant competition discussions"""
    try:
        results = vector_store_service.search_by_embedding(
            embedding=request.embedding,
            competition_id=request.competition_id,
            k=request.k
        )
        # Format results for the response
        formatted_results = []
        for doc in results:
            formatted_results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
        
        return {"results": formatted_results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/active-competitions")
async def get_competitions():
    """Get all active competitions"""
    try:
        competitions = db_service.get_active_competitions()
        return {"competitions": competitions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/competition/{competition_id}")
async def get_competition(competition_id: str):
    """Get specific competition details"""
    try:
        competition = db_service.get_competition(competition_id)
        return {"competition": competition}
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {
        "status": "healthy",
        "service": "kaggler-backend",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Kaggler API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)