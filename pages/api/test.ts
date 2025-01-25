import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { openai, getEmbedding } from '../../lib/openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test Supabase connection
    const { data: supabaseTest, error: supabaseError } = await supabase.from('journal_entries').select('count');
    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    // Test OpenAI connection and embedding
    const testEmbedding = await getEmbedding('Hello world');

    res.status(200).json({ 
      success: true, 
      supabase: 'Connected successfully',
      openai: `Generated embedding with ${testEmbedding.length} dimensions`
    });
  } catch (error: any) {
    console.error('Test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error',
      details: JSON.stringify(error, null, 2)
    });
  }
} 