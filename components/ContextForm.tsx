import { useState, useEffect } from 'react';
import type { UserContext } from '../types/context';

export default function ContextForm() {
  const [context, setContext] = useState<Omit<UserContext, 'id'>>({
    background_info: '',
    goals: '',
    current_projects: '',
    other: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch initial context data
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch('/api/context');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        if (data.data) {
          const { id, ...contextData } = data.data;
          setContext(contextData);
        }
      } catch (error) {
        console.error('Failed to fetch context:', error);
        setErrorMessage('Failed to load context data');
        setStatus('error');
      }
    };

    fetchContext();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);
      
      setStatus('success');
      
      // Reset success status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Failed to update context:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update context');
      setStatus('error');
    }
  };

  const handleChange = (field: keyof Omit<UserContext, 'id'>) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setContext(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Background Info */}
      <div>
        <label htmlFor="background_info" className="block text-sm font-medium text-gray-700 mb-2">
          Background Information
        </label>
        <textarea
          id="background_info"
          value={context.background_info}
          onChange={handleChange('background_info')}
          placeholder="Enter your background information..."
          className="w-full h-32 p-4 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Goals */}
      <div>
        <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-2">
          Goals
        </label>
        <textarea
          id="goals"
          value={context.goals}
          onChange={handleChange('goals')}
          placeholder="Enter your goals..."
          className="w-full h-32 p-4 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Current Projects */}
      <div>
        <label htmlFor="current_projects" className="block text-sm font-medium text-gray-700 mb-2">
          Current Projects
        </label>
        <textarea
          id="current_projects"
          value={context.current_projects}
          onChange={handleChange('current_projects')}
          placeholder="Enter your current projects..."
          className="w-full h-32 p-4 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Other */}
      <div>
        <label htmlFor="other" className="block text-sm font-medium text-gray-700 mb-2">
          Other Information
        </label>
        <textarea
          id="other"
          value={context.other}
          onChange={handleChange('other')}
          placeholder="Enter any other relevant information..."
          className="w-full h-32 p-4 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button and Status */}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`px-4 py-2 rounded-lg ${
            status === 'loading'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors`}
        >
          {status === 'loading' ? 'Saving...' : 'Save Context'}
        </button>
        
        {status === 'success' && (
          <span className="text-green-600">Saved successfully!</span>
        )}
        {status === 'error' && (
          <span className="text-red-600">{errorMessage || 'Failed to save. Please try again.'}</span>
        )}
      </div>
    </form>
  );
} 