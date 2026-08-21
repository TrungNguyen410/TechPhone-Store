import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accessoryApi } from '../api/accessoryApi';
import { productApi } from '../api/productApi';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { AuthContext } from '../context/AuthContext';
import Favorites from './Favorites';

vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../components/product/ProductGrid', () => ({
  default: ({ products }) => <div>{products.map((item) => <span key={item.id}>{item.name}</span>)}</div>,
}));

describe('Favorites page', () => {
  afterEach(() => {
    cleanup();
    storage.remove(STORAGE_KEYS.wishlist);
  });

  it('shows saved products and accessories in one place', async () => {
    storage.set(STORAGE_KEYS.wishlist, ['phone-1', 'accessory-1']);
    productApi.getAll.mockResolvedValue([{ id: 'phone-1', name: 'Saved Phone' }]);
    accessoryApi.getAll.mockResolvedValue([{ id: 'accessory-1', name: 'Saved Earbuds' }]);

    render(<MemoryRouter><Favorites /></MemoryRouter>);
    expect(await screen.findByText('Saved Phone')).toBeInTheDocument();
    expect(screen.getByText('Saved Earbuds')).toBeInTheDocument();
  });

  it('shows a retryable error instead of an empty wishlist when catalog loading fails', async () => {
    productApi.getAll.mockRejectedValue(new Error('Catalog offline'));
    accessoryApi.getAll.mockResolvedValue([]);

    render(<MemoryRouter><Favorites /></MemoryRouter>);
    expect(await screen.findByText('Catalog offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    expect(screen.queryByText('Chưa có sản phẩm yêu thích')).not.toBeInTheDocument();
  });

  it('drops wishlist ids whose product no longer exists so the count matches what is shown', async () => {
    // San pham da bi xoa van ton dong trong wishlist -> badge dem 2 nhung chi hien 1.
    storage.set(STORAGE_KEYS.wishlist, ['phone-1', 'phone-deleted']);
    productApi.getAll.mockResolvedValue([{ id: 'phone-1', name: 'Saved Phone' }]);
    accessoryApi.getAll.mockResolvedValue([]);
    const setWishlist = vi.fn().mockResolvedValue(['phone-1']);

    render(
      <AuthContext.Provider value={{ user: null, setWishlist }}>
        <MemoryRouter><Favorites /></MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Saved Phone')).toBeInTheDocument();
    await waitFor(() => expect(setWishlist).toHaveBeenCalledWith(['phone-1']));
    expect(screen.getByText(/1 sản phẩm đang được lưu/)).toBeInTheDocument();
  });

  it('keeps ids that still resolve to a catalog entry', async () => {
    storage.set(STORAGE_KEYS.wishlist, ['phone-1', 'accessory-1']);
    productApi.getAll.mockResolvedValue([{ id: 'phone-1', name: 'Saved Phone' }]);
    accessoryApi.getAll.mockResolvedValue([{ id: 'accessory-1', name: 'Saved Earbuds' }]);
    const setWishlist = vi.fn();

    render(
      <AuthContext.Provider value={{ user: null, setWishlist }}>
        <MemoryRouter><Favorites /></MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Saved Phone')).toBeInTheDocument();
    expect(setWishlist).not.toHaveBeenCalled();
  });
});
