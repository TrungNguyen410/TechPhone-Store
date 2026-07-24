const activeAndAvailable = (item) => item.status === 'active' && item.stock > 0;

export const bestSellers = (items, limit = 8) =>
  [...items]
    .filter(activeAndAvailable)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);

export const bestDeals = (items, limit = 8) =>
  [...items]
    .filter((item) =>
      activeAndAvailable(item)
      && item.oldPrice > item.price
      && item.discountPercent >= 10)
    .sort((a, b) => {
      const savingDifference = (b.oldPrice - b.price) - (a.oldPrice - a.price);
      return savingDifference || b.discountPercent - a.discountPercent;
    })
    .slice(0, limit);

export const featuredAccessories = (items, limit = 8) => {
  const eligible = items.filter((item) =>
    activeAndAvailable(item) && item.rating >= 4.5 && item.sold >= 20);

  return [...eligible]
    .sort((a, b) => (b.rating * 100 + b.sold) - (a.rating * 100 + a.sold))
    .slice(0, limit);
};
