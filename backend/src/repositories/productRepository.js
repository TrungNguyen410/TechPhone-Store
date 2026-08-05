const BaseRepository = require('./baseRepository');
const Product = require('../models/Product');

class ProductRepository extends BaseRepository {
  async findOne(filter = {}) {
    const product = await this.model.findOne({ ...filter, isDeleted: false });
    return product?.toJSON();
  }
}

module.exports = new ProductRepository(Product);
