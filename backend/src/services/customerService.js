const Order = require('../models/Order');
const User = require('../models/User');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const customerUpdateFields = ['fullName', 'email', 'phone', 'address', 'role', 'status'];

class CustomerService {
  async list() {
    const [customers, orders] = await Promise.all([
      User.find({ isDeleted: false, role: 'customer' }).sort({ createdAt: -1 }),
      Order.find({ isDeleted: false }),
    ]);

    return customers.map((customer) => {
      const user = customer.toJSON();
      const userOrders = orders.filter((order) => order.userId === user.id);
      return {
        ...user,
        orderCount: userOrders.length,
        totalSpent: userOrders
          .filter((order) => ['completed', 'delivered'].includes(order.status))
          .reduce((sum, order) => sum + order.total, 0),
      };
    });
  }

  async update(id, payload) {
    const dto = pick(payload, customerUpdateFields);
    if (Object.keys(dto).length === 0) throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
    const existing = await userRepository.findById(id);
    if (!existing || existing.role !== 'customer') throw new AppError('Không tìm thấy khách hàng', 404);
    return userRepository.update(id, dto);
  }
}

module.exports = new CustomerService();
