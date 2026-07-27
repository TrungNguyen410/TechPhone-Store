import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaxonomyManagement from './TaxonomyManagement';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));
const api = () => ({
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
});

describe('TaxonomyManagement', () => {
  afterEach(cleanup);

  it('shows logo and description fields for brands', async () => {
    render(<TaxonomyManagement api={api()} type="brand" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm thương hiệu/i }));
    expect(screen.getByText('Logo thương hiệu')).toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });

  it('omits logo for categories', async () => {
    render(<TaxonomyManagement api={api()} type="category" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm danh mục/i }));
    expect(screen.queryByText('Logo thương hiệu')).not.toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });
});
