import { useEffect, useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import { supabase } from '../lib/supabaseClient';

function StructuredHighlights() {
  const [actions, setActions] = useState<{ text: string; date: string }[]>([]);
  const [decisions, setDecisions] = useState<{ summary: string; chosen?: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('created_at, extracted')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        const a: { text: string; date: string }[] = [];
        const d: { summary: string; chosen?: string; date: string }[] = [];
        for (const row of data as any[]) {
          const date = row.created_at;
          const ex = row.extracted || {};
          if (Array.isArray(ex.actions)) {
            for (const act of ex.actions) {
              if (act?.text) a.push({ text: act.text, date });
            }
          }
          if (Array.isArray(ex.decisions)) {
            for (const dec of ex.decisions) {
              if (dec?.summary) d.push({ summary: dec.summary, chosen: dec.chosen, date });
            }
          }
        }
        setActions(a.slice(0, 12));
        setDecisions(d.slice(0, 8));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Summaries (chat_summary source)
  const [summaries, setSummaries] = useState<{ date: string; topics: string[]; tags: string[] }[]>([]);

  useEffect(() => {
    const fetchSummaries = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('created_at, extracted')
        .order('created_at', { ascending: false })
        .limit(12);
      const list: { date: string; topics: string[]; tags: string[] }[] = [];
      for (const row of (data as any[]) || []) {
        const ex = row?.extracted || {};
        if (ex?.source === 'chat_summary') {
          const topics = Array.isArray(ex.topics) ? ex.topics.slice(0, 5) : [];
          const tags = Array.isArray(ex.tags) ? ex.tags.slice(0, 5) : [];
          list.push({ date: row.created_at, topics, tags });
        }
      }
      setSummaries(list);
    };
    fetchSummaries();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="md:col-span-1 bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Actions</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : actions.length === 0 ? (
          <p className="text-sm text-gray-500">No actions found.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-2">
            {actions.map((a, i) => (
              <li key={i}>
                <span className="text-gray-800">{a.text}</span>
                <span className="ml-2 text-xs text-gray-500">({new Date(a.date).toLocaleDateString()})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="md:col-span-1 bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Decisions</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : decisions.length === 0 ? (
          <p className="text-sm text-gray-500">No decisions found.</p>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d, i) => (
              <li key={i} className="text-sm">
                <div className="text-gray-900">{d.summary}</div>
                {d.chosen && <div className="text-gray-700">Chosen: {d.chosen}</div>}
                <div className="text-xs text-gray-500">{new Date(d.date).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="md:col-span-1 bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Summaries</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-gray-500">No weekly summaries yet.</p>
        ) : (
          <ul className="space-y-3">
            {summaries.map((s, i) => (
              <li key={i} className="text-sm">
                <div className="text-gray-900">{new Date(s.date).toLocaleDateString()}</div>
                {s.topics.length > 0 && (
                  <div className="text-gray-700">Topics: {s.topics.join(', ')}</div>
                )}
                {s.tags.length > 0 && (
                  <div className="text-gray-700">Tags: {s.tags.join(', ')}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Insights() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Journal Insights</h1>
        <StructuredHighlights />
        <ChatInterface />
      </main>
    </div>
  );
}

// This ensures the page is rendered client-side
Insights.getInitialProps = async () => {
  return { props: {} };
};

export default Insights; 
