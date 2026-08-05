import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from '../../api/adminApi';
import CustomerManagement from './CustomerManagement';

vi.mock('../../api/adminApi', () => ({
  adminApi: { getCustomers: vi.fn(), updateCustomer: vi.fn() },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));

const customer = {
  id: 'customer-1',
  fullName: 'Nguyen Van A',
  email: 'customer@test.com',
  phone: '0911111111',
  createdAt: '2026-06-01T00:00:00Z',
  orderCount: 2,
  totalSpent: 2000000,
  status: 'active',
};

describe('CustomerManagement pagination', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getCustomers.mockResolvedValue({
      items: [customer],
      pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
  });

  it('renders paginated customers and loads the selected server page', async () => {
    render(<CustomerManagement />);

    expect(await screen.findByText(customer.fullName)).toBeInTheDocument();
    expect(screen.getByText('21 tài khoản')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));

    await waitFor(() => expect(adminApi.getCustomers).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
  });
});
