import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatInput from './ChatInput';

describe('ChatInput', () => {
  const mockSetQuestion = vi.fn();
  const mockHandleAskAi = vi.fn();
  const mockInputRef = { current: null };
  const mockT = (key: string) => key;

  const defaultProps = {
    question: '',
    setQuestion: mockSetQuestion,
    isLoadingAi: false,
    handleAskAi: mockHandleAskAi,
    inputRef: mockInputRef,
    t: mockT,
  };

  it('renders input and button correctly', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('ask_placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls setQuestion on input change', () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText('ask_placeholder');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(mockSetQuestion).toHaveBeenCalledWith('Hello');
  });

  it('calls handleAskAi on send button click', () => {
    render(<ChatInput {...defaultProps} question="Test message" />);
    const button = screen.getByRole('button');
    
    // 버튼이 disabled가 아닌지 확인 (question이 비어있으면 disabled일 수 있음)
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    expect(mockHandleAskAi).toHaveBeenCalled();
  });

  it('calls handleAskAi on Enter key press', () => {
    render(<ChatInput {...defaultProps} question="Test message" />);
    const input = screen.getByPlaceholderText('ask_placeholder');
    
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockHandleAskAi).toHaveBeenCalled();
  });

  it('does not call handleAskAi on Shift+Enter', () => {
    mockHandleAskAi.mockClear();
    render(<ChatInput {...defaultProps} question="Test message" />);
    const input = screen.getByPlaceholderText('ask_placeholder');
    
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true, code: 'Enter', charCode: 13 });
    expect(mockHandleAskAi).not.toHaveBeenCalled();
  });

  it('disables input and button when loading', () => {
    render(<ChatInput {...defaultProps} isLoadingAi={true} question="Test" />);
    
    const input = screen.getByPlaceholderText('ask_placeholder');
    const button = screen.getByRole('button');
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('disables button when input is empty', () => {
    render(<ChatInput {...defaultProps} question="   " />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
