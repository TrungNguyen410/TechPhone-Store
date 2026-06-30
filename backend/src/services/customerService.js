const Order = require('../models/Order');
const User = require('../models/User');
const AppError = require('../utils/AppError');

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
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'customer', isDeleted: false },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!user) throw new AppError('Customer not found', 404);
    return user.toJSON();
  }
}

module.exports = new CustomerService();
