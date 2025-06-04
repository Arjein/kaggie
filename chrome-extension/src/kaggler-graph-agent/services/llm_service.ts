// Exact mirror of backend/src/services/llm_service.py
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { type RunnableConfig } from '@langchain/core/runnables';
import { ragTool } from '../tools/rag_tool';
import { webSearchTool } from '../tools/web_search_tool';
import { globalConfig } from '../../config/globalConfig';

export class LLMService {
  private llm: ChatOpenAI;
  private llmWithTools: any; // Typed as any due to LangChain binding complexity
  private summaryLLM: ChatOpenAI;
  private evalLLM: any; // Typed as any due to structured output complexity
  private tools: StructuredTool[];

  constructor(apiKey: string) {
    // Base LLM with slightly higher temperature for more varied responses
    this.llm = new ChatOpenAI({
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.3,
    });

    // Conditionally build tools array based on Tavily API key availability
    this.tools = [ragTool];
    
    // Only include web search tool if Tavily API key is configured
    const tavilyApiKey = globalConfig.getTavilyApiKey();
    if (tavilyApiKey && tavilyApiKey.trim() !== '') {
      console.log('LLMService: Tavily API key found, enabling web search tool');
      this.tools.push(webSearchTool);
    } else {
      console.log('LLMService: No Tavily API key configured, web search tool disabled');
    }
    
    // LLM with tools bound (exact same as Python)
    this.llmWithTools = this.llm.bindTools(this.tools);
    
    // Separate LLM for summarization (exact same as Python)
    this.summaryLLM = new ChatOpenAI({
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.1,
    });

    this.evalLLM = new ChatOpenAI({
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.1,
    }).withStructuredOutput({
      schema: {
        type: "object",
        properties: {
          quality: {
            type: "string",
            enum: ["EXCELLENT", "GOOD", "PARTIAL", "INSUFFICIENT", "IRRELEVANT"]
          },
          relevance_score: { type: "integer", minimum: 1, maximum: 10 },
          completeness_score: { type: "integer", minimum: 1, maximum: 10 },
          next_action: {
            type: "string", 
            enum: ["GENERATE_ANSWER", "RETRY_SEARCH", "END_INSUFFICIENT"]
          },
          reasoning: { type: "string" },
          suggested_query: { type: "string" }
        },
        required: ["quality", "relevance_score", "completeness_score", "next_action", "reasoning"]
      }
    });
  }

  // Exact same methods as Python LLMService, but with config parameter for browser support
   async invokeWithTools(messages: BaseMessage[], config?: RunnableConfig): Promise<AIMessage> {
    const response = await this.llmWithTools.invoke(messages, config); // ← Pass config here
    return response as AIMessage;
  }

  async invokeSummary(messages: BaseMessage[], config?: RunnableConfig): Promise<AIMessage> {
    const response = await this.summaryLLM.invoke(messages, config); // ← Pass config here
    return response as AIMessage;
  }

  async invokeWithStructuredOutput(messages: BaseMessage[], config?: RunnableConfig): Promise<any> {
    const response = await this.evalLLM.invoke(messages, config); // ← Pass config here
    return response;
  }

  getToolsDict() {
    const toolsDict: Record<string, StructuredTool> = {};
    this.tools.forEach(tool => {
      toolsDict[tool.name] = tool;
    });
    return toolsDict;
  }


  getLLM() {
    return this.llm;
  }
}
