import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import type { UserContext, ContextApiResponse } from '../../types/context';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContextApiResponse>
) {
  // Only allow GET and PUT methods
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (req.method === 'GET') {
      // Fetch the context
      const { data, error } = await supabase
        .from('user_context')
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data as UserContext,
      });
    }

    if (req.method === 'PUT') {
      const updates = req.body;
      
      // Validate the request body
      const requiredFields = ['background_info', 'goals', 'current_projects', 'other'];
      for (const field of requiredFields) {
        if (typeof updates[field] !== 'string') {
          return res.status(400).json({
            success: false,
            error: `Invalid or missing field: ${field}`,
          });
        }
      }

      // Update the context
      const { data, error } = await supabase
        .from('user_context')
        .update({
          background_info: updates.background_info,
          goals: updates.goals,
          current_projects: updates.current_projects,
          other: updates.other,
        })
        .not('id', 'is', null) // ensures we update the existing row
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data as UserContext,
      });
    }
  } catch (error: any) {
    console.error('Context API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process request',
    });
  }
} 