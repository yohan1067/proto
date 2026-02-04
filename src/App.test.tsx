import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // 간단히 앱이 렌더링되는지만 확인 (실제 콘텐츠에 따라 구체적인 텍스트 확인 가능)
    // 현재 App.tsx 내용을 모르므로 body가 존재하는지 정도로 확인
    expect(document.body).toBeInTheDocument();
  });
});
