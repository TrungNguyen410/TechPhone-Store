export const APP_NAME = 'TechPhone';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const STORAGE_KEYS = {
  token: 'token',
  currentUser: 'currentUser',
  cart: 'cart_items',
  voucher: 'cart_voucher',
  wishlist: 'wishlist_items',
  mockUsers: 'mock_users',
  mockProducts: 'mock_products',
  mockAccessories: 'mock_accessories',
  mockOrders: 'mock_orders',
  mockReviews: 'mock_reviews',
  mockVouchers: 'mock_vouchers',
  mockBanners: 'mock_banners',
  mockSettings: 'mock_settings',
  mockCategories: 'mock_categories',
  mockBrands: 'mock_brands',
  mockContacts: 'mock_contacts',
  mockOtpRequests: 'mock_otp_requests',
};

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { value: 'bank', label: 'Chuyển khoản ngân hàng' },
  { value: 'momo', label: 'Ví điện tử MoMo' },
  { value: 'card', label: 'Thẻ ngân hàng' },
];

export const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
