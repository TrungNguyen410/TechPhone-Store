import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Header from './Header';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock('../../hooks/useCart', () => ({ useCart: () => ({ cartCount: 0 }) }));
vi.mock('../../hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ hotline: '0900000000', storeName: 'TechPhone' }),
}));

describe('Header', () => {
  it('opens and closes the labelled mobile navigation', async () => {
    const user = userEvent.setup();
    render(<Header />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: /mở menu/i }));
    expect(screen.getByRole('navigation', { name: /điều hướng di động/i }).parentElement)
      .toHaveClass('open');

    await user.click(screen.getByRole('button', { name: /đóng menu/i }));
    expect(screen.getByRole('navigation', { name: /điều hướng di động/i }).parentElement)
      .not.toHaveClass('open');
  });
});
