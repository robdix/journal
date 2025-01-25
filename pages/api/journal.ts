import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { getEmbedding } from '../../lib/openai';

type Data = {
  success: boolean;
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
    const { content, created_at } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Generate embedding
    const embedding = await getEmbedding(content);

    // Save to Supabase
    const { error: supabaseError } = await supabase
      .from('journal_entries')
      .insert([
        {
          content,
          embedding,
          created_at,
        }
      ]);

    if (supabaseError) throw supabaseError;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error saving journal entry:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to save journal entry' 
    });
  }
} 