import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
  }),
}));
vi.mock('../utils/constants', () => ({ USE_MOCK: false }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('Login', () => {
  it('does not expose demo admin credentials when mock mode is disabled', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.queryByText(/admin@gmail\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });
});
