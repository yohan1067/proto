import { useUIStore } from '../store/useUIStore';

// Toast Notification Helper
export const showToast = (message: string = 'Copied!', duration: number = 2000) => {
  useUIStore.getState().setShowToast(true);
  setTimeout(() => useUIStore.getState().setShowToast(false), duration);
};

// Clipboard Copy Helper
export const copyToClipboard = async (text: string) => {
  if (!navigator?.clipboard) {
    fallbackCopy(text);
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    showToast();
  } catch (err) {
    console.error('Clipboard API failed, trying fallback', err);
    fallbackCopy(text);
  }
};

const fallbackCopy = (text: string) => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure it's not visible but part of DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    if (successful) {
      showToast();
    } else {
      console.error('Fallback copy failed');
    }
    
    document.body.removeChild(textArea);
  } catch (err) {
    console.error('Fallback copy error', err);
  }
};

// Stream Parser Helper
export const parseStreamChunk = (buffer: string): { lines: string[], remainingBuffer: string } => {
  const lines = buffer.split('\n');
  // The last line might be incomplete, so we keep it in the buffer
  const remainingBuffer = lines.pop() || '';
  return { lines, remainingBuffer };
};

export const parseSSEData = (line: string): string | null => {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith(':')) return null;

  const dataIndex = trimmedLine.indexOf('data: ');
  if (dataIndex === -1) return null;

  const dataStr = trimmedLine.slice(dataIndex + 6);
  if (dataStr === '[DONE]') return null;

  try {
    const json = JSON.parse(dataStr);
    return json.choices?.[0]?.delta?.content || null;
  } catch (e) {
    console.warn("Stream parse error for line:", trimmedLine, e);
    return null;
  }
};
