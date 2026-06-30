const BaseCrudService = require('./baseCrudService');
const CatalogService = require('./catalogService');
const TaxonomyService = require('./taxonomyService');
const accessoryRepository = require('../repositories/accessoryRepository');
const bannerRepository = require('../repositories/bannerRepository');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');
const contactRepository = require('../repositories/contactRepository');
const productRepository = require('../repositories/productRepository');
const settingRepository = require('../repositories/settingRepository');

module.exports = {
  productService: new CatalogService(productRepository),
  accessoryService: new CatalogService(accessoryRepository),
  categoryService: new TaxonomyService(categoryRepository),
  brandService: new TaxonomyService(brandRepository),
  bannerService: new BaseCrudService(bannerRepository),
  contactService: new BaseCrudService(contactRepository),
  settingService: new BaseCrudService(settingRepository),
};
