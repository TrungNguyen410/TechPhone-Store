import { describe, expect, it } from 'vitest';
import { bestDeals, bestSellers, featuredAccessories } from './merchandising';

const item = (id, values = {}) => ({
  id,
  status: 'active',
  stock: 10,
  sold: 0,
  rating: 4,
  price: 100,
  oldPrice: 100,
  discountPercent: 0,
  ...values,
});

describe('homepage merchandising criteria', () => {
  it('sorts best sellers by sold quantity', () => {
    expect(bestSellers([item('a', { sold: 4 }), item('b', { sold: 20 })])[0].id).toBe('b');
  });

  it('only includes meaningful discounts and ranks by money saved', () => {
    const deals = bestDeals([
      item('small', { price: 80, oldPrice: 100, discountPercent: 20 }),
      item('large', { price: 900, oldPrice: 1200, discountPercent: 25 }),
      item('weak', { price: 95, oldPrice: 100, discountPercent: 5 }),
    ]);
    expect(deals.map(({ id }) => id)).toEqual(['large', 'small']);
  });

  it('uses rating and sales together for featured accessories', () => {
    const featured = featuredAccessories([
      item('popular', { rating: 4.6, sold: 200 }),
      item('rated', { rating: 4.9, sold: 30 }),
    ]);
    expect(featured[0].id).toBe('popular');
  });
});
