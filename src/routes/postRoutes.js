const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest, postValidationRules } = require('../middleware/validationMiddleware');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getPostsByAuthor,
  likePost,
  reactToPost,
  getPostReactions,
  trackShare,
  getShareStats
} = require('../controllers/postController');
const {
  getComments,
  createComment
} = require('../controllers/commentController');

// Route base: /api/posts
router.route('/')
  .get(getPosts)
  .post(
    protect, 
    authorize('admin', 'author'),
    createPost
  );

// Routes for /api/posts/:id
router.route('/:id')
  .get(getPost)
  .put(
    protect,
    authorize('admin', 'author'),
    checkSchema(postValidationRules),
    validateRequest,
    updatePost
  )
  .delete(protect, authorize('admin', 'author'), deletePost);

// Route for /api/posts/author/:authorId
router.route('/author/:authorId')
  .get(getPostsByAuthor);

// Rotte per i commenti di un post
router.route('/:postId/comments')
  .get(getComments)
  .post(protect, createComment);

// Rotte per i like e le reazioni
router.route('/:id/like')
  .post(protect, likePost);

router.route('/:id/react')
  .post(protect, reactToPost);

router.route('/:id/reactions')
  .get(getPostReactions);

// Rotte per le condivisioni
router.route('/:id/share')
  .post(trackShare);

router.route('/:id/shares')
  .get(getShareStats);

module.exports = router; 