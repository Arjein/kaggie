# Kaggie Graph Agent - TypeScript Mirror

This is an **EXACT** TypeScript/JavaScript implementation of the Python Kaggie Agent from `/backend/src`. Every component, function, and logic flow has been precisely replicated to maintain identical behavior.

## Architecture Mirror

### 🏗️ Exact Structure Mapping

| Python Backend | TypeScript Mirror | Purpose |
|----------------|-------------------|---------|
| `backend/src/models/state.py` | `models/state.ts` | Agent state definitions |
| `backend/src/models/schemas.py` | `models/schemas.ts` | Pydantic models → TypeScript interfaces |
| `backend/src/utils/prompts.py` | `utils/prompts.ts` | System prompts (identical text) |
| `backend/src/services/llm_service.py` | `services/llm_service.ts` | LLM service with tools binding |
| `backend/src/services/database.py` | `services/database.ts` | Database operations |
| `backend/src/tools/rag_tool.py` | `tools/rag_tool.ts` | RAG search tool |
| `backend/src/tools/web_search_tool.py` | `tools/web_search_tool.ts` | Web search tool |
| `backend/src/agents/main_agent.py` | `agents/main_agent.ts` | All node functions |
| `backend/src/agents/eval_agent.py` | `agents/eval_agent.ts` | Evaluation agent |
| `backend/src/graph/eval_agent_graph.py` | `graph/eval_agent_graph.ts` | Evaluation graph |
| `backend/src/graph/main_agent_graph.py` | `graph/main_agent_graph.ts` | Main orchestrator |
| `backend/src/test.py` | `test.ts` | Testing functionality |
| `backend/src/main.py` | `test.ts` | Interactive agent runner |

### 🔄 Identical Graph Flow

```
START → setup_node → call_llm → [conditional routing]
                        ↓
                   retriever_agent → evaluate_retrieval
                        ↓                    ↓
                   [conditional routing based on evaluation]
                        ↓
              retry_search OR call_llm OR summarize_conversation → END
```

### 🧠 Exact Node Functions

1. **setup_node**: Fetches competition metadata from database
2. **call_llm**: Invokes LLM with tools, handles conversation summarization
3. **retriever_agent**: Executes tool calls (RAG/web search)
4. **evaluate_retrieval**: Calls evaluation agent to assess retrieval quality
5. **retry_search**: Generates refined search queries based on evaluation
6. **summarize_conversation**: Intelligently summarizes long conversations

### 🛠️ Identical Tools

- **rag_tool**: Searches competition discussions using semantic similarity
- **web_search_tool**: Searches web for Kaggle strategies when local database insufficient

### 📊 Exact Evaluation Logic

- **Relevance Score**: 1-10 rating of content relevance
- **Completeness Score**: 1-10 rating of answer completeness
- **Quality Assessment**: EXCELLENT|GOOD|PARTIAL|INSUFFICIENT|IRRELEVANT
- **Next Action**: GENERATE_ANSWER|RETRY_SEARCH|END_INSUFFICIENT
- **Retry Logic**: Max 2 retries, switches to web search as fallback

## Usage

```typescript
import { KaggieAgent } from './kaggie-graph-agent';
import { HumanMessage } from '@langchain/core/messages';

// Initialize agent (exact same as Python)
const agent = new KaggieAgent(
  process.env.OPENAI_API_KEY,
  'https://kaggie-backend.onrender.com'
);

// Create state (exact same structure as Python)
const state = {
  competition_id: 'titanic',
  messages: [new HumanMessage({ content: "What are the best ensemble techniques?" })],
  retry_count: 0,
  message_count: 0
};

// Invoke agent (exact same as Python)
const config = { configurable: { thread_id: "user_session" } };
const result = await agent.invoke(state, config);
```

## Key Features

✅ **Identical State Management**: Same fields, same logic  
✅ **Exact Tool Execution**: Same search patterns and result formatting  
✅ **Same Evaluation Criteria**: Identical scoring and retry logic  
✅ **Identical Conversation Handling**: Same summarization strategy  
✅ **Same Graph Structure**: Identical nodes, edges, and routing  
✅ **Same Prompts**: Exact system prompt text  
✅ **Same Error Handling**: Identical retry limits and fallback logic  

## Differences from Python

The only differences are platform-specific:

1. **Persistence**: Uses MemorySaver instead of PostgreSQL/SQLite (browser limitation)
2. **API Calls**: Tools make HTTP calls to backend instead of direct function calls
3. **Type System**: TypeScript interfaces instead of Pydantic models
4. **Dependencies**: `@langchain/langgraph` instead of `langgraph` Python package

## Testing

```typescript
import { testKaggieAgent, runningAgent } from './test';

// Run single test
await testKaggieAgent();

// Run interactive session with predefined queries
await runningAgent('playground-series-s5e5');
```

This implementation ensures **100% functional equivalence** with the Python backend while being optimized for browser/Node.js environments.
