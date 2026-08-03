const BaseRepository = require('./baseRepository');
const User = require('../models/User');
const { normalizeVietnamesePhone } = require('../utils/phone');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByIdentifier(identifier, includePassword = false) {
    const rawIdentifier = String(identifier || '').trim();
    const phone = normalizeVietnamesePhone(rawIdentifier);
    const identifiers = [];
    if (phone) identifiers.push({ phone });
    if (rawIdentifier.includes('@')) identifiers.push({ email: rawIdentifier.toLowerCase() });
    if (!identifiers.length) return null;
    const query = User.findOne({
      isDeleted: false,
      $or: identifiers,
    });
    if (includePassword) query.select('+password');
    const user = await query;
    return user;
  }

  async findByEmail(email) {
    if (!email) return null;
    return User.findOne({ email: String(email).toLowerCase(), isDeleted: false });
  }

  async findByPhone(phone) {
    const normalized = normalizeVietnamesePhone(phone);
    if (!normalized) return null;
    return User.findOne({ phone: normalized, isDeleted: false });
  }

  async findByIdWithPassword(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('+password');
  }
}

module.exports = new UserRepository();
