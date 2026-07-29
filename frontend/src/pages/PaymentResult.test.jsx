import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCart } from '../hooks/useCart';
import PaymentResult from './PaymentResult';

vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));

describe('PaymentResult', () => {
  const clearCart = vi.fn();

  beforeEach(() => {
    clearCart.mockClear();
    useCart.mockReturnValue({ clearCart });
  });
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('does not claim a real payment is paid before server confirmation', () => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'REF01',
        createdAt: Date.now(),
      }),
    );
    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF01']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'VNPay đã tiếp nhận giao dịch' })).toBeInTheDocument();
    expect(screen.getByText(/đang chờ VNPay gửi xác nhận máy chủ/i)).toBeInTheDocument();
    expect(clearCart).toHaveBeenCalledTimes(1);
  });

  it('warns when the return signature is invalid', () => {
    render(
      <MemoryRouter initialEntries={['/payment-result?valid=false&code=00&reference=REF02']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Giao dịch chưa hoàn tất' })).toBeInTheDocument();
    expect(screen.getByText(/chữ ký phản hồi không hợp lệ/i)).toBeInTheDocument();
    expect(clearCart).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('cleans pending storage only after a server-verified success', () => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'REF03',
        createdAt: Date.now(),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF03&mock=true']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(clearCart).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('techphone_pending_payment')).toBeNull();
  });

  it('keeps the cart when a verified callback does not match the pending reference', () => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'ANOTHER-REFERENCE',
        createdAt: Date.now(),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF04']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(clearCart).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('keeps the cart and pending payment after a cancelled callback', () => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'REF05',
        createdAt: Date.now(),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=24&reference=REF05']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(clearCart).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('techphone_pending_payment')).not.toBeNull();
    expect(screen.getByRole('link', { name: /thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('keeps the cart and pending payment after a stale success callback', () => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'REF06',
        createdAt: Date.now() - (3 * 60 * 60 * 1000),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF06']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(clearCart).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('techphone_pending_payment')).not.toBeNull();
    expect(screen.getByRole('link', { name: /thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('survives malformed pending payment storage without clearing the cart', () => {
    sessionStorage.setItem('techphone_pending_payment', '{broken');

    expect(() => render(
      <MemoryRouter initialEntries={['/payment-result?valid=false&code=24']}>
        <PaymentResult />
      </MemoryRouter>,
    )).not.toThrow();
    expect(clearCart).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('techphone_pending_payment')).toBe('{broken');
  });
});
