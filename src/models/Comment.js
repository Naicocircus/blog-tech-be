const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Il contenuto del commento è obbligatorio'],
      trim: true,
      maxlength: [1000, 'Il commento non può superare i 1000 caratteri']
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual per le risposte ai commenti
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  justOne: false
});

// Middleware pre-find per popolare automaticamente l'autore
commentSchema.pre('find', function() {
  this.populate('author', 'name avatar');
});

// Middleware pre-findOne per popolare automaticamente l'autore
commentSchema.pre('findOne', function() {
  this.populate('author', 'name avatar');
});

module.exports = mongoose.model('Comment', commentSchema); 