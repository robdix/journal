import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import { getEmbedding, getChatResponse } from '../../lib/openai';
import type { UserContext } from '../../types/context';

export const config = {
  runtime: 'edge',
};

interface JournalEntry {
  content: string;
  created_at: string;
  embedding: number[];
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

type Data = {
  success: boolean;
  response?: string;
  error?: string;
};

// Helper function to parse relative date queries
function parseDateQuery(question: string): { startDate: Date | null, endDate: Date } {
  const now = new Date();
  const endDate = new Date();
  let startDate: Date | null = null;

  // Common time period patterns
  const lastWeekPattern = /last week|past week|previous week/i;
  const lastMonthPattern = /last month|past month|previous month/i;
  const lastYearPattern = /last year|past year|previous year/i;
  const lastNDaysPattern = /last (\d+) days?/i;
  const yesterdayPattern = /yesterday/i;
  const todayPattern = /today/i;
  const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;

  if (lastWeekPattern.test(question)) {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (lastMonthPattern.test(question)) {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (lastYearPattern.test(question)) {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (lastNDaysPattern.test(question)) {
    const matches = question.match(lastNDaysPattern);
    if (matches && matches[1]) {
      const days = parseInt(matches[1]);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
    }
  } else if (yesterdayPattern.test(question)) {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (todayPattern.test(question)) {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (monthPattern.test(question)) {
    const matches = question.match(monthPattern);
    if (matches && matches[1]) {
      const monthName = matches[1].toLowerCase();
      const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(monthName);
      
      startDate = new Date(now.getFullYear(), monthIndex, 1);
      endDate.setMonth(monthIndex + 1);
      endDate.setDate(0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { question, context } = await req.json();

    if (!question?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse date range from question
    const { startDate, endDate } = parseDateQuery(question);

    // Fetch user context
    const { data: userContext, error: contextError } = await supabase
      .from('user_context')
      .select('*')
      .single();

    if (contextError) {
      console.error('Error fetching user context:', contextError);
      // Continue without context rather than failing
    }

    let relevantEntries;

    // If a specific date range is found in the query, prioritize fetching all entries from that range.
    // This provides a more deterministic result for time-based queries.
    if (startDate) {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('content, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      relevantEntries = data;
    } else {
      // If no date is found, fall back to semantic search.
      const questionEmbedding = await getEmbedding(question);
      const { data, error } = await supabase.rpc('match_journal_entries', {
        query_embedding: questionEmbedding,
        match_threshold: 0.3,
        match_count: 20,
      });

      if (error) throw error;
      relevantEntries = data;
    }

    // Sort entries by date (important for semantic search results)
    const sortedEntries = (relevantEntries || []).sort((a: JournalEntry, b: JournalEntry) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Format conversation history for the AI
    const conversationHistory = context?.map((msg: Message) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Get a response from OpenAI
    const response = await getChatResponse(
      question,
      sortedEntries,
      conversationHistory,
      userContext as UserContext
    );

    return new Response(response, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Error processing query:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Failed to process query' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 