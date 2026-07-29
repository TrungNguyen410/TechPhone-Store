import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import OrderManagement from './OrderManagement';

vi.mock('../../api/orderApi', () => ({ orderApi: { getAllAdmin: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const pendingOrder = {
  id: 'order-1',
  orderNumber: 'TP260601',
  createdAt: '2026-06-01T00:00:00Z',
  customer: {
    fullName: 'Nguyen Van A',
    phone: '0911111111',
    address: 'Test address',
  },
  items: [{
    id: 'item-1',
    name: 'Phone',
    image: 'phone.png',
    price: 1000000,
    quantity: 1,
  }],
  total: 1000000,
  status: 'pending',
  paymentMethod: 'momo',
};

describe('OrderManagement payment method', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    orderApi.getAllAdmin.mockResolvedValue([pendingOrder]);
  });

  it('shows payment method in the list and detail', async () => {
    const { container } = render(<OrderManagement />);
    expect(await screen.findByText('Ví điện tử MoMo')).toBeInTheDocument();
    fireEvent.click(container.querySelector('.table-view-button'));
    expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getAllByText('Ví điện tử MoMo')).toHaveLength(2);
  });

  it('offers only legal next states and restores the current state after a failed update', async () => {
    orderApi.updateStatus.mockRejectedValue(Object.assign(new Error('Transition rejected'), {
      friendlyMessage: 'Transition rejected',
    }));
    render(<OrderManagement />);

    const select = await screen.findByRole('combobox', { name: /trạng thái đơn TP260601/i });
    expect([...select.options].map((option) => option.value)).toEqual([
      'pending',
      'confirmed',
      'cancelled',
    ]);

    fireEvent.change(select, { target: { value: 'confirmed' } });
    expect(select).toBeDisabled();
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select).toHaveValue('pending');
  });
});
