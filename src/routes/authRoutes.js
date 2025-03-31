const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const passport = require('../config/googleAuth');
const { protect } = require('../middleware/auth');
const {
    register,
    login,
    getMe,
    logout,
    updateProfile,
    changePassword,
    uploadAvatar
} = require('../controllers/authController');
const { validateRequest, userValidationRules, loginValidationRules } = require('../middleware/validationMiddleware');

router.post('/register', checkSchema(userValidationRules), validateRequest, register);
router.post('/login', checkSchema(loginValidationRules), validateRequest, login);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/upload-avatar', protect, uploadAvatar);

// Rotte Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Genera il token JWT
    const token = req.user.getSignedJwtToken();
    res.redirect(`https://blog-tech-eight.vercel.app/auth/google/success?token=${token}`);
  }
);

module.exports = router; 