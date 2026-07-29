import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import Checkout from './Checkout';

vi.mock('../api/orderApi', () => ({ orderApi: { create: vi.fn() } }));
vi.mock('../api/paymentApi', () => ({
  paymentApi: {
    createVnpayCheckout: vi.fn(),
    getConfig: vi.fn(),
  },
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('Checkout payment confirmations', () => {
  const completeCurrentAddress = () => {
    fireEvent.change(screen.getByRole('combobox', { name: /Tỉnh\/thành phố/i }), {
      target: { value: 'TP. Hồ Chí Minh' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Phường\/xã\/đặc khu/i }), {
      target: { value: 'Bến Nghé' },
    });
  };

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
    paymentApi.getConfig.mockResolvedValue({ providers: { vnpay: { enabled: true } } });
    paymentApi.createVnpayCheckout.mockResolvedValue({
      order: {
        id: 'order-vnpay',
        orderNumber: 'TP26072801',
        customer: { phone: '0911111111' },
      },
      transaction: { reference: 'TP26072801REF' },
      paymentUrl: '/payment-result?valid=true&code=00&mock=true',
    });
  });
  afterEach(cleanup);

  it('confirms MoMo before creating the order', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(screen.getByRole('radio', { name: /Ví điện tử MoMo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));
    expect(await screen.findByRole('heading', { name: 'Thanh toán qua MoMo' })).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('momo');
    expect(orderApi.create.mock.calls[0][0].note).toMatch(/Ma giao dich MoMo:/);
  });

  it('redirects card payments to VNPay without rendering card inputs', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(await screen.findByRole('radio', { name: /VNPay/i }));
    expect(screen.queryByLabelText(/Số thẻ/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán qua VNPay' }));

    await waitFor(() => expect(paymentApi.createVnpayCheckout).toHaveBeenCalledTimes(1));
    expect(paymentApi.createVnpayCheckout.mock.calls[0][0].paymentMethod).toBe('card');
    expect(orderApi.create).not.toHaveBeenCalled();
  });
});
