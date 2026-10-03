const prisma = require('../config/prisma');

// Get all configurations, optionally filtered by type
exports.getAll = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = type ? { configType: type } : {};
    const configs = await prisma.systemConfiguration.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    res.json(configs);
  } catch (err) {
    next(err);
  }
};

// Create a new configuration
exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    const config = await prisma.systemConfiguration.create({
      data: {
        configType: data.configType,
        data: data.data,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
    res.status(201).json(config);
  } catch (err) {
    next(err);
  }
};

// Update an existing configuration
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const config = await prisma.systemConfiguration.update({
      where: { id },
      data: {
        configType: data.configType,
        data: data.data,
        isActive: data.isActive
      }
    });
    res.json(config);
  } catch (err) {
    next(err);
  }
};

// Delete a configuration
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.systemConfiguration.delete({
      where: { id }
    });
    res.json({ message: 'Configuration deleted successfully' });
  } catch (err) {
    next(err);
  }
};
