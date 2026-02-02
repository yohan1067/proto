export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export interface ChatHistoryItem {
  id: number;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface UserItem {
  id: string;
  nickname: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}
