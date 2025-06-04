from langchain_core.tools import tool
from services.vector_store import vector_store_service

@tool
def rag_tool(query: str, competition_id: str = None):
    """Search competition discussions using semantic similarity.
    
    Args:
        query: Search query for finding relevant content
        competition_id: Target competition to filter results (optional)
    
    Returns:
        Formatted results with document content and source URLs
    """
    if competition_id:
        query_results = vector_store_service.search_discussions(query=query, competition_id=competition_id)
    else:
        query_results = vector_store_service.search_by_text(query=query)
    
    # Format results
    if not query_results:
        return "No relevant documents found."
    
    results = []
    for i, doc in enumerate(query_results, 1):
        url = doc.metadata.get("url", "No URL available")
        doc_type = doc.metadata.get("type", "unknown")
        title = doc.metadata.get("title", "No title")
        
        results.append(f"Document {i} [{doc_type.upper()}]: {title}\nContent: {doc.page_content[:300]}...\nSource URL: {url}")
    
    return "\n\n".join(results)

class RAGTool:
    """RAG Tool class for compatibility and easier testing"""
    
    def __init__(self):
        self.vector_store = vector_store_service
    
    def search(self, query: str, competition_id: str = None, k: int = 4):
        """Search for relevant documents using the vector store"""
        if competition_id:
            return self.vector_store.search_discussions(query=query, competition_id=competition_id, k=k)
        else:
            return self.vector_store.search_by_text(query=query, k=k)
    
    def search_competitions(self, query: str, k: int = 4):
        """Search for relevant competitions"""
        return self.vector_store.search_competitions(query=query, k=k)
    
    def search_discussions(self, query: str, competition_id: str = None, k: int = 4):
        """Search for relevant discussions"""
        return self.vector_store.search_discussions(query=query, competition_id=competition_id, k=k)