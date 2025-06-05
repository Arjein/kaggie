// Exact mirror of backend/src/tools/web_search_tool.py
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { globalConfig } from '../../config/globalConfig';
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";



export const webSearchTool = tool(
  async ({ query }: { query: string }) => {
    try {
      // Check if API key is available and valid
      if (!globalConfig.isValidTavilyApiKey()) {
        console.warn('🔍 Web Search: No valid Tavily API key configured');
        return "Web search is not available - Tavily API key not configured or invalid.";
      }
      
      const tavilyApiKey = globalConfig.getTavilyApiKey();

      const retriever = new TavilySearchAPIRetriever({
        k: 3,
        apiKey: tavilyApiKey,
      });
      
      console.log('🔍 Web Search: Searching for:', query);
      const results = await retriever.invoke(query);
      
      if (!results || results.length === 0) {
        return "No relevant web results found.";
      }
      
      const formattedResults = results.map((result: any, i: number) => {
        const content = result.pageContent || 'No content available';
        const url = result.metadata?.source || 'No URL available';
        return `Web Result ${i + 1}: ${content}\nSource: ${url}`;
      });
      console.log("Web Search Retrieval Results: ", formattedResults)
      return formattedResults.join('\n\n');
    } catch (error) {
      console.error('Web search tool error:', error);
      // Return a clean error message without exposing the raw error object
      // which might contain malformed LangChain message data
      return "Web search temporarily unavailable. Please try again later.";
    }
  },
  {
    name: 'web_search_tool',
    description: 'Search the web for when local database is insufficient',
    schema: z.object({
      query: z.string().describe('Search query for finding relevant content on the web'),
    }),
  }
);