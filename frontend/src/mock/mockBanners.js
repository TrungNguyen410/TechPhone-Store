// Anh banner that nam trong `frontend/public/banners`, dung chung voi seed backend
// (xem `backend/src/seed/seed.js`) de mock va API that hien thi giong nhau.
export const mockBanners = [
  {
    id: 'banner-1',
    title: 'Thu cũ đổi mới',
    description: 'Trợ giá đến 4.000.000₫ khi lên đời flagship',
    image: '/banners/thu-cu-doi-moi.svg',
    link: '/products',
    active: true,
  },
  {
    id: 'banner-2',
    title: 'Sale giữa năm',
    description: 'Giảm đến 30% điện thoại và phụ kiện',
    image: '/banners/sale-giua-nam.svg',
    link: '/products',
    active: true,
  },
  {
    id: 'banner-3',
    title: 'Combo phụ kiện',
    description: 'Mua tai nghe kèm sạc nhanh, tiết kiệm thêm 15%',
    image: '/banners/combo-phu-kien.svg',
    link: '/accessories',
    active: true,
  },
];
