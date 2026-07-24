import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import OrderManagement from './OrderManagement';

vi.mock('../../api/orderApi', () => ({ orderApi: { getAllAdmin: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));

describe('OrderManagement payment method', () => {
  it('shows payment method in the list and detail', async () => {
    orderApi.getAllAdmin.mockResolvedValue([{
      id: 'order-1', orderNumber: 'TP260601', createdAt: '2026-06-01T00:00:00Z',
      customer: { fullName: 'Nguyen Van A', phone: '0911111111', address: 'Test address' },
      items: [{ id: 'item-1', name: 'Phone', image: 'phone.png', price: 1000000, quantity: 1 }],
      total: 1000000, status: 'pending', paymentMethod: 'momo',
    }]);
    const { container } = render(<OrderManagement />);
    expect(await screen.findByText('Ví điện tử MoMo')).toBeInTheDocument();
    fireEvent.click(container.querySelector('.table-view-button'));
    expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getAllByText('Ví điện tử MoMo')).toHaveLength(2);
  });
});
