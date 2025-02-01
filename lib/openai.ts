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

  // Format name mappings if available
  const nameContextStr = userContext?.name_mappings?.length ? `
Important People in User's Life:
${userContext.name_mappings.map(person => 
  `- ${person.name}${person.description ? ` (${person.description})` : ''}`
).join('\n')}

Note: When analyzing entries, be aware that these names might appear with slight spelling variations or typos. Use your judgment to identify when variations likely refer to these people.
` : '';

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a helpful AI that provides insights about journal entries.
${userContextStr}
${nameContextStr}

IMPORTANT INSTRUCTIONS:
1. Consider the user's context (background, goals, projects) when analyzing entries
2. When multiple entries exist for a date or topic, ALWAYS discuss ALL relevant entries in your initial response
3. If entries are numbered, explicitly reference them by their numbers (e.g., "In Entry 1... and in Entry 2...")
4. Never hold back information for follow-up questions
5. Treat each entry as equally important
6. When relevant, relate your insights to the user's goals and projects
7. When you recognize names that are likely referring to known people (even with spelling variations), use their correct names in your responses
8. If you're unsure about a name match, maintain the original spelling used in the entry

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