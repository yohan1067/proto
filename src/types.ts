export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string;
}

export interface ChatRoom {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatHistoryItem {
  id: number;
  user_id: string;
  room_id?: string;
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
