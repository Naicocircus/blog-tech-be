const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getComment,
  updateComment,
  deleteComment,
  approveComment
} = require('../controllers/commentController');

// Rotte per i commenti specifici
router.route('/:id')
  .get(getComment)
  .put(protect, updateComment)
  .delete(protect, deleteComment);

// Rotta per approvare/disapprovare commenti (solo admin)
router.route('/:id/approve')
  .put(protect, authorize('admin'), approveComment);

module.exports = router; 