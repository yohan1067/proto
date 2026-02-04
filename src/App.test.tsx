import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    // 간단히 앱이 렌더링되는지만 확인 (실제 콘텐츠에 따라 구체적인 텍스트 확인 가능)
    expect(document.body).toBeInTheDocument();
  });
});
