import { useState } from 'react';

export default function WeeklySummary() {
  const [content, setContent] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, start: start || undefined, end: end || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setStatus('success');
      setMessage('Saved weekly summary');
      setContent('');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Failed to save');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Add Weekly Summary</h1>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 space-y-4 bg-white border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Coverage start (optional)</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-2 border rounded"/>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Coverage end (optional)</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full p-2 border rounded"/>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your weekly summary here (raw text or structured JSON)"
            className="w-full h-72 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={status === 'saving' || !content.trim()}
              className={`px-4 py-2 rounded-lg ${status === 'saving' ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
            >
              {status === 'saving' ? 'Saving…' : 'Save Summary'}
            </button>
            {message && (
              <span className={status === 'success' ? 'text-green-600' : 'text-red-600'}>{message}</span>
            )}
          </div>
        </form>
        <div className="max-w-3xl mx-auto mt-6 text-sm text-gray-600">
          <p>Tip: If you paste valid JSON matching the app schema (segments/actions/decisions/entities/tags/energy/topics), we’ll store it directly; otherwise we’ll auto-structure your text.</p>
        </div>
      </main>
    </div>
  );
}

