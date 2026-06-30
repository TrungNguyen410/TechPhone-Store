const BaseCrudService = require('./baseCrudService');
const slugify = require('../utils/slugify');

class TaxonomyService extends BaseCrudService {
  async create(payload) {
    return this.repository.create({
      ...payload,
      slug: payload.slug || slugify(payload.name),
    });
  }

  async update(id, payload) {
    const nextPayload = { ...payload };
    if (payload.name && !payload.slug) nextPayload.slug = slugify(payload.name);
    return this.repository.update(id, nextPayload);
  }
}

module.exports = TaxonomyService;
