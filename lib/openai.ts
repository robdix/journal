import OpenAI from 'openai';

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
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  // Format the entries into a readable context
  const context = relevantEntries
    .map(entry => `Entry from ${new Date(entry.created_at).toLocaleDateString()}:\n${entry.content}`)
    .join('\n\n');

  const currentDate = new Date().toLocaleDateString();

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a helpful AI that provides insights about journal entries. Be empathetic and thoughtful in your responses. Today's date is ${currentDate}.`
    },
    {
      role: "user",
      content: `Here are some relevant journal entries:\n\n${context}`
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