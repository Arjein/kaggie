// Exact mirror of backend/src/agents/main_agent.py
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  HumanMessage, 
  AIMessage, 
  BaseMessage, 
  ToolMessage, 
  SystemMessage,
  RemoveMessage,
  trimMessages
} from '@langchain/core/messages';
import { type RunnableConfig } from '@langchain/core/runnables';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_SUMMARY } from '../utils/prompts';
import { LLMService } from '../services/llm_service';
import { DatabaseService } from '../services/database';
import { evaluationAgent } from './eval_agent';
import type { AgentState } from '../models/state';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate and clean messages to ensure they have proper LangChain types
 * This prevents "Unrecognized message type" errors when using trimMessages
 */


// Use LangChain's built-in message validation
function validateMessages(messages: any[]): BaseMessage[] {
  return messages.filter((msg): msg is BaseMessage => 
    msg instanceof BaseMessage && msg.content !== undefined
  );
}

async function trimMessagesNative(messages: BaseMessage[], llm: any): Promise<BaseMessage[]> {
  return await trimMessages(messages, {
    maxTokens: 8000, // Adjust based on your model
    tokenCounter: llm, // Use LLM's built-in token counter
    strategy: "last",
    includeSystem: true,
    allowPartial: false, // Preserves message integrity
  });
}


// Exact mirror of setup_node

export async function setupNode(
  state: AgentState, 
  databaseService: DatabaseService,
  _config?: RunnableConfig,
): Promise<any> {
  // Suppress unused parameter warning
  void _config;
  
  console.log('🏗️ setupNode: Starting with state:', {
    competition_id: state.competition_id,
    messages_count: state.messages?.length || 0,
    has_competition_data: !!(state.competition_title && state.competition_description),
    current_messages: state.messages?.map((m: any) => `${m.constructor?.name}: ${m.content?.substring(0, 50)}...`) || [],
  });
  
  const competitionDescription = state.competition_description || '';
  const competitionEvaluation = state.competition_evaluation || '';
  const competitionTitle = state.competition_title || '';

  // Fetch from Database (exact same logic as Python)
  if (!competitionDescription || !competitionEvaluation || !competitionTitle) {
    console.log("🔍 setupNode: Competition data missing, fetching from database...");
    console.log("🔍 setupNode: Current state values:", {
      competitionDescription: competitionDescription?.substring(0, 50) + '...',
      competitionEvaluation: competitionEvaluation?.substring(0, 50) + '...',
      competitionTitle: competitionTitle?.substring(0, 50) + '...'
    });
    
    const docDict = await databaseService.getCompetition(state.competition_id!);
    console.log("🔍 setupNode: Raw database response:", Object.keys(docDict || {}));
    
    // Access nested competition data - the actual data is under docDict.competition
    const competitionData = docDict.competition || docDict;
    
    console.log(`🔍 setupNode: Extracted competition data:`, {
      title: competitionData.title?.substring(0, 100) + '...',
      description: competitionData.description?.substring(0, 100) + '...',
      evaluation: competitionData.evaluation?.substring(0, 100) + '...',
      hasTitle: !!competitionData.title,
      hasDescription: !!competitionData.description,
      hasEvaluation: !!competitionData.evaluation,
    });
    
    const returnData = {
      competition_description: competitionData.description,
      competition_title: competitionData.title,
      competition_evaluation: competitionData.evaluation,
      current_step: "setup_complete"
    };
    
    console.log("🏗️ setupNode: Returning state update:", {
      returnData,
      willUpdateFields: Object.keys(returnData),
      competition_description_length: returnData.competition_description?.length || 0,
      competition_title_length: returnData.competition_title?.length || 0,
      competition_evaluation_length: returnData.competition_evaluation?.length || 0,
    });
    
    // Test that the data is actually valid before returning
    if (!returnData.competition_description || !returnData.competition_title) {
      console.error("🚨 setupNode: CRITICAL - Competition data is still missing after database fetch!");
      console.error("🚨 setupNode: competitionData object:", competitionData);
      console.error("🚨 setupNode: docDict object:", docDict);
    }
    
    return returnData;
  }

  console.log("🏗️ setupNode: Competition data already available, no fetch needed");
  return { current_step: "already_setup" };
}

// Exact mirror of should_summarize_conversation
// Exact mirror of should_summarize_conversation
export function shouldSummarizeConversation(state: any): boolean {
  const messages = state.messages || [];
  
  // Count only Human and AI conversation messages (not tool messages)
  // Filter out AI messages that have tool_calls
  const conversationMessages = messages.filter((msg: any) => {
    if (msg instanceof HumanMessage) {
      return true;
    }
    if (msg instanceof AIMessage) {
      // Exclude AI messages that have tool_calls
      return !(msg.tool_calls && msg.tool_calls.length > 0);
    }
    return false;
  });
  
  // ✅ Summarize when we have more than 10 conversation messages (5+ H-A pairs)
  return conversationMessages.length > 10;
}

// Exact mirror of format_messages_for_summary
export function formatMessagesForSummary(messages: BaseMessage[]): string {
  /**
   * Format messages for summarization
   * Exact same logic as Python version
   */
  const formatted: string[] = [];
  
  for (const msg of messages) {
    if (msg instanceof HumanMessage) {
      formatted.push(`User: ${msg.content}`);
    } else if (msg instanceof AIMessage && !(msg.tool_calls && msg.tool_calls.length > 0)) {
      // Only include AI messages that don't have tool_calls
      formatted.push(`Assistant: ${msg.content}`);
    }
    // Skip tool messages and AI messages with tool_calls for summary
  }
  
  return formatted.join('\n\n');
}


// Exact mirror of summarize_conversation_node
export async function summarizeConversationNode(
  state: any,
  llmService: LLMService,
  config?: RunnableConfig
): Promise<any> {
  /**
   * Summarize conversation and keep only last 3 conversation messages + DELETE ALL TOOL MESSAGES
   */
  
  if (!shouldSummarizeConversation(state)) {
    return { current_step: "no_summary_needed" };
  }
  
  const messages = state.messages || [];
  const existingSummary = state.conversation_summary || '';
  
  // Filter conversation messages for summarization
  const conversationMessages = messages.filter((msg: any) => 
    (msg instanceof HumanMessage || msg instanceof AIMessage) &&
    !(msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0)
  );
  
  if (conversationMessages.length <= 3) {
    return { current_step: "insufficient_for_summary" };
  }
  
  // ✅ Split: Last 3 conversation messages to keep, everything else to summarize
  const messagesToSummarize = conversationMessages.slice(0, -3);  // All but last 3 (7+ messages)
  const last3Conversation = conversationMessages.slice(-3);       // Keep last 3
  
  // Create summary prompt
  let summaryPrompt: string;
  if (existingSummary) {
    summaryPrompt = `
Previous summary: ${existingSummary}

New messages to add to summary: ${formatMessagesForSummary(messagesToSummarize)}

Update the summary to include these new messages while maintaining key context about:
- User's name and background
- Competition context and goals  
- Technical strategies discussed
- Important insights provided

Keep the summary concise but comprehensive.
`;
  } else {
    summaryPrompt = `
Summarize this Kaggle competition conversation:
${formatMessagesForSummary(messagesToSummarize)}

Focus on:
- User's identity and background
- Competition context and goals
- Technical strategies and methods discussed
- Key insights and recommendations provided

Keep the summary concise but comprehensive.
`;
  }
  
  try {
    const summaryResponse = await llmService.invokeSummary([
      new HumanMessage({ content: summaryPrompt })
    ], config);
    
    // ✅ REMOVEMESSAGE PATTERN: Following LangGraph docs exactly
    // Find all messages to remove (everything except SystemMessages and last 3 conversation messages)
    const last3Ids = new Set(last3Conversation.map((msg: any) => msg.id).filter((id: any) => id));
    
    const messagesToRemove = messages.filter((msg: any) => {
      // Don't remove SystemMessages
      if (msg instanceof SystemMessage) {
        return false;
      }
      
      // Don't remove last 3 conversation messages
      if (msg.id && last3Ids.has(msg.id)) {
        return false;
      }
      
      // Remove everything else (old conversations + ALL tool messages)
      return msg.id != null;
    });
    
    // Create RemoveMessage objects following LangGraph pattern
    const removeMessages = messagesToRemove.map((msg: any) => new RemoveMessage({ id: msg.id }));
    
    console.log(`💾 Summarized ${messagesToSummarize.length} conversation messages`);
    console.log(`💾 Keeping ONLY last 3 conversation messages: ${last3Conversation.map((msg: any) => msg.constructor.name)}`);
    console.log(`💾 Creating ${removeMessages.length} RemoveMessage objects for LangGraph removal`);
    console.log(`💾 Messages to remove IDs: ${messagesToRemove.map((msg: any) => msg.id)}`);
    
    return {
      conversation_summary: summaryResponse.content,
      messages: removeMessages,  // ✅ Return RemoveMessage objects following LangGraph docs
      last_summarized_at: 3,     // We kept 3 messages
      current_step: "conversation_summarized"
    };
    
  } catch (error) {
    console.error("❌ Summarization failed:", error);
    return { current_step: "summarization_failed" };
  }
}



// Exact mirror of call_llm
export async function callLLM(
  state: any,
  llmService: LLMService,
  config?: RunnableConfig
): Promise<any> {
  console.log("🤖 CALL_LLM: Starting with state.messages:", state.messages?.length || 0);
  console.log("🤖 CALL_LLM: Competition data in state:", {
    competition_id: state.competition_id,
    competition_title: state.competition_title,
    competition_description: state.competition_description?.substring(0, 100) + '...',
    competition_evaluation: state.competition_evaluation?.substring(0, 100) + '...',
    current_step: state.current_step,
    // Additional debugging
    has_competition_title: !!state.competition_title,
    has_competition_description: !!state.competition_description,
    has_competition_evaluation: !!state.competition_evaluation,
    competition_title_length: state.competition_title?.length || 0,
    competition_description_length: state.competition_description?.length || 0,
    competition_evaluation_length: state.competition_evaluation?.length || 0
  });
  
  // Critical check - if we're missing competition data, this is the issue
  if (!state.competition_title || !state.competition_description) {
    console.error("🚨 CALL_LLM: CRITICAL ERROR - Missing competition data in state!");
    console.error("🚨 CALL_LLM: This indicates setupNode state update failed!");
    console.error("🚨 CALL_LLM: Current state keys:", Object.keys(state));
    console.error("🚨 CALL_LLM: Full state object:", state);
  }
  
  // Log current messages with tool_calls info
  if (state.messages) {
    state.messages.forEach((msg: any, i: number) => {
      const msgType = msg.constructor?.name || msg.type || 'unknown';
      const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
      const isToolMessage = msg instanceof ToolMessage || msg.type === 'tool';
      console.log(`  ${i}. ${msgType}${hasToolCalls ? ' (HAS TOOL_CALLS)' : ''}${isToolMessage ? ' (TOOL MSG)' : ''}: ${String(msg.content).substring(0, 50)}...`);
    });
  }

  // Check if we need to summarize first (exact same logic)
  if (shouldSummarizeConversation(state)) {
    console.log("🧠 Conversation getting long, will summarize after response...");
  }

  // Include summary in system prompt if available (exact same logic)
  const summary = state.conversation_summary || '';
  
  // Choose the appropriate prompt based on whether we have a summary
  let systemPrompt: string;
  if (summary) {
    systemPrompt = SYSTEM_PROMPT_WITH_SUMMARY
      .replace('{competition_id}', state.competition_id || '')
      .replace('{competition_title}', state.competition_title || '')
      .replace('{competition_description}', state.competition_description || '')
      .replace('{competition_evaluation}', state.competition_evaluation || '')
      .replace('{conversation_summary}', summary);
  } else {
    systemPrompt = SYSTEM_PROMPT
      .replace('{competition_id}', state.competition_id || '')
      .replace('{competition_title}', state.competition_title || '')
      .replace('{competition_description}', state.competition_description || '')
      .replace('{competition_evaluation}', state.competition_evaluation || '');
  }

  const messages = [
    new SystemMessage({ content: systemPrompt }),
    ...validateMessages(state.messages || [])
  ];
  
  console.log("🔄 CALL_LLM: After validateAndCleanMessages:", messages.length);
  messages.forEach((msg: any, i: number) => {
    const msgType = msg.constructor?.name || 'unknown';
    const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
    const isToolMessage = msg instanceof ToolMessage;
    console.log(`  ${i}. ${msgType}${hasToolCalls ? ' (HAS TOOL_CALLS)' : ''}${isToolMessage ? ' (TOOL MSG)' : ''}: ${String(msg.content).substring(0, 50)}...`);
  });
  
  console.log('🧠 Message validation completed, message count:', messages.length);
  
  // Use our custom trimming function that preserves tool_calls
  // The standard trimMessages function strips tool_calls from AI messages
  const trimmedMessages = await trimMessagesNative(messages, llmService.getLLM());
  
  console.log("✂️ CALL_LLM: After trimming:", trimmedMessages.length);
  trimmedMessages.forEach((msg: any, i: number) => {
    const msgType = msg.constructor?.name || 'unknown';
    const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
    const isToolMessage = msg instanceof ToolMessage;
    console.log(`  ${i}. ${msgType}${hasToolCalls ? ' (HAS TOOL_CALLS)' : ''}${isToolMessage ? ' (TOOL MSG)' : ''}: ${String(msg.content).substring(0, 50)}...`);
    if (hasToolCalls) {
      console.log(`    🔧 tool_calls: ${JSON.stringify(msg.tool_calls)}`);
    }
  });
  
  console.log("📤 CALL_LLM: Sending to OpenAI with", trimmedMessages.length, "messages");
  const response = await llmService.invokeWithTools(trimmedMessages, config);
  
  console.log("📥 CALL_LLM: Received response:", response.constructor?.name);
  console.log("📥 Response content:", String(response.content).substring(0, 100) + "...");
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("📥 Response has tool_calls:", JSON.stringify(response.tool_calls));
  }
  
  return {
    messages: [response],
    current_step: "llm_complete",
    message_count: (state.messages || []).length + 1
  };
}

// Exact mirror of retriever_agent
export async function retrieverAgent(
  state: any,
  llmService: LLMService,
  config?: RunnableConfig
): Promise<any> {
  /**
   * Execute tool calls from the LLM's response
   * Exact same logic as Python version
   */
  console.log("🔧 RETRIEVER_AGENT: Starting with state.messages:", state.messages?.length || 0);
  
  // Log all current messages
  if (state.messages) {
    state.messages.forEach((msg: any, i: number) => {
      const msgType = msg.constructor?.name || msg.type || 'unknown';
      const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
      const isToolMessage = msg instanceof ToolMessage || msg.type === 'tool';
      console.log(`  STATE[${i}]. ${msgType}${hasToolCalls ? ' (HAS TOOL_CALLS)' : ''}${isToolMessage ? ' (TOOL MSG)' : ''}: ${String(msg.content).substring(0, 50)}...`);
      if (hasToolCalls) {
        console.log(`    🔧 tool_calls in state: ${JSON.stringify(msg.tool_calls)}`);
      }
    });
  }
  
  const lastMessage = state.messages?.[state.messages.length - 1];
  console.log("🔧 Last message type:", lastMessage?.constructor?.name);
  console.log("🔧 Last message has tool_calls:", !!(lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls));
  
  if (!lastMessage || !('tool_calls' in lastMessage) || !lastMessage.tool_calls) {
    console.log("❌ RETRIEVER_AGENT: No tool calls found in last message");
    console.log("❌ Last message structure:", {
      exists: !!lastMessage,
      type: lastMessage?.constructor?.name,
      hasToolCallsProperty: lastMessage ? 'tool_calls' in lastMessage : false,
      toolCallsValue: lastMessage ? lastMessage.tool_calls : undefined
    });
    return { current_step: "no_tools_called" };
  }

  const toolCalls = lastMessage.tool_calls;
  console.log("🔧 RETRIEVER_AGENT: Found", toolCalls.length, "tool calls");
  toolCalls.forEach((call: any, i: number) => {
    console.log(`  ${i + 1}. ${call.name} (id: ${call.id})`);
    console.log(`     args: ${JSON.stringify(call.args)}`);
  });
  
  const competitionId = state.competition_id;
  const results: ToolMessage[] = [];
  
  const toolsDict = llmService.getToolsDict();  // ✅ Get tools from service

  for (const toolCall of toolCalls) {
    console.log(`🔧 Executing Tool: ${toolCall.name} with query ${toolCall.args?.query || 'No query provided'} | competition_id: ${competitionId}`);
    
    if (!(toolCall.name in toolsDict)) {
      console.log(`❌ Tool: ${toolCall.name} does not exist!`);
      const result = "Incorrect Tool name, Please retry and select tool from list of available tools.";
      results.push(new ToolMessage({
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: result
      }));
    } else {
      // Get the original tool arguments (exact same logic)
      const toolArgs = { ...toolCall.args };
      
      // Add competition_id from state if it's not already in the tool arguments
      if (competitionId && !('competition_id' in toolArgs)) {
        toolArgs.competition_id = competitionId;
      }

      // Pass all arguments to the tool
      console.log(`🔧 Invoking ${toolCall.name} with args:`, toolArgs);
      const result = await toolsDict[toolCall.name].invoke(toolArgs, config);
      console.log(`✅ Tool ${toolCall.name} result length: ${String(result).length}`);

      results.push(new ToolMessage({
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: String(result)
      }));
    }
  }

  console.log("🔧 RETRIEVER_AGENT: Created", results.length, "tool messages");
  results.forEach((msg, i) => {
    console.log(`  RESULT[${i + 1}]. ToolMessage (call_id: ${msg.tool_call_id}): ${String(msg.content).substring(0, 50)}...`);
  });
  
  console.log("✅ Tools Execution Complete.. Back to the Model!");
  return { messages: results };
}

// Exact mirror of call_evaluation_agent
// Exact mirror of call_evaluation_agent
export async function callEvaluationAgent(
  state: any,
  llmService: LLMService,
  config?: RunnableConfig
): Promise<any> {
  /**
   * Call the separate evaluation agent to assess retrieval quality
   * Exact same logic as Python version
   */
  
  // Get the last tool result
  const lastMessage = state.messages?.[state.messages.length - 1];
  if (!lastMessage || !(lastMessage instanceof ToolMessage)) {
    return { current_step: "evaluation_error" };
  }

  // Find the user query that triggered the current tool execution
let originalQuery: string | null = null;

// First, find the AI message with tool_calls that created the current tool result
const toolCallId = lastMessage.tool_call_id;
let toolCallMessageIndex = -1;

for (let i = state.messages.length - 1; i >= 0; i--) {
  const msg = state.messages[i];
  if (msg instanceof AIMessage && msg.tool_calls) {
    const hasMatchingCall = msg.tool_calls.some((call: any) => call.id === toolCallId);
    if (hasMatchingCall) {
      toolCallMessageIndex = i;
      break;
    }
  }
}

// Then find the most recent HumanMessage before that AI message
if (toolCallMessageIndex > 0) {
  for (let i = toolCallMessageIndex - 1; i >= 0; i--) {
    const msg = state.messages[i];
    if (msg instanceof HumanMessage) {
      originalQuery = msg.content as string;
      break;
    }
  }
}

  if (!originalQuery) {
    return { current_step: "evaluation_error" };
  }

  // Prepare evaluation input (exact same as Python)
  const evalInput = {
    original_query: originalQuery,
    retrieved_content: lastMessage.content as string,
    competition_context: `Competition: ${state.competition_title || ''} | ${state.competition_description || ''}`,
    evaluation_result: null
  };

  // Call evaluation agent
  const evalResult = await evaluationAgent(evalInput, llmService, config);
  const evaluation = evalResult.evaluation_result!;

  console.log(`📊 Evaluation Agent Result:`);
  console.log(`   Quality: ${evaluation.quality}`);
  console.log(`   Relevance: ${evaluation.relevance_score}/10`);
  console.log(`   Completeness: ${evaluation.completeness_score}/10`);
  console.log(`   Next Action: ${evaluation.next_action}`);
  console.log(`   Reasoning: ${evaluation.reasoning}`);

  const retryCount = state.retry_count || 0;
  const currentStep = state.current_step || '';

  // ✅ ROBUST FIX: Multiple safeguards against infinite loops (exact same as Python)
  
  // Safeguard 1: Hard limit on retries
  if (retryCount >= 2) {
    console.log(`🔚 Hard retry limit reached (count: ${retryCount}). Generating answer.`);
    return { 
      current_step: "generate_final_answer", 
      retrieval_evaluation: evaluation // ✅ FIXED: Remove .dict() - not needed in TypeScript
    };
  }

  // Safeguard 2: If web search was already used, don't retry again
  if (currentStep === "web_search_initiated" || String(lastMessage.name).includes("web_search")) {
    console.log("🌐 Web search already completed. Generating final answer.");
    return { 
      current_step: "generate_final_answer", 
      retrieval_evaluation: evaluation 
    };
  }

  // Normal evaluation logic (exact same as Python)
  let nextStep: string;
  if (evaluation.relevance_score >= 7 && evaluation.completeness_score >= 6) {
    nextStep = "generate_final_answer";
  } else if (evaluation.relevance_score >= 5 && retryCount < 1) {  // Only allow 1 RAG retry
    nextStep = "retry_search";
  } else {
    nextStep = "generate_final_answer";
  }

  return {
    current_step: nextStep,
    retrieval_evaluation: evaluation 
  };
}

// Exact mirror of retry_search_node
export async function retrySearchNode(
  state: any,
  _config?: RunnableConfig
): Promise<any> {
  // Suppress unused parameter warning
  void _config;
  
  /**
   * Generate refined search based on evaluation feedback
   * Exact same logic as Python version
   */
  
  const evaluation = state.retrieval_evaluation || {};
  const suggestedQuery = evaluation.suggested_query;
  const retryCount = state.retry_count || 0;

  // After 2 retries, switch to web search (exact same logic)
  if (retryCount >= 2) {
    console.log("🌐 Switching to web search as fallback...");
    
    // Get original query for web search
    let originalQuery: string | null = null;
    for (const msg of state.messages || []) {
      if (msg instanceof HumanMessage) {
        originalQuery = msg.content as string;
        break;
      }
    }

    const webQuery = originalQuery || "ensemble techniques RMSLE";
    
    // Create web search message
    const webSearchMessage = new AIMessage({
      content: `Let me search the web for additional insights: ${webQuery}`,
      tool_calls: [{
        id: `web_search_${Math.floor(Date.now() / 1000)}`, // ✅ FIXED: Use Math.floor to match Python int(time.time())
        name: "web_search_tool",
        args: { query: webQuery }
      }]
    });

    return {
      messages: [webSearchMessage],
      current_step: "web_search_initiated",
      retry_count: retryCount + 1
    };
  }

  // Use suggested query or create a refined one (exact same logic)
  let refinedQuery: string;
  if (suggestedQuery) {
    refinedQuery = suggestedQuery;
  } else {
    // Fallback: extract key terms and refine
    let originalQuery: string | null = null;
    for (const msg of state.messages || []) {
      if (msg instanceof HumanMessage) {
        originalQuery = msg.content as string;
        break;
      }
    }
    refinedQuery = originalQuery 
      ? `advanced techniques ${originalQuery}` 
      : "competition strategies";
  }

  console.log(`🔄 Retry #${retryCount + 1} with query: ${refinedQuery}`);

  // Create new search message (exact same logic)
  const searchMessage = new AIMessage({
    content: `Let me search with a more targeted approach: ${refinedQuery}`,
    tool_calls: [{
      id: uuidv4(), // Use proper UUID instead of timestamp-based ID
      name: "rag_tool",
      args: { 
        query: refinedQuery, 
        competition_id: state.competition_id 
      }
    }]
  });

  return {
    messages: [searchMessage],
    current_step: "retry_initiated",
    retry_count: retryCount + 1
  };
}

// Exact mirror of route_from_llm
export function routeFromLLM(state: any): string {
  console.log("🚦 ROUTE_FROM_LLM: Checking last message for routing decision");
  
  const result = state.messages?.[state.messages.length - 1];
  
  if (!result) {
    console.log("🚦 No messages in state, routing to end");
    return "end";
  }
  
  console.log("🚦 Last message type:", result.constructor?.name);
  console.log("🚦 Last message has tool_calls property:", 'tool_calls' in result);
  
  if ('tool_calls' in result && result.tool_calls && result.tool_calls.length > 0) {
    console.log("🚦 Found", result.tool_calls.length, "tool_calls, routing to tools");
    result.tool_calls.forEach((call: any, i: number) => {
      console.log(`   ${i + 1}. ${call.name} (id: ${call.id})`);
    });
    return "tools";
  } else if (result instanceof AIMessage) {
    console.log("🚦 AIMessage with no tool_calls, routing to end");
    return "end";
  }
  
  console.log("🚦 Unknown message type, routing to end");
  return "end";
}

// Exact mirror of route_from_evaluation  
export function routeFromEvaluation(state: any): string {
  const currentStep = state.current_step || '';
  
  if (currentStep === "generate_final_answer") {
    return "call_llm";
  } else if (currentStep === "retry_search") {
    return "retry_search";
  } else if (currentStep === "end_insufficient") {
    return "end";
  }
  
  return "call_llm";
}
