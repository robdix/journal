import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { extractJournalStructure } from '../../lib/openai';

type Resp = {
  success: boolean;
  processed?: number;
  failed?: number;
  failures?: Array<{ id: string | number; error: string }>;
  remaining?: number | null;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Allow limit from body or query; default 20
    const bodyLimit = typeof req.body?.limit === 'number' ? req.body.limit : undefined;
    const queryLimit = req.query.limit ? Number(req.query.limit) : undefined;
    const limit = Math.max(1, Math.min(100, bodyLimit ?? queryLimit ?? 20));
    const startedAt = Date.now();
    console.log(`[backfill] Starting run at ${new Date(startedAt).toISOString()} with limit=${limit}`);

    // Fetch a batch of rows missing extracted
    const { data: rows, error: selectError } = await supabase
      .from('journal_entries')
      .select('id, content, created_at')
      .is('extracted', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (selectError) throw selectError;
    console.log(`[backfill] Selected ${rows?.length || 0} rows to process`);

    const failures: Array<{ id: string | number; error: string }> = [];
    let processed = 0;

    for (const row of rows || []) {
      const rowStart = Date.now();
      console.log(`[backfill] Processing id=${row.id} created_at=${row.created_at}`);
      try {
        const extracted = await extractJournalStructure(row.content || '');
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ extracted })
          .eq('id', row.id);
        if (updateError) throw updateError;
        processed += 1;
        console.log(`[backfill] Updated id=${row.id} in ${Date.now() - rowStart}ms`);
      } catch (err: any) {
        failures.push({ id: row.id, error: err?.message || String(err) });
        console.warn(`[backfill] Failed id=${row.id}: ${err?.message || err}`);
      }
    }

    // Count remaining
    const { count } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .is('extracted', null);
    console.log(`[backfill] Completed run. processed=${processed} failed=${failures.length} remaining=${typeof count === 'number' ? count : 'unknown'} totalDurationMs=${Date.now() - startedAt}`);

    return res.status(200).json({
      success: true,
      processed,
      failed: failures.length,
      failures: failures.length ? failures : undefined,
      remaining: typeof count === 'number' ? count : null,
    });
  } catch (error: any) {
    console.error('Backfill error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Backfill failed' });
  }
}
