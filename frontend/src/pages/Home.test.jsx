import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accessoryApi } from '../api/accessoryApi';
import { bannerApi } from '../api/bannerApi';
import { productApi } from '../api/productApi';
import Home from './Home';

vi.mock('../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../api/bannerApi', () => ({ bannerApi: { getAll: vi.fn() } }));
vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../components/common/Loading', () => ({ default: () => <p>Loading</p> }));
vi.mock('../components/common/EmptyState', () => ({
  default: ({ title, description }) => <div><h1>{title}</h1><p>{description}</p></div>,
}));
vi.mock('../components/product/ProductGrid', () => ({ default: () => <div>Product grid</div> }));

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a retry action when home data cannot be loaded', async () => {
    productApi.getAll.mockRejectedValueOnce(new Error('Network unavailable'));
    accessoryApi.getAll.mockResolvedValue([]);
    bannerApi.getAll.mockResolvedValue([]);

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Không thể tải trang chủ' })).toBeInTheDocument();
    expect(screen.getByText('Không thể tải dữ liệu trang chủ. Vui lòng thử lại.')).toBeInTheDocument();

    productApi.getAll.mockResolvedValueOnce([]);
    accessoryApi.getAll.mockResolvedValueOnce([]);
    bannerApi.getAll.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findAllByText('Product grid')).toHaveLength(3);
    expect(productApi.getAll).toHaveBeenCalledTimes(2);
  });
});
