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
    const { content, start, end } = req.body as { content: string; start?: string; end?: string };
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Choose created_at: use end date if provided, else now
    const created_at = end ? new Date(end).toISOString() : new Date().toISOString();

    // Generate embedding for semantic retrieval
    const embedding = await getEmbedding(content);

    // Insert the entry first
    const { data: inserted, error: insertError } = await supabase
      .from('journal_entries')
      .insert([{ content, embedding, created_at }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Build extracted object: if content is JSON matching our shape, use it; otherwise extract
    let extracted: any = {};
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        extracted = parsed;
      }
    } catch {
      // Not JSON, ignore
    }

    if (!extracted || Object.keys(extracted).length === 0) {
      extracted = await extractJournalStructure(content);
    }

    // Stamp metadata
    extracted = {
      ...extracted,
      source: 'chat_summary',
      coverage: {
        start: start ? new Date(start).toISOString() : null,
        end: end ? new Date(end).toISOString() : null,
      },
    };

    // Update the row with extracted JSON
    if (inserted?.id) {
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({ extracted })
        .eq('id', inserted.id);
      if (updateError) throw updateError;
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error saving summary:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to save summary' });
  }
}

