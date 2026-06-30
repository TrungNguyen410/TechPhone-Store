const AppError = require('../utils/AppError');

class BaseCrudService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(_query = {}) {
    return this.repository.findAll();
  }

  async getById(id) {
    const resource = await this.repository.findById(id);
    if (!resource) throw new AppError('Resource not found', 404);
    return resource;
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

module.exports = BaseCrudService;
