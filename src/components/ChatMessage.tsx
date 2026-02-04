import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { speakText } from '../lib/utils';

interface ChatMessageProps {
  msg: Message;
  t: (key: string) => string;
  copyToClipboard: (text: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ msg, t, copyToClipboard }) => {
  return (
    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'ml-auto' : ''} animate-slide-in relative group`}>
      {msg.imageUrl && (
        <div className="mb-2 max-w-[200px] sm:max-w-[300px] rounded-2xl overflow-hidden shadow-xl border border-white/10 ring-1 ring-white/5">
          <img src={msg.imageUrl} alt="uploaded" className="w-full h-auto object-cover" />
        </div>
      )}
      
      <div className={`${msg.sender === 'ai' ? 'glass-ai rounded-tl-none' : 'glass-user rounded-tr-none'} rounded-2xl p-4 text-[15px] leading-relaxed relative group break-words overflow-hidden w-full whitespace-pre-wrap`}>
        {msg.sender === 'ai' ? (
          msg.text ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                ul: ({...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                ol: ({...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                li: ({...props}) => <li className="pl-1" {...props} />,
                p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                strong: ({...props}) => <span className="font-bold text-white" {...props} />,
                h1: ({...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                h2: ({...props}) => <h2 className="text-base font-bold my-2" {...props} />,
                h3: ({...props}) => <h3 className="text-sm font-bold my-1" {...props} />,
                blockquote: ({...props}) => <blockquote className="border-l-4 border-white/20 pl-4 py-1 my-2 bg-white/5 rounded-r" {...props} />,
                code: ({...props}) => <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono" {...props} />,
                pre: ({...props}) => <pre className="bg-black/30 rounded p-2 my-2 overflow-x-auto text-xs font-mono" {...props} />,
              }}
            >
              {msg.text}
            </ReactMarkdown>
          ) : (
            <div className="flex gap-1 py-2">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150"></div>
            </div>
          )
        )
       : (
          msg.text
        )}
        {msg.sender === 'ai' && msg.text && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => speakText(msg.text)}
              className="bg-white/10 border border-white/10 rounded-lg p-1.5 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              title="Read aloud"
            >
              <span className="material-symbols-outlined text-[16px]">volume_up</span>
            </button>
            <button
              onClick={() => copyToClipboard(msg.text)}
              className="bg-white/10 border border-white/10 rounded-lg p-1.5 px-2 flex items-center gap-1 text-[10px] text-white/70 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              {t('copy')}
            </button>
          </div>
        )}
      </div>
      <span className="text-[10px] text-white/30 mt-2 mx-1 uppercase tracking-widest">
        {msg.sender === 'ai' ? t('ai_name') : t('you')} • {msg.timestamp}
      </span>
    </div>
  );
};

export default ChatMessage;
