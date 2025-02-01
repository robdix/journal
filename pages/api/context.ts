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

      // Validate name_mappings if present
      if (updates.name_mappings) {
        if (!Array.isArray(updates.name_mappings)) {
          return res.status(400).json({
            success: false,
            error: 'name_mappings must be an array',
          });
        }

        for (const mapping of updates.name_mappings) {
          if (typeof mapping.name !== 'string' || !mapping.name) {
            return res.status(400).json({
              success: false,
              error: 'Each name mapping must have a name field',
            });
          }
          if (mapping.description && typeof mapping.description !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Description must be a string if provided',
            });
          }
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
          name_mappings: updates.name_mappings || [],
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