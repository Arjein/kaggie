// Exact mirror of backend/src/tools/rag_tool.py
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { globalConfig } from '../../config/globalConfig';
import { embeddingService } from '../../services/embeddingService';
export const ragTool = tool(
  async ({ query, competition_id }: { query: string; competition_id?: string }) => {
    try {
      // Make API call to backend RAG endpoint
      await globalConfig.initialize();
      const backendUrl = globalConfig.getBackendUrl();
      
      console.log('🔍 RAG Tool: Searching for:', query, 'Competition:', competition_id);
      console.log('🔍 RAG Tool: Backend URL:', backendUrl);
      const embedded_query = await embeddingService.embedText(query);
      console.log("Embedded Query", embedded_query)
      const response = await fetch(`${backendUrl}/api/rag-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          embedding: embedded_query, 
          competition_id: competition_id || null,
          k: 4 // Default number of results
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 RAG Tool: Backend error:', response.status, errorText);
        throw new Error(`RAG search failed: ${response.statusText} - ${errorText}`);
      }

      const response_data = await response.json();
      console.log('🔍 RAG Tool: Retrieved response:', response_data);
      console.log('🔍 RAG Tool: Response results count:', response_data.results?.length || 0);
      
      // Extract the results array from the response
      const results = response_data.results || [];
      
      // Handle the backend API response format
      if (!results || results.length === 0) {
        console.log('🔍 RAG Tool: No documents found');
        return "No relevant documents found.";
      }

      // Format results to match expected structure
      // Backend returns: { content, metadata }
      const formattedResults = results.map((doc: any, i: number) => {
        const content = doc.content || '';
        const url = doc.metadata?.url || 'No URL';
        
        return `Document ${i + 1}: ${content}, Source URL: ${url}`;
      });

      const finalResult = formattedResults.join('\n\n');
      console.log('🔍 RAG Tool: Formatted result length:', finalResult.length);
      
      return finalResult;
    } catch (error) {
      console.error('🔍 RAG Tool error:', error);
      return `RAG search error: ${error}`;
    }
  },
  {
    name: 'rag_tool',
    description: 'Search competition discussions using semantic similarity',
    schema: z.object({
      query: z.string().describe('Search query for finding relevant content'),
      competition_id: z.string().optional().describe('Target competition to filter results'),
    }),
  }
);
