import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import Checkout from './Checkout';

vi.mock('../api/orderApi', () => ({ orderApi: { create: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('Checkout payment confirmations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.requestAnimationFrame = (callback) => callback();
    Element.prototype.scrollIntoView = vi.fn();
    useAuth.mockReturnValue({
      user: {
        id: 'user-1',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    });
    useCart.mockReturnValue({
      cartItems: [{ id: 'phone-1', name: 'Phone', image: 'phone.png', price: 1000000, quantity: 1 }],
      cartCount: 1,
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      voucher: null,
      clearCart: vi.fn(),
    });
    orderApi.create.mockResolvedValue({ id: 'order-1' });
  });
  afterEach(cleanup);

  it.each([
    ['Ví điện tử MoMo', 'Thanh toán qua MoMo', 'momo'],
    ['Thẻ ngân hàng', 'Thanh toán bằng thẻ', 'card'],
  ])('confirms %s before creating the order', async (label, heading, value) => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe(value);
    expect(orderApi.create.mock.calls[0][0].note).toMatch(
      value === 'momo' ? /Ma giao dich MoMo:/ : /Da xac nhan thanh toan the/,
    );
  });
});
