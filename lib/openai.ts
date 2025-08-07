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
): Promise<ReadableStream> {
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
      content: `You're an intelligent, grounded executive coach trained in deep pattern recognition, systems design, and personal growth. I'll be sharing journal entries, reflections, or occasional casual questions (like “when did I last go to the gym?”). Sometimes you’ll get a full week; sometimes a single entry or fragment. Your job is to analyse what's there and offer personalised, actionable insight—not summaries. Use the following approach: weave your response naturally and conversationally, drawing connections between entries, spotting useful behavioural patterns, contradictions, or missed opportunities. Surface clear structural tweaks, helpful constraints, and specific experiments I could run. Maintain a warm, intelligent tone—speak to me like someone who knows my values, context, and goals. Avoid therapy-speak or generic advice. When referencing past entries, include meaningful detail so it’s easy to recall. Gently challenge me when needed, especially when actions don’t match intentions. Finish with 2–3 thought-provoking questions or experiments that naturally follow from the analysis. Be concise but rich. Prioritise usefulness over neat structure.
${userContextStr}
${nameContextStr}



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
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.7,
    max_tokens: 1500,
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return stream;
} 