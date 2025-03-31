const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { handleError, sendResponse } = require('../utils/controllerUtils');
const { createNotification } = require('./notificationController');

// @desc    Ottieni tutti i commenti di un post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Ottieni solo i commenti principali (non risposte)
    const comments = await Comment.find({ 
      post: postId,
      parentComment: null,
      isApproved: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('replies');
    
    const total = await Comment.countDocuments({ 
      post: postId,
      parentComment: null,
      isApproved: true
    });
    
    sendResponse(res, {
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Ottieni un singolo commento
// @route   GET /api/comments/:id
// @access  Public
const getComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('replies');
    
    if (!comment) {
      return handleError(res, new Error('Commento non trovato'), 404);
    }
    
    sendResponse(res, comment);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Crea un nuovo commento
// @route   POST /api/posts/:postId/comments
// @access  Private
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;
    
    // Verifica che il post esista
    const post = await Post.findById(postId).populate('author');
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }
    
    // Se è una risposta, verifica che il commento padre esista
    let parentCommentObj;
    if (parentComment) {
      parentCommentObj = await Comment.findById(parentComment).populate('author');
      if (!parentCommentObj) {
        return handleError(res, new Error('Commento padre non trovato'), 404);
      }
    }
    
    // Crea il commento
    const comment = await Comment.create({
      content,
      post: postId,
      author: req.user.id,
      parentComment: parentComment || null
    });
    
    // Popola l'autore per la risposta
    await comment.populate('author', 'name avatar');
    
    // Creo notifiche

    // 1. Notifica all'autore del post (se non è l'utente stesso)
    if (post.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: post.author._id, // L'autore del post
        sender: req.user.id, // Chi ha commentato
        type: 'comment',
        post: post._id,
        comment: comment._id,
        content: `${req.user.name} ha commentato il tuo post "${post.title}"`,
        link: `/post/${post._id}#comment-${comment._id}`
      });
    }
    
    // 2. Se è una risposta, notifica all'autore del commento padre (se non è l'utente stesso)
    if (parentCommentObj && parentCommentObj.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: parentCommentObj.author._id, // L'autore del commento padre
        sender: req.user.id, // Chi ha risposto
        type: 'reply',
        post: post._id,
        comment: comment._id,
        content: `${req.user.name} ha risposto al tuo commento nel post "${post.title}"`,
        link: `/post/${post._id}#comment-${comment._id}`
      });
    }
    
    // 3. Controllo se ci sono menzioni @username nel contenuto e creo notifiche
    // Questa è una implementazione base, può essere migliorata per trovare menzioni valide
    const mentionedUsers = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsers.push(match[1]);
    }
    
    // Se ci sono menzioni, cerca gli utenti menzionati e crea notifiche
    if (mentionedUsers.length > 0) {
      const User = require('../models/User');
      for (const username of mentionedUsers) {
        const mentionedUser = await User.findOne({ name: new RegExp(`^${username}$`, 'i') });
        
        if (mentionedUser && mentionedUser._id.toString() !== req.user.id) {
          await createNotification({
            recipient: mentionedUser._id,
            sender: req.user.id,
            type: 'mention',
            post: post._id,
            comment: comment._id,
            content: `${req.user.name} ti ha menzionato in un commento nel post "${post.title}"`,
            link: `/post/${post._id}#comment-${comment._id}`
          });
        }
      }
    }
    
    sendResponse(res, comment, 201);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Aggiorna un commento
// @route   PUT /api/comments/:id
// @access  Private
const updateComment = async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return handleError(res, new Error('Commento non trovato'), 404);
    }
    
    // Verifica che l'utente sia l'autore del commento o un admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return handleError(res, new Error('Non autorizzato a modificare questo commento'), 403);
    }
    
    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true, runValidators: true }
    );
    
    sendResponse(res, comment);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Elimina un commento
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return handleError(res, new Error('Commento non trovato'), 404);
    }
    
    // Verifica che l'utente sia l'autore del commento o un admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return handleError(res, new Error('Non autorizzato a eliminare questo commento'), 403);
    }
    
    // Elimina anche tutte le risposte al commento
    if (!comment.parentComment) {
      await Comment.deleteMany({ parentComment: comment._id });
    }
    
    await comment.deleteOne();
    sendResponse(res, null);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Approva o disapprova un commento (solo admin)
// @route   PUT /api/comments/:id/approve
// @access  Private/Admin
const approveComment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return handleError(res, new Error('Solo gli amministratori possono approvare i commenti'), 403);
    }
    
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { isApproved: req.body.isApproved },
      { new: true }
    );
    
    if (!comment) {
      return handleError(res, new Error('Commento non trovato'), 404);
    }
    
    sendResponse(res, comment);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  approveComment
}; 