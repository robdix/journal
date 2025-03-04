import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { getEmbedding, getChatResponse } from '../../lib/openai';
import type { UserContext } from '../../types/context';

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

type Data = {
  success: boolean;
  response?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { question, context } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    // Fetch user context
    const { data: userContext, error: contextError } = await supabase
      .from('user_context')
      .select('*')
      .single();

    if (contextError) {
      console.error('Error fetching user context:', contextError);
      // Continue without context rather than failing
    }

    // Generate embedding for the question
    const questionEmbedding = await getEmbedding(question);

    // Find similar entries using vector similarity
    const { data: similarEntries, error: searchError } = await supabase
      .rpc('match_journal_entries', {
        query_embedding: questionEmbedding,
        match_threshold: 0.3, // Lower threshold to be more inclusive
        match_count: 10, // Increased count to get more potential matches
      });

    if (searchError) throw searchError;

    // Format conversation history for the AI
    const conversationHistory = context?.map((msg: Message) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Get a response from OpenAI
    const response = await getChatResponse(
      question, 
      similarEntries || [], 
      conversationHistory,
      userContext as UserContext
    );

    return res.status(200).json({ 
      success: true, 
      response: response 
    });
  } catch (error: any) {
    console.error('Error processing query:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process query' 
    });
  }
} 