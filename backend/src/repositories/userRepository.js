const BaseRepository = require('./baseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByIdentifier(identifier, includePassword = false) {
    const query = User.findOne({
      isDeleted: false,
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
    if (includePassword) query.select('+password');
    const user = await query;
    return user;
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase(), isDeleted: false });
  }

  async findByPhone(phone) {
    return User.findOne({ phone, isDeleted: false });
  }

  async findByIdWithPassword(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('+password');
  }
}

module.exports = new UserRepository();
