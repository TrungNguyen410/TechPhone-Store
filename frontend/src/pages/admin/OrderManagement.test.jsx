import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import OrderManagement from './OrderManagement';

vi.mock('../../api/orderApi', () => ({ orderApi: { getAllAdmin: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('../../api/paymentApi', () => ({ paymentApi: { reconcileManualPayment: vi.fn() } }));
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
  paymentStatus: 'pending',
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

  it('renders reconciliation actions only for eligible bank and MoMo payments', async () => {
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    expect(screen.getByRole('button', { name: /confirm paid payment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark payment failed/i })).toBeInTheDocument();

    cleanup();
    orderApi.getAllAdmin.mockResolvedValue([{
      ...pendingOrder,
      id: 'card-order',
      orderNumber: 'TP260602',
      paymentMethod: 'card',
    }]);
    const cardView = render(<OrderManagement />);
    await screen.findByText('TP260602');
    fireEvent.click(cardView.container.querySelector('.table-view-button'));
    expect(screen.queryByRole('button', { name: /confirm paid payment/i })).not.toBeInTheDocument();
  });

  it('requires a reference for paid and sends only the bounded reconciliation payload', async () => {
    paymentApi.reconcileManualPayment.mockResolvedValue({
      ...pendingOrder,
      paymentStatus: 'paid',
      paymentReference: 'MOMO-REF-01',
      status: 'confirmed',
      paymentAudit: {
        confirmedBy: 'admin-1',
        confirmedAt: '2026-08-05T10:00:00.000Z',
        note: 'Matched MoMo statement',
      },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    fireEvent.click(screen.getByRole('button', { name: /confirm paid payment/i }));
    expect(paymentApi.reconcileManualPayment).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/payment reference/i), {
      target: { value: ' MOMO-REF-01 ' },
    });
    fireEvent.change(screen.getByLabelText(/reconciliation note/i), {
      target: { value: 'Matched MoMo statement' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm paid payment/i }));

    await waitFor(() => expect(paymentApi.reconcileManualPayment).toHaveBeenCalledWith(
      pendingOrder.id,
      {
        status: 'paid',
        reference: 'MOMO-REF-01',
        note: 'Matched MoMo statement',
      },
    ));
  });

  it('allows a failed reconciliation without a reference', async () => {
    paymentApi.reconcileManualPayment.mockResolvedValue({
      ...pendingOrder,
      paymentStatus: 'failed',
      paymentAudit: {
        confirmedBy: 'admin-1',
        confirmedAt: '2026-08-05T10:00:00.000Z',
        note: '',
      },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));
    fireEvent.click(screen.getByRole('button', { name: /mark payment failed/i }));

    await waitFor(() => expect(paymentApi.reconcileManualPayment).toHaveBeenCalledWith(
      pendingOrder.id,
      { status: 'failed', reference: '', note: '' },
    ));
  });

  it('shows finalized audit data read-only and hides reconciliation actions', async () => {
    orderApi.getAllAdmin.mockResolvedValue([{
      ...pendingOrder,
      paymentStatus: 'paid',
      paymentReference: 'MOMO-AUDIT-01',
      paymentAudit: {
        confirmedBy: 'admin-auditor',
        confirmedAt: '2026-08-05T10:00:00.000Z',
        note: 'Matched statement row 42',
      },
    }]);
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    expect(screen.getByText('MOMO-AUDIT-01')).toBeInTheDocument();
    expect(screen.getByText('admin-auditor')).toBeInTheDocument();
    expect(screen.getByText('Matched statement row 42')).toBeInTheDocument();
    expect(screen.queryByLabelText(/payment reference/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm paid payment/i })).not.toBeInTheDocument();
  });
});
