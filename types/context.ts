export interface NameMapping {
  name: string;
  description?: string;
}

export interface UserContext {
  id: string;
  background_info: string;
  goals: string;
  current_projects: string;
  other: string;
  name_mappings: NameMapping[];
}

export type ContextApiResponse = {
  success: boolean;
  data?: UserContext;
  error?: string;
}; 