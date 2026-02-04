import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { rooms, setRooms, currentRoomId, setCurrentRoomId, setMessages } = useChatStore();
  const { session } = useAuthStore();
  const [isFetching, setIsFetching] = useState(false);

  const fetchRooms = async () => {
    if (!session?.user) return;
    setIsFetching(true);
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (!error && data) setRooms(data);
    setIsFetching(false);
  };

  useEffect(() => {
    if (isOpen) fetchRooms();
  }, [isOpen]);

  const handleNewChat = () => {
    setCurrentRoomId(null);
    setMessages([]);
    onClose();
  };

  const handleSelectRoom = async (roomId: string) => {
    setCurrentRoomId(roomId);
    onClose();
    
    // Fetch messages for this room
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      const messages = data.flatMap((item: any) => {
        const imgMatch = item.question.match(/!\[Image\]\((.*?)\)/);
        const imageUrl = imgMatch ? imgMatch[1] : undefined;
        const text = item.question.replace(/!\[Image\]\(.*?\)/, '').trim();
        
        return [
          { id: item.id * 2, text, sender: 'user', timestamp: '', imageUrl },
          { id: item.id * 2 + 1, text: item.answer, sender: 'ai', timestamp: '' }
        ];
      });
      setMessages(messages as any);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed top-0 left-0 bottom-0 w-[280px] bg-[#0a0e17] border-r border-white/5 z-[70] transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-0 lg:w-72`}>
        <div className="flex flex-col h-full p-4">
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-2 w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all active:scale-95 mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            {t('new_chat')}
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 mb-2">Recent Chats</p>
            {isFetching && rooms.length === 0 ? (
              <div className="p-4 text-center text-white/20 text-xs italic">Loading...</div>
            ) : rooms.length === 0 ? (
              <div className="p-4 text-center text-white/20 text-xs italic">No chats yet</div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`flex flex-col w-full p-3 rounded-xl transition-all text-left group ${currentRoomId === room.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <span className={`text-sm font-medium truncate ${currentRoomId === room.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                    {room.title}
                  </span>
                  <span className="text-[9px] text-white/20 mt-1 uppercase">
                    {new Date(room.updated_at).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold uppercase">
                    {session?.user?.email?.[0] || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{session?.user?.email}</p>
                </div>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
