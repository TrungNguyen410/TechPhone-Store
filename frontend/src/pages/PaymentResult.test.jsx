import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import PaymentResult from './PaymentResult';

describe('PaymentResult', () => {
  afterEach(() => sessionStorage.clear());

  it('does not claim a real payment is paid before server confirmation', () => {
    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF01']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'VNPay đã tiếp nhận giao dịch' })).toBeInTheDocument();
    expect(screen.getByText(/đang chờ VNPay gửi xác nhận máy chủ/i)).toBeInTheDocument();
  });

  it('warns when the return signature is invalid', () => {
    render(
      <MemoryRouter initialEntries={['/payment-result?valid=false&code=00&reference=REF02']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Giao dịch chưa hoàn tất' })).toBeInTheDocument();
    expect(screen.getByText(/chữ ký phản hồi không hợp lệ/i)).toBeInTheDocument();
  });
});
