// Exact mirror of backend/src/models/schemas.py
export interface RetrievalEvaluation {
  /** Overall quality of retrieved information */
  quality: "EXCELLENT" | "GOOD" | "PARTIAL" | "INSUFFICIENT" | "IRRELEVANT";
  /** Relevance score 1-10 */
  relevance_score: number;
  /** Completeness score 1-10 */
  completeness_score: number;
  /** Recommended next action */
  next_action: "GENERATE_ANSWER" | "RETRY_SEARCH" | "END_INSUFFICIENT";
  /** Brief explanation of evaluation */
  reasoning: string;
  /** Improved query if retry needed */
  suggested_query?: string;
}
