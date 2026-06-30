import { useEffect, useMemo, useState } from 'react';
import { FiFilter, FiHeadphones, FiSearch, FiX } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { accessoryApi } from '../api/accessoryApi';
import Loading from '../components/common/Loading';
import Pagination from '../components/common/Pagination';
import SearchBox from '../components/common/SearchBox';
import ProductGrid from '../components/product/ProductGrid';
import ProductSort from '../components/product/ProductSort';
import { useDebounce } from '../hooks/useDebounce';

const initialFilters = { brand: '', category: '', price: '' };
const PAGE_SIZE = 9;

export default function Accessories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    ...initialFilters,
    brand: searchParams.get('brand') || '',
    category: searchParams.get('category') || '',
  });
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [mobileFilter, setMobileFilter] = useState(false);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    accessoryApi.getAll().then(setAccessories).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (filters.brand) params.brand = filters.brand;
    if (filters.category) params.category = filters.category;
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [debouncedSearch, filters.brand, filters.category, setSearchParams]);

  const options = useMemo(
    () => ({
      brands: [...new Set(accessories.map((item) => item.brand).filter(Boolean))].sort(),
      categories: [...new Set(accessories.map((item) => item.category).filter(Boolean))].sort(),
    }),
    [accessories],
  );

  const filtered = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();
    const result = accessories.filter((accessory) => {
      const [minPrice, maxPrice] = filters.price ? filters.price.split('-').map(Number) : [0, Infinity];
      return (
        accessory.status === 'active' &&
        (!keyword || `${accessory.name} ${accessory.brand} ${accessory.category}`.toLowerCase().includes(keyword)) &&
        (!filters.brand || accessory.brand === filters.brand) &&
        (!filters.category || accessory.category === filters.category) &&
        (!filters.price || (accessory.price >= minPrice && accessory.price <= maxPrice))
      );
    });

    return result.sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'best-selling') return b.sold - a.sold;
      if (sort === 'rating') return b.rating - a.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [accessories, debouncedSearch, filters, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleAccessories = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loading />;

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-hero small">
          <div><span>Hoàn thiện trải nghiệm</span><h1>Phụ kiện chính hãng</h1></div>
          <p>Tai nghe, sạc nhanh, pin dự phòng và đồng hồ thông minh được chọn lọc cho thiết bị của bạn.</p>
        </div>

        <div className="catalog-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm phụ kiện theo tên, hãng hoặc loại..." />
          <button className="mobile-filter-button" onClick={() => setMobileFilter(true)}><FiFilter /> Bộ lọc</button>
          <ProductSort value={sort} onChange={(value) => { setSort(value); setPage(1); }} />
        </div>

        <div className="catalog-layout">
          <div className={`filter-mobile-wrap ${mobileFilter ? 'open' : ''}`}>
            <button className="filter-mobile-close" onClick={() => setMobileFilter(false)}><FiX /></button>
            <aside className="product-filter">
              <div className="filter-heading">
                <h3>Bộ lọc phụ kiện</h3>
                <button onClick={() => setFilters(initialFilters)}>Đặt lại</button>
              </div>
              <div className="filter-group">
                <label>Thương hiệu</label>
                <select value={filters.brand} onChange={(event) => { setFilters({ ...filters, brand: event.target.value }); setPage(1); }}>
                  <option value="">Tất cả thương hiệu</option>
                  {options.brands.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Loại phụ kiện</label>
                <select value={filters.category} onChange={(event) => { setFilters({ ...filters, category: event.target.value }); setPage(1); }}>
                  <option value="">Tất cả loại phụ kiện</option>
                  {options.categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Khoảng giá</label>
                <select value={filters.price} onChange={(event) => { setFilters({ ...filters, price: event.target.value }); setPage(1); }}>
                  <option value="">Tất cả mức giá</option>
                  <option value="0-1000000">Dưới 1 triệu</option>
                  <option value="1000000-3000000">1 - 3 triệu</option>
                  <option value="3000000-7000000">3 - 7 triệu</option>
                  <option value="7000000-999999999">Trên 7 triệu</option>
                </select>
              </div>
            </aside>
          </div>
          {mobileFilter && <div className="drawer-overlay" onClick={() => setMobileFilter(false)} />}
          <div className="catalog-results">
            <div className="result-count"><FiSearch /> Tìm thấy <strong>{filtered.length}</strong> phụ kiện</div>
            <ProductGrid products={visibleAccessories} type="accessory" />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        <section className="benefit-grid">
          <div><FiHeadphones /><span><strong>Phụ kiện tương thích</strong><small>Chọn đúng chuẩn cho từng thiết bị</small></span></div>
          <div><FiSearch /><span><strong>Dễ lọc, dễ so sánh</strong><small>Theo hãng, loại và khoảng giá</small></span></div>
        </section>
      </div>
    </main>
  );
}
