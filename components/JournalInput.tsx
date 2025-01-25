import { useState } from 'react';

export default function JournalInput() {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setStatus('saving');
    try {
      const today = new Date().toISOString().split('T')[0];
      let timestamp;
      
      if (useCurrentTime) {
        // Combine selected date with current time
        const now = new Date();
        const [year, month, day] = date.split('-').map(Number);
        timestamp = new Date(
          year,
          month - 1, // JavaScript months are 0-based
          day,
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        ).toISOString();
      } else {
        // Use noon UTC for past dates
        timestamp = new Date(`${date}T12:00:00.000Z`).toISOString();
      }

      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          created_at: timestamp
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      setStatus('success');
      setContent('');
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            // If selecting today's date, default to using current time
            setUseCurrentTime(e.target.value === new Date().toISOString().split('T')[0]);
          }}
          className="p-2 border rounded"
        />
        {date !== new Date().toISOString().split('T')[0] && (
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={useCurrentTime}
              onChange={(e) => setUseCurrentTime(e.target.checked)}
              className="mr-2"
            />
            Use current time
          </label>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your journal entry here..."
        className="w-full h-64 p-4 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={status === 'saving' || !content.trim()}
          className={`px-4 py-2 rounded-lg ${
            status === 'saving'
              ? 'bg-gray-400'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {status === 'saving' ? 'Saving...' : 'Save Entry'}
        </button>
        {status === 'success' && (
          <span className="text-green-600">Saved successfully!</span>
        )}
        {status === 'error' && (
          <span className="text-red-600">Failed to save. Please try again.</span>
        )}
      </div>
    </form>
  );
} 