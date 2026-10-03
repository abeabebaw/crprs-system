const prisma = require('../config/prisma');

// Get all business rules
exports.getAll = async (req, res, next) => {
  try {
    const rules = await prisma.businessRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
};

// Create a new business rule
exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    const rule = await prisma.businessRule.create({
      data: {
        ruleName: data.ruleName,
        landUse: data.landUse,
        minParcelSizeSqm: data.minParcelSizeSqm,
        maxParcelSizeSqm: data.maxParcelSizeSqm,
        minLeasePeriodYears: data.minLeasePeriodYears,
        maxLeasePeriodYears: data.maxLeasePeriodYears,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
};

// Update an existing business rule
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const rule = await prisma.businessRule.update({
      where: { id },
      data: {
        ruleName: data.ruleName,
        landUse: data.landUse,
        minParcelSizeSqm: data.minParcelSizeSqm,
        maxParcelSizeSqm: data.maxParcelSizeSqm,
        minLeasePeriodYears: data.minLeasePeriodYears,
        maxLeasePeriodYears: data.maxLeasePeriodYears,
        isActive: data.isActive
      }
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
};

// Delete a business rule
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.businessRule.delete({
      where: { id }
    });
    res.json({ message: 'Business rule deleted successfully' });
  } catch (err) {
    next(err);
  }
};
