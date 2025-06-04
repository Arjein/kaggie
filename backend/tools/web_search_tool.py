from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults

@tool
def web_search_tool(query: str):
    """Search the web for Kaggle competition strategies and techniques when local database is insufficient.
    
    Args:
        query: Search query for finding relevant content on the web
    
    Returns:
        Web search results with snippets and URLs
    """
    tavily = TavilySearchResults(
        max_results=3,
        search_depth="advanced",
        include_answer=True,
        include_raw_content=False
    )
    
    # Enhance query for Kaggle-specific results
    enhanced_query = f"Kaggle competition {query} machine learning ensemble techniques"
    
    try:
        results = tavily.invoke(enhanced_query)
        
        if not results:
            return "No relevant web results found."
        
        formatted_results = []
        for i, result in enumerate(results, 1):
            content = result.get('content', 'No content available')
            url = result.get('url', 'No URL available')
            formatted_results.append(f"Web Result {i}: {content}\nSource: {url}")
        
        return "\n\n".join(formatted_results)
    
    except Exception as e:
        return f"Web search failed: {str(e)}"
