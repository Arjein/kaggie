// Exact mirror of backend/src/graph/main_agent_graph.py
import { StateGraph, Annotation, MessagesAnnotation} from '@langchain/langgraph/web';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { LLMService } from '../services/llm_service';
import { DatabaseService } from '../services/database';
import { persistentMemorySaver } from '../../utils/persistentMemorySaver';
import { EvalAgentGraph } from './eval_agent_graph';
import {
  setupNode,
  callLLM,
  callEvaluationAgent,
  retrySearchNode,
  summarizeConversationNode,
  routeFromLLM,
  routeFromEvaluation
} from '../agents/main_agent';
import { globalConfig } from '../../config/globalConfig';



// Define the state annotation for AgentState (exact same structure as Python)
const AgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec, // Built-in message handling with RemoveMessage support
  competition_id: Annotation<string | null>(),
  competition_title: Annotation<string | null>(),
  competition_description: Annotation<string | null>(),
  competition_evaluation: Annotation<string | null>(),
  retrieved_docs: Annotation<any[] | null>(),
  current_step: Annotation<string | null>(),
  tool_usage_count: Annotation<number | null>(),
  retrieval_evaluation: Annotation<any | null>(),
  retry_count: Annotation<number | null>(),
  conversation_summary: Annotation<string | null>(),
  message_count: Annotation<number | null>(),
  last_summarized_at: Annotation<number | null>(),
});

export class KaggieAgent {
  
  private graph: any;
  private llmService: LLMService;
  private databaseService: DatabaseService;
  private evalAgentGraph: EvalAgentGraph;
  private static memorySaver = persistentMemorySaver; // Static singleton to persist across invocations

  constructor(apiKey: string, backendUrl: string = globalConfig.getBackendUrl()) {
    this.llmService = new LLMService(apiKey);
    this.databaseService = new DatabaseService(backendUrl);
    this.evalAgentGraph = new EvalAgentGraph(this.llmService);
    
    console.log("eval agent graph:", this.evalAgentGraph ? "initialized" : "failed");
    this.graph = this._buildGraph();
  }

  
  async invoke(
    state: typeof AgentStateAnnotation.State, 
    config?: any
  ): Promise<typeof AgentStateAnnotation.State> {
    console.log('🤖 KaggieAgent.invoke: Starting with input state:', {
      competition_id: state.competition_id,
      messages_count: state.messages?.length || 0,
      current_step: state.current_step,
      input_messages: state.messages?.map((m: any) => `${m.constructor?.name}: ${m.content?.substring(0, 50)}...`) || [],
      whole_state: state,
    });
    console.log('🤖 KaggieAgent.invoke: Config:', config);
    
    // Add debug info about memory saver
    const thread_id = config?.configurable?.thread_id;
    console.log('🧠 KaggieAgent.invoke: Using thread_id for memory:', thread_id);
    console.log('🧠 KaggieAgent.invoke: MemorySaver should restore previous conversation for this thread_id');
    
    // Debug: Check if MemorySaver has any stored data for this thread
    try {
      const checkpointTuple = await KaggieAgent.memorySaver.getTuple(config);
      console.log('🧠 KaggieAgent.invoke: MemorySaver checkpoint for thread:', {
        thread_id,
        hasCheckpoint: !!checkpointTuple,
        checkpointData: checkpointTuple?.checkpoint ? Object.keys(checkpointTuple.checkpoint.channel_values || {}) : 'no checkpoint'
      });
    } catch (error) {
      console.log('🧠 KaggieAgent.invoke: MemorySaver getTuple failed:', error);
    }
    
    const stateUpdated = await this.graph.invoke(state, config);
    
    console.log('🤖 KaggieAgent.invoke: Completed with updated state:', {
      competition_id: stateUpdated.competition_id,
      messages_count: stateUpdated.messages?.length || 0,
      current_step: stateUpdated.current_step,
      last_message: stateUpdated.messages?.[stateUpdated.messages?.length - 1]?.content?.substring(0, 200) + '...',
      last_message_type: stateUpdated.messages?.[stateUpdated.messages?.length - 1]?.constructor?.name,
      all_message_types: stateUpdated.messages?.map((m: any) => m.constructor?.name) || [],
      messages_preview: stateUpdated.messages?.map((m: any, i: number) => `${i}: ${m.constructor?.name} - ${m.content?.substring(0, 50)}...`) || [],
    });
    
    return stateUpdated;
  }


  
  private _buildGraph() {
    // Create ToolNode instance with the tools from LLMService
    const tools = Object.values(this.llmService.getToolsDict());
    const toolNode = new ToolNode(tools);
    
    // Create the main state graph (migrated to use ToolNode)
    const graph = new StateGraph(AgentStateAnnotation)
      // Add nodes with config parameter for browser support
      .addNode("setup_node", async (state: typeof AgentStateAnnotation.State, config?: any) => {
        console.log('📊 Graph wrapper: setup_node INPUT state:', {
          competition_id: state.competition_id,
          has_competition_title: !!state.competition_title,
          has_competition_description: !!state.competition_description,
          current_step: state.current_step
        });
        const result = await setupNode(state, this.databaseService, config);
        console.log('📊 Graph wrapper: setup_node OUTPUT result:', {
          result,
          returnedKeys: Object.keys(result || {}),
          competition_description_returned: !!result?.competition_description,
          competition_title_returned: !!result?.competition_title
        });
        return result;
      })
      .addNode("call_llm", async (state: typeof AgentStateAnnotation.State, config?: any) => {
        console.log('📊 Graph wrapper: call_llm INPUT state:', {
          competition_id: state.competition_id,
          has_competition_title: !!state.competition_title,
          has_competition_description: !!state.competition_description,
          current_step: state.current_step,
          title_length: state.competition_title?.length || 0,
          description_length: state.competition_description?.length || 0
        });
        const result = await callLLM(state, this.llmService, config);
        console.log('📊 Graph wrapper: call_llm OUTPUT result:', {
          returnedKeys: Object.keys(result || {}),
          messagesAdded: result?.messages?.length || 0
        });
        return result;
      })
      .addNode("tools", toolNode)
      .addNode("evaluate_retrieval", async (state: typeof AgentStateAnnotation.State, config?: any) => {
        return await callEvaluationAgent(state, this.llmService, config);
      })
      .addNode("retry_search", async (state: typeof AgentStateAnnotation.State, config?: any) => {
        return await retrySearchNode(state, config);
      })
      .addNode("summarize_conversation", async (state: typeof AgentStateAnnotation.State, config?: any) => {
        return await summarizeConversationNode(state, this.llmService, config);
      })
      // Graph flow (exact same as Python)
      .addEdge("__start__", "setup_node")
      .addEdge("setup_node", "call_llm")
      // Main routing (updated to use tools instead of retriever_agent)
      .addConditionalEdges(
        "call_llm",
        routeFromLLM,
        {
          "tools": "tools",
          "end": "summarize_conversation" // Always check for summarization before ending
        }
      )
      // After tool execution → always go to evaluation
      .addEdge("tools", "evaluate_retrieval")
      // Route based on evaluation decision (exact same as Python)
      .addConditionalEdges(
        "evaluate_retrieval",
        routeFromEvaluation,
        {
          "call_llm": "call_llm",
          "retry_search": "retry_search",
          "end": "summarize_conversation" // Check for summarization
        }
      )
      // Retry loops back to tools
      .addEdge("retry_search", "tools")
      // ✅ FIX: Summarization always goes to END (exact same as Python)
      .addEdge("summarize_conversation", "__end__");

    console.log('🧠 KaggieAgent._buildGraph: Using static MemorySaver instance for persistent memory:', KaggieAgent.memorySaver);
    const compiledGraph = graph.compile({ checkpointer: KaggieAgent.memorySaver });
    return compiledGraph;
  }

  /**
   * Get the memory saver instance
   */
  getMemorySaver() {
    return KaggieAgent.memorySaver;
  }

  /**
   * Get the compiled graph instance
   */
  getGraph() {
    return this.graph;
  }

}
