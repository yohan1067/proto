import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatMessage from './ChatMessage';
import type { Message } from '../types';

describe('ChatMessage', () => {
  const mockCopyToClipboard = vi.fn();
  const mockT = (key: string) => key;

  const userMsg: Message = {
    id: 1,
    text: 'Hello AI',
    sender: 'user',
    timestamp: '10:00 AM',
  };

  const aiMsg: Message = {
    id: 2,
    text: '**Hello** from AI',
    sender: 'ai',
    timestamp: '10:01 AM',
  };

  const loadingAiMsg: Message = {
    id: 3,
    text: '',
    sender: 'ai',
    timestamp: '10:02 AM',
  };

  it('renders user message correctly', () => {
    render(<ChatMessage msg={userMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('you • 10:00 AM')).toBeInTheDocument();
    // 사용자 메시지에는 복사 버튼이 없어야 함
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders AI message with markdown', () => {
    render(<ChatMessage msg={aiMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    // 마크다운 **Hello**가 굵게 처리되었는지 확인
    const boldText = screen.getByText('Hello');
    expect(boldText.tagName).toBe('SPAN');
    expect(boldText).toHaveClass('font-bold');
    
    expect(screen.getByText('ai_name • 10:01 AM')).toBeInTheDocument();
  });

  it('renders loading state for AI message without text', () => {
    const { container } = render(<ChatMessage msg={loadingAiMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    // 로딩 도트 확인 (animate-bounce 클래스 포함 여부)
    const bounceDots = container.getElementsByClassName('animate-bounce');
    expect(bounceDots.length).toBe(3);
  });

  it('calls copyToClipboard when copy button is clicked', () => {
    render(<ChatMessage msg={aiMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);
    
    expect(mockCopyToClipboard).toHaveBeenCalledWith('**Hello** from AI');
  });

  it('applies correct CSS classes based on sender', () => {
    const { rerender, container } = render(<ChatMessage msg={userMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    // User message container classes
    expect(container.firstChild).toHaveClass('items-end');
    
    rerender(<ChatMessage msg={aiMsg} t={mockT} copyToClipboard={mockCopyToClipboard} />);
    
    // AI message container classes
    expect(container.firstChild).toHaveClass('items-start');
  });
});
