import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { getEmbedding, extractJournalStructure } from '../../lib/openai';

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
    console.log('Processing content:', content);

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Generate embedding
    console.log('Generating embedding...');
    const embedding = await getEmbedding(content);
    console.log('Embedding generated successfully');

    // Save to Supabase (returning inserted row)
    console.log('Saving to Supabase...');
    const { data: inserted, error: supabaseError } = await supabase
      .from('journal_entries')
      .insert([
        {
          content,
          embedding,
          created_at,
        }
      ])
      .select()
      .single();

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      throw supabaseError;
    }

    // Attempt extraction (best-effort)
    try {
      console.log('Extracting structure...');
      const extracted = await extractJournalStructure(content);
      if (inserted?.id) {
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ extracted })
          .eq('id', inserted.id);
        if (updateError) console.warn('Failed to update extracted structure:', updateError);
      }
    } catch (ex) {
      console.warn('Extraction step failed:', ex);
    }

    console.log('Successfully saved to database');
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error saving journal entry:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to save journal entry' 
    });
  }
} 
