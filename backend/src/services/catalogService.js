const AppError = require('../utils/AppError');
const { buildRegex, parsePagination } = require('../utils/query');

const sortMap = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'best-selling': { sold: -1 },
  rating: { rating: -1 },
};

class CatalogService {
  constructor(repository) {
    this.repository = repository;
  }

  buildFilter(query = {}) {
    const filter = {};
    const keyword = query.q || query.search || query.keyword;
    if (keyword) {
      const regex = buildRegex(keyword);
      filter.$or = [{ name: regex }, { brand: regex }, { category: regex }];
    }
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;
    if (query.status) filter.status = query.status;
    return filter;
  }

  async list(query = {}) {
    const filter = this.buildFilter(query);
    const pagination = parsePagination(query);
    const sort = sortMap[query.sort] || sortMap.newest;

    if (!pagination) {
      return this.repository.findAll(filter, { sort });
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.repository.findAll(filter, { sort, skip, limit: pagination.limit }),
      this.repository.count(filter),
    ]);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError('Resource not found', 404);
    return item;
  }

  async create(payload) {
    return this.repository.create(payload);
  }

  async update(id, payload) {
    return this.repository.update(id, payload);
  }

  async remove(id) {
    return this.repository.softDelete(id);
  }
}

module.exports = CatalogService;
