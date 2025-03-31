const Author = require('../models/Author');
const cloudinary = require('../config/cloudinary');

// @desc    Get all authors
// @route   GET /api/authors
// @access  Public
const getAuthors = async (req, res) => {
  try {
    const authors = await Author.find();
    res.status(200).json({
      success: true,
      count: authors.length,
      data: authors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single author
// @route   GET /api/authors/:id
// @access  Public
const getAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Autore non trovato'
      });
    }

    res.status(200).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new author
// @route   POST /api/authors
// @access  Private
const createAuthor = async (req, res) => {
  try {
    let avatarUrl = req.body.avatar;
    
    // Se è stato caricato un file per l'avatar
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blog-tech/authors',
        use_filename: true
      });
      avatarUrl = result.secure_url;
    }

    const author = await Author.create({
      ...req.body,
      avatar: avatarUrl
    });

    res.status(201).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update author
// @route   PUT /api/authors/:id
// @access  Private
const updateAuthor = async (req, res) => {
  try {
    let author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Autore non trovato'
      });
    }

    let updateData = req.body;

    // Se è stato caricato un nuovo avatar
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blog-tech/authors',
        use_filename: true
      });
      updateData.avatar = result.secure_url;
    }

    author = await Author.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete author
// @route   DELETE /api/authors/:id
// @access  Private
const deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Autore non trovato'
      });
    }

    await author.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get author profile
// @route   GET /api/authors/profile/me
// @access  Private
const getAuthorProfile = async (req, res) => {
  try {
    const author = await Author.findById(req.user.id);
    
    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Profilo autore non trovato'
      });
    }

    res.status(200).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update author profile
// @route   PUT /api/authors/profile/me
// @access  Private
const updateAuthorProfile = async (req, res) => {
  try {
    let author = await Author.findById(req.user.id);
    
    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Profilo autore non trovato'
      });
    }

    let updateData = req.body;

    // Se è stato caricato un nuovo avatar
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blog-tech/authors',
        use_filename: true
      });
      updateData.avatar = result.secure_url;
    }

    author = await Author.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getAuthorProfile,
  updateAuthorProfile
}; 