const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { uploadImage, deleteImage } = require('../controllers/uploadController');

// Route per l'upload di un'immagine
router.post('/', upload.single('image'), handleMulterError, uploadImage);

// Route per l'eliminazione di un'immagine
router.delete('/:public_id', deleteImage);

module.exports = router; 