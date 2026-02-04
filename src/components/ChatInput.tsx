import React, { type RefObject, useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useChatStore } from '../store/useChatStore';
import { useSpeech } from '../hooks/useSpeech';

interface ChatInputProps {
  question: string;
  setQuestion: (q: string) => void;
  isLoadingAi: boolean;
  handleAskAi: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  t: (key: string) => string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  question, 
  setQuestion, 
  isLoadingAi, 
  handleAskAi, 
  inputRef, 
  t 
}) => {
  const { selectedImage, setSelectedImage } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeech();

  // Speech to Text Effect
  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript, setQuestion]);

  // Height auto-adjustment
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [question, inputRef]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
      setTranscript(''); // Clear speech buffer on send
    }
  };

  const processFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 1, 
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedBlob = await imageCompression(file, options);
        const compressedFile = new File([compressedBlob], file.name, { type: file.type });
        setSelectedImage(compressedFile);
      } catch (error) {
        console.error("Image compression failed, using original:", error);
        setSelectedImage(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag & Drop Handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Handle Speech Toggle
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript(''); // Clear previous
      setQuestion(''); // Clear input for fresh speech
      startListening();
    }
  };

  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto max-w-3xl mx-auto">
      {/* Image Preview */}
      {selectedImage && (
        <div className="mb-2 ml-2 relative inline-block animate-in fade-in slide-in-from-bottom-2">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/40">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="preview" 
              className="w-full h-full object-cover" 
            />
          </div>
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
          </button>
        </div>
      )}

      <div 
        className={`input-container relative flex items-end gap-2 p-2 pl-3 rounded-2xl w-full shadow-2xl bg-[#161b2a] border transition-all backdrop-blur-2xl ${isDragging ? 'border-primary ring-2 ring-primary/50' : 'border-white/10'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-primary/20 backdrop-blur-sm z-10 flex items-center justify-center border-2 border-dashed border-primary pointer-events-none">
            <div className="flex flex-col items-center text-white drop-shadow-md">
              <span className="material-symbols-outlined text-4xl mb-1">upload_file</span>
              <span className="text-sm font-bold tracking-wide">Drop Image Here</span>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        {/* Image Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingAi}
          className="w-10 h-10 mb-1 flex-shrink-0 rounded-xl bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[22px]">image</span>
        </button>

        {/* Text Input */}
        <textarea 
          ref={inputRef}
          rows={1}
          className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2 px-1 resize-none no-scrollbar" 
          placeholder={isListening ? "듣고 있어요..." : t('ask_placeholder')}
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isLoadingAi}
        />
        
        {/* Mic Button (Visible when input is empty) */}
        {!question.trim() && !selectedImage ? (
           <button
             onClick={toggleListening}
             disabled={isLoadingAi}
             className={`w-10 h-10 mb-1 flex-shrink-0 rounded-xl flex items-center justify-center active:scale-95 transition-all ${isListening ? 'bg-red-500/80 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
           >
             <span className="material-symbols-outlined text-[22px]">{isListening ? 'mic_off' : 'mic'}</span>
           </button>
        ) : (
          // Send Button (Visible when input exists)
          <button
            onClick={() => { handleAskAi(); setTranscript(''); }}
            disabled={isLoadingAi}
            className="w-10 h-10 mb-1 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-white text-[20px] fill-1">send</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
