// Exact mirror of backend/src/models/state.py
import { BaseMessage } from '@langchain/core/messages';
import type { RetrievalEvaluation } from '../models/schemas';

export interface AgentState {
  competition_id: string | null;
  competition_title: string | null;
  competition_description: string | null;
  competition_evaluation: string | null;
  retrieved_docs: any[] | null;
  messages: BaseMessage[];
  current_step: string | null;
  tool_usage_count: number | null;
  retrieval_evaluation: RetrievalEvaluation | null;
  retry_count: number | null;
  conversation_summary: string | null;
  message_count: number | null;
  last_summarized_at: number | null;
}

export interface EvalAgentState {
  original_query: string;
  retrieved_content: string;
  competition_context: string;
  evaluation_result: RetrievalEvaluation | null;
}
