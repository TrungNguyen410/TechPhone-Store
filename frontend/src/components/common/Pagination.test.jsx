import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
  afterEach(cleanup);

  it('announces the current page', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Trang 1' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
