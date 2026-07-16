import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from './AppRoutes';

vi.mock('../components/common/Header', () => ({ default: () => <header>Store header</header> }));
vi.mock('../components/common/Footer', () => ({ default: () => <footer>Store footer</footer> }));
vi.mock('../pages/ProductDetail', () => ({ default: () => <h1>Product detail route</h1> }));

describe('AppRoutes', () => {
  it('keeps the product detail route available', async () => {
    render(
      <MemoryRouter initialEntries={['/products/product-1']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Product detail route' })).toBeInTheDocument();
  });
});
