const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    content: {
      type: String,
      required: [true, 'Please add content'],
      minlength: [5, 'Content must be at least 5 characters']
    },
    excerpt: {
      type: String,
      required: [true, 'Please add an excerpt'],
      maxlength: [200, 'Excerpt cannot be more than 200 characters']
    },
    coverImage: {
      type: String,
      default: 'https://res.cloudinary.com/dgcrdcezz/image/upload/v1/blog-tech/defaults/default-post-cover'
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: [
        'Microcontrollers',
        'Programming',
        'Robotics',
        'Artificial Intelligence',
        'IoT',
        'Hardware',
        'Software',
        'Other'
      ]
    },
    tags: {
      type: [String],
      required: false
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },
    readTime: {
      type: Number,
      default: 5
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    likesCount: {
      type: Number,
      default: 0
    },
    reactions: {
      thumbsUp: {
        type: Number,
        default: 0
      },
      heart: {
        type: Number,
        default: 0
      },
      clap: {
        type: Number,
        default: 0
      },
      wow: {
        type: Number,
        default: 0
      },
      sad: {
        type: Number,
        default: 0
      }
    },
    userReactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['thumbsUp', 'heart', 'clap', 'wow', 'sad']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    shareCount: {
      type: Number,
      default: 0
    },
    shares: [{
      platform: {
        type: String,
        enum: ['facebook', 'twitter', 'linkedin', 'whatsapp', 'other'],
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for post's comments (da implementare in futuro)
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  justOne: false
});

// Middleware pre-save per calcolare il tempo di lettura
postSchema.pre('save', function(next) {
  const wordsPerMinute = 200; // Media di parole lette al minuto
  const wordCount = this.content.split(/\s+/).length;
  this.readTime = Math.ceil(wordCount / wordsPerMinute);
  
  // Aggiorna il conteggio dei like
  if (this.likes) {
    this.likesCount = this.likes.length;
  }
  
  next();
});

module.exports = mongoose.model('Post', postSchema); 