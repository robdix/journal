import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

// Number of previous messages to include as context
const CONTEXT_MESSAGE_LIMIT = 8;

export default function ChatInterface() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getRecentContext = (messages: Message[]) => {
    // Get the last N messages, excluding the most recent user message
    return messages.slice(-CONTEXT_MESSAGE_LIMIT);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage: Message = { type: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setStatus('loading');
    setQuestion(''); // Clear input immediately after submission

    try {
      const recentContext = getRecentContext(messages);
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          context: recentContext,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      
      const data = await res.json();
      const assistantMessage: Message = { type: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      setStatus('idle');
    } catch (error) {
      console.error('Failed to get response:', error);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Messages Display */}
      <div className="mb-6 space-y-4 max-h-[70vh] overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <ReactMarkdown
                className={`prose ${message.type === 'user' ? 'prose-invert prose-p:text-white prose-strong:text-white prose-em:text-white' : ''} max-w-none`}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Invisible element to scroll to */}
      </div>

      {/* Question Input Form */}
      <div className="sticky bottom-0 bg-white p-4 border-t">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your journal entries..."
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !question.trim()}
              className={`px-6 py-3 rounded-lg font-medium ${
                status === 'loading' || !question.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors`}
            >
              {status === 'loading' ? 'Thinking...' : 'Ask'}
            </button>
          </div>
          
          {status === 'error' && (
            <p className="text-red-600">Failed to get response. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
} 