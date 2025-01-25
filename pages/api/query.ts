import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { getEmbedding, getChatResponse } from '../../lib/openai';

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
    const { question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    // Generate embedding for the question
    const questionEmbedding = await getEmbedding(question);

    // Find similar entries using vector similarity
    const { data: similarEntries, error: searchError } = await supabase
      .rpc('match_journal_entries', {
        query_embedding: questionEmbedding,
        match_threshold: 0.5, // Adjust this threshold as needed
        match_count: 5, // Number of entries to return
      });

    if (searchError) throw searchError;

    // Get a response from OpenAI
    const response = await getChatResponse(question, similarEntries || []);

    return res.status(200).json({ success: true, response });
  } catch (error: any) {
    console.error('Error processing query:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process query' 
    });
  }
} 