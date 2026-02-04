import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from './LoginScreen';

// Mock dependencies
vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => ({
    isLoggingIn: false,
    setIsLoggingIn: vi.fn(),
  }),
}));

vi.mock('../store/useUIStore', () => ({
  useUIStore: () => ({
    showAlert: vi.fn(),
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state (Kakao login button)', () => {
    render(<LoginScreen />);
    
    // Check if Kakao login button is present
    expect(screen.getByText('login_kakao')).toBeInTheDocument();
    
    // Check if Email login button is present
    expect(screen.getByText('login_email_continue')).toBeInTheDocument();
  });

  it('switches to email mode when email button is clicked', () => {
    render(<LoginScreen />);
    
    const emailButton = screen.getByText('login_email_continue');
    fireEvent.click(emailButton);

    // Check if input fields are present
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    
    // Check if action buttons are present
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('switches back to initial mode when cancel is clicked', () => {
    render(<LoginScreen />);
    
    // Go to email mode
    fireEvent.click(screen.getByText('login_email_continue'));
    
    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should see Kakao login again
    expect(screen.getByText('login_kakao')).toBeInTheDocument();
  });
});
