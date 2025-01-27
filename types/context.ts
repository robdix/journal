export interface UserContext {
  id: string;
  background_info: string;
  goals: string;
  current_projects: string;
  other: string;
}

export type ContextApiResponse = {
  success: boolean;
  data?: UserContext;
  error?: string;
}; 