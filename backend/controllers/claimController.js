const Claim = require('../models/Claim');

// Get all claims
const getAllClaims = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, claimType, sortBy = 'filedDate', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (claimType) filter.claimType = claimType;
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const claims = await Claim.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const count = await Claim.countDocuments(filter);
    
    res.json({
      claims,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalClaims: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching claims', message: error.message });
  }
};

// Get single claim by ID
const getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching claim', message: error.message });
  }
};

// Create new claim
const createClaim = async (req, res) => {
  try {
    const claim = new Claim(req.body);
    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Claim number already exists' });
    }
    res.status(400).json({ error: 'Error creating claim', message: error.message });
  }
};

// Update claim
const updateClaim = async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    res.status(400).json({ error: 'Error updating claim', message: error.message });
  }
};

// Delete claim
const deleteClaim = async (req, res) => {
  try {
    const claim = await Claim.findByIdAndDelete(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json({ message: 'Claim deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting claim', message: error.message });
  }
};

// Get claim statistics
const getClaimStats = async (req, res) => {
  try {
    const stats = await Claim.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$claimAmount' }
        }
      }
    ]);
    
    const totalClaims = await Claim.countDocuments();
    const totalAmount = await Claim.aggregate([
      { $group: { _id: null, total: { $sum: '$claimAmount' } } }
    ]);
    
    res.json({
      statusStats: stats,
      totalClaims,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching statistics', message: error.message });
  }
};

module.exports = {
  getAllClaims,
  getClaimById,
  createClaim,
  updateClaim,
  deleteClaim,
  getClaimStats
};
