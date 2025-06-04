// Exact mirror of backend/src/agents/eval_agent.py
import { HumanMessage } from '@langchain/core/messages';
import { type RunnableConfig } from '@langchain/core/runnables';
import { LLMService } from '../services/llm_service';
import type { EvalAgentState } from '../models/state';

export async function evaluationAgent(
  state: EvalAgentState, 
  llmService: LLMService,
  config?: RunnableConfig
): Promise<any> {
  /**
   * Dedicated agent for evaluating retrieval quality
   * Exact mirror of Python evaluation_agent function
   */
  
  const evalPrompt = `
You are an elite performance evaluator for competitive Kaggle strategies.

ORIGINAL QUESTION: ${state.original_query}
COMPETITION CONTEXT: ${state.competition_context}
RETRIEVED CONTENT: ${state.retrieved_content?.substring(0, 1500)}...

Evaluate if the retrieved content provides COMPETITIVE ADVANTAGE for answering the ORIGINAL QUESTION.

EVALUATION CRITERIA FOR COMPETITIVE PERFORMANCE:

**MANDATORY REQUIREMENTS FOR KAGGLE QUESTIONS:**
- Content MUST contain specific, actionable techniques used by competition winners
- Content MUST go beyond generic ML advice to provide competitive advantage
- Content MUST include performance-focused strategies that separate winners from participants

Primary Evaluation (Match to User Intent):
- If the user asks about general topics, evaluate if the content answers THAT question
- If the user asks about Kaggle/ML topics, DEMAND competition-winning relevance
- Always evaluate against what the user ACTUALLY asked, not what you think they should ask
- REJECT content that provides only generic advice without competitive edge

Performance-Focused Assessment:
- **Competitive Edge**: Does this content provide techniques that separate winners from participants?
- **Actionable Strategy**: Can the user immediately implement these insights for score improvements?
- **Proven Results**: Are these techniques validated by top performers or competition winners?
- **Innovation Potential**: Does the content suggest novel approaches or creative combinations?

Quality Standards for Winning Solutions:
- **Technical Depth**: Sufficient detail for implementation and optimization
- **Performance Impact**: Clear potential for measurable score improvements
- **Source Credibility**: Information from proven Kaggle experts, grandmasters, or winning solutions
- **Completeness**: Addresses the full scope of the user's strategic needs

For Kaggle-specific questions, DEMAND content that provides:
- Advanced techniques used by competition winners
- Creative feature engineering and model ensembling approaches
- Performance optimization strategies that deliver competitive advantage
- Specific insights about competition nuances and winning approaches
- Innovative methods that push beyond standard solutions

SCORING PHILOSOPHY:
- Relevance (1-10): How well does this serve the user's specific question with winning potential?
- Completeness (1-10): Does this provide enough depth for competitive implementation?
- Quality: EXCELLENT = Game-changing insights from proven winners | GOOD = Solid competitive advantage with specific techniques | PARTIAL = Some useful competitive elements | INSUFFICIENT = Generic advice without competitive edge | IRRELEVANT = Off-topic

**CRITICAL**: For Kaggle/competition questions, score INSUFFICIENT for any content that doesn't provide specific competitive advantages beyond standard ML practices.

Focus on content that moves users from good performance to leaderboard domination.
`;

  const evaluation = await llmService.invokeWithStructuredOutput([
    new HumanMessage({ content: evalPrompt })
  ], config);

  return {
    evaluation_result: evaluation
  };
}