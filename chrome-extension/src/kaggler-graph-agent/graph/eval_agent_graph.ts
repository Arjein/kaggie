// Exact mirror of backend/src/graph/eval_agent_graph.py
import { StateGraph, Annotation } from '@langchain/langgraph/web';
import { evaluationAgent } from '../agents/eval_agent';
import { LLMService } from '../services/llm_service';
import type { RunnableConfig } from '@langchain/core/runnables';

// Define the state annotation for EvalAgentState (exact same structure as Python)
const EvalStateAnnotation = Annotation.Root({
  original_query: Annotation<string>(), // ✅ FIXED: Removed | null (Python has str, not Optional[str])
  retrieved_content: Annotation<string>(), // ✅ FIXED: Removed | null
  competition_context: Annotation<string>(), // ✅ FIXED: Removed | null
  evaluation_result: Annotation<any | null>(), // ✅ Keep nullable (Python has Optional[RetrievalEvaluation])
});

export class EvalAgentGraph {
  private graph: any;
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.graph = this._buildGraph();
  }

  async invoke(state: typeof EvalStateAnnotation.State, config?: RunnableConfig): Promise<typeof EvalStateAnnotation.State> {
    const stateUpdated = await this.graph.invoke(state, config);
    return stateUpdated;
  }

  private _buildGraph() {
    // Create evaluation graph (exact same structure as Python)
    const evalGraph = new StateGraph(EvalStateAnnotation)
      .addNode("evaluate", async (state: typeof EvalStateAnnotation.State, config?: RunnableConfig) => {
        return await evaluationAgent(state, this.llmService, config);
      })
      .addEdge("__start__", "evaluate")
      .addEdge("evaluate", "__end__");
    
    const evalCompiled = evalGraph.compile();
    return evalCompiled;
  }
}
