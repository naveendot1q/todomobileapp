export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  due_date?: string;
  category?: string;
  created_at: string;
}
