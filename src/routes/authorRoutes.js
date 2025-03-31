const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest, authorValidationRules } = require('../middleware/validationMiddleware');
const {
  getAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getAuthorProfile,
  updateAuthorProfile
} = require('../controllers/authorController');

// Route base: /api/authors
router.route('/')
  .get(getAuthors)
  .post(
    protect,
    authorize('admin'),
    upload.single('avatar'),
    handleMulterError,
    checkSchema(authorValidationRules),
    validateRequest,
    createAuthor
  );

// Routes for /api/authors/:id
router.route('/:id')
  .get(getAuthor)
  .put(
    protect,
    authorize('admin', 'author'),
    upload.single('avatar'),
    handleMulterError,
    checkSchema(authorValidationRules),
    validateRequest,
    updateAuthor
  )
  .delete(protect, authorize('admin'), deleteAuthor);

router.route('/profile/me')
  .get(protect, getAuthorProfile)
  .put(
    protect,
    upload.single('avatar'),
    handleMulterError,
    updateAuthorProfile
  );

module.exports = router; 