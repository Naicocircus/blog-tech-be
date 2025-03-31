const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    type: {
      type: String,
      enum: [
        'comment', // Nuovo commento su un post
        'reply', // Risposta al tuo commento
        'mention', // Sei stato menzionato in un commento
        'like', // Like al tuo post
        'reaction', // Reazione al tuo post
        'share', // Condivisione del tuo post
        'follow', // Nuovo follower (per futura implementazione)
        'system' // Notifica di sistema
      ],
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: false
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      required: false
    },
    read: {
      type: Boolean,
      default: false
    },
    content: {
      type: String,
      required: true
    },
    link: {
      type: String,
      required: false
    },
    reactionType: {
      type: String,
      enum: ['thumbsUp', 'heart', 'clap', 'wow', 'sad', null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indice per ottimizzare le query per utente
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Middleware pre-find per popolare automaticamente il sender
notificationSchema.pre('find', function() {
  this.populate('sender', 'name avatar');
});

// Middleware pre-findOne per popolare automaticamente il sender
notificationSchema.pre('findOne', function() {
  this.populate('sender', 'name avatar');
});

module.exports = mongoose.model('Notification', notificationSchema); 