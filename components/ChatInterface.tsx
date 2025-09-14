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
  const [mode, setMode] = useState<'coach' | 'psychiatrist' | 'productivity' | 'peer' | 'analyst' | 'content'>('coach');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const STARTERS: Record<typeof mode, string[]> = {
    coach: [
      'What themes stood out for me last week?',
      'Where do my actions not match my intentions?',
      'What small constraint would improve my week?'
    ],
    psychiatrist: [
      'What emotions keep recurring lately and why?',
      'Where might I be using all-or-nothing thinking?',
      'What coping strategies are working vs. not?'
    ],
    productivity: [
      'Pull 3 concrete next steps from recent entries.',
      'What single focus would move things most this week?',
      'Timebox a realistic plan for tomorrow.'
    ],
    peer: [
      'Give me a pep talk based on last week.',
      'What should I be proud of lately?',
      'Suggest one light-weight experiment to try.'
    ],
    analyst: [
      'What trends and outliers show up in the last 30 days?',
      'When are my energy highs vs. lows?',
      'What correlates with productive days?'
    ],
    content: [
      'Pitch 10 content ideas from my last 30 days.',
      'Find 3 contrarian angles from recent entries.',
      'Draft an outline for a post about my recurring theme.'
    ],
  };

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
          mode,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = { type: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk);
          assistantMessage.content += chunk;

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage };
            return newMessages;
          });
        }
      };

      await processStream();
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
          <div className="flex gap-2 items-center">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="p-3 border rounded-lg text-sm"
              title="Assistant mode"
            >
              <option value="coach">Coach</option>
              <option value="psychiatrist">Psychiatrist</option>
              <option value="productivity">Productivity</option>
              <option value="peer">Peer</option>
              <option value="analyst">Analyst</option>
              <option value="content">Content</option>
            </select>
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

          {/* Conversation starters */}
          <div className="flex flex-wrap gap-2">
            {STARTERS[mode].map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuestion(s)}
                className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
                title="Fill prompt"
              >
                {s}
              </button>
            ))}
          </div>
          
          {status === 'error' && (
            <p className="text-red-600">Failed to get response. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
