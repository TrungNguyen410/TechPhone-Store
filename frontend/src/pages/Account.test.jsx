import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Account from './Account';

const { authMock, orderApiMock } = vi.hoisted(() => ({
  authMock: {
    changePassword: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    user: {
      address: '1 Main Street',
      email: 'user@test.com',
      fullName: 'Test User',
      id: 'u1',
      phone: '0912345678',
    },
  },
  orderApiMock: {
    cancel: vi.fn(),
    getMyOrders: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => authMock }));
vi.mock('../hooks/useCart', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock('../api/orderApi', () => ({ orderApi: orderApiMock }));
vi.mock('../components/order/OrderLookupPanel', () => ({ default: () => null }));
vi.mock('../components/common/ConfirmModal', () => ({ default: () => null }));
vi.mock('../components/common/EmptyState', () => ({ default: () => null }));
vi.mock('../components/common/Loading', () => ({ default: () => null }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('Account profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.updateProfile.mockResolvedValue(authMock.user);
    orderApiMock.getMyOrders.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps email read-only and omits it from the profile update payload', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Account /></MemoryRouter>);

    expect(screen.getByLabelText('Email *')).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(authMock.updateProfile).toHaveBeenCalledWith({
      address: '1 Main Street',
      fullName: 'Test User',
      phone: '0912345678',
    });
  });
});
