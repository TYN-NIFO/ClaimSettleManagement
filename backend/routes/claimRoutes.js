const express = require('express');
const router = express.Router();
const {
  getAllClaims,
  getClaimById,
  createClaim,
  updateClaim,
  deleteClaim,
  getClaimStats
} = require('../controllers/claimController');

// GET /api/claims - Get all claims with pagination and filtering
router.get('/', getAllClaims);

// GET /api/claims/stats - Get claim statistics
router.get('/stats', getClaimStats);

// GET /api/claims/:id - Get single claim by ID
router.get('/:id', getClaimById);

// POST /api/claims - Create new claim
router.post('/', createClaim);

// PUT /api/claims/:id - Update claim
router.put('/:id', updateClaim);

// DELETE /api/claims/:id - Delete claim
router.delete('/:id', deleteClaim);

module.exports = router;
