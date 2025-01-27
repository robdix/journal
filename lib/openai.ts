import OpenAI from 'openai';
import type { UserContext } from '../types/context';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env.OPENAI_API_KEY');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate embeddings
export async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",  // This model outputs 1536 dimensions
    input: text,
  });

  return response.data[0].embedding;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Helper function to generate chat responses
export async function getChatResponse(
  question: string, 
  relevantEntries: { content: string, created_at: string }[],
  conversationHistory: ChatMessage[] = [],
  userContext?: UserContext
): Promise<string> {
  // Group entries by date
  const entriesByDate = relevantEntries.reduce((acc, entry) => {
    const date = new Date(entry.created_at).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry.content);
    return acc;
  }, {} as Record<string, string[]>);

  // Format the entries into a readable context, grouped by date
  const journalContext = Object.entries(entriesByDate)
    .map(([date, entries]) => 
      `Entries from ${date}:\n${entries.map((entry, i) => `[Entry ${i + 1}]: ${entry}`).join('\n\n')}`
    )
    .join('\n\n');

  const currentDate = new Date().toLocaleDateString();

  // Format user context if available
  const userContextStr = userContext ? `
User Context:
- Background: ${userContext.background_info}
- Goals: ${userContext.goals}
- Current Projects: ${userContext.current_projects}
- Other Information: ${userContext.other}
` : '';

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a helpful AI that provides insights about journal entries. ${userContextStr}

IMPORTANT INSTRUCTIONS:
1. Consider the user's context (background, goals, projects) when analyzing entries
2. When multiple entries exist for a date or topic, ALWAYS discuss ALL relevant entries in your initial response
3. If entries are numbered, explicitly reference them by their numbers (e.g., "In Entry 1... and in Entry 2...")
4. Never hold back information for follow-up questions
5. Treat each entry as equally important
6. When relevant, relate your insights to the user's goals and projects

Today's date is ${currentDate}.`
    },
    {
      role: "user",
      content: `Here are the relevant journal entries (if multiple entries exist for a date, you MUST discuss all of them):\n\n${journalContext}`
    },
    ...conversationHistory,
    {
      role: "user",
      content: question
    }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0].message.content || 'No response generated';
} 