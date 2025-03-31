const mongoose = require('mongoose');
const Post = require('../models/Post');
const { handleError, sendResponse, getPaginationData, uploadToCloudinary } = require('../utils/controllerUtils');
const { createNotification } = require('./notificationController');
const cloudinary = require('cloudinary');

// @desc    Get all posts with advanced search
// @route   GET /api/posts
// @access  Public
const getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      tags,
      author,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'published',
      fromDate,
      toDate
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Base query - mostra solo i post pubblicati se non specificato diversamente
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filtri avanzati
    if (category) query.category = category;
    if (author) query.author = new mongoose.Types.ObjectId(author);
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Ricerca full-text
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtro per data
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Validazione del campo di ordinamento
    const allowedSortFields = ['title', 'createdAt', 'readTime', 'category'];
    const actualSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const actualSortOrder = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [actualSortField]: actualSortOrder };

    // Esecuzione della query con aggregation pipeline
    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorDetails'
        }
      },
      { $unwind: '$authorDetails' },
      {
        $project: {
          title: 1,
          excerpt: 1,
          content: 1,
          coverImage: 1,
          category: 1,
          tags: 1,
          status: 1,
          readTime: 1,
          createdAt: 1,
          updatedAt: 1,
          author: {
            _id: '$authorDetails._id',
            name: '$authorDetails.name',
            avatar: '$authorDetails.avatar'
          }
        }
      },
      { $sort: sortOptions },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    ];

    const [posts, totalCount] = await Promise.all([
      Post.aggregate(aggregationPipeline),
      Post.countDocuments(query)
    ]);

    // Suggerimenti di ricerca se c'è un termine di ricerca
    let suggestions = [];
    if (search) {
      suggestions = await Post.distinct('tags', {
        tags: { $regex: search, $options: 'i' },
        _id: { $nin: posts.map(p => p._id) }
      });
      suggestions = suggestions.slice(0, 5);
    }

    return res.status(200).json({
      success: true,
      data: posts || [],
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum),
      suggestions
    });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name bio avatar');
    
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }
    
    sendResponse(res, post);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    console.log('Received post data:', req.body);
    
    // Verifica che i campi obbligatori siano presenti
    const requiredFields = ['title', 'content', 'excerpt', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        errors: missingFields.map(field => ({
          field,
          message: `Il campo ${field} è obbligatorio`
        }))
      });
    }

    let coverImageUrl = null;
    
    // Se è stata caricata un'immagine di copertina
    if (req.files && req.files.image) {
      try {
        const result = await uploadToCloudinary(req.files.image, 'posts');
        coverImageUrl = result.secure_url;
      } catch (error) {
        console.error('Errore upload immagine:', error);
      }
    }

    // Gestione dei tag
    let tags = [];
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        try {
          tags = JSON.parse(req.body.tags);
        } catch {
          tags = req.body.tags.split(',').map(tag => tag.trim());
        }
      } else if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      }
    }

    const postData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      category: req.body.category,
      coverImage: coverImageUrl,
      tags,
      author: req.user._id,
      status: req.body.status || 'published'
    };

    console.log('Creating post with data:', postData);
    const post = await Post.create(postData);
    
    return res.status(201).json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('Errore nella creazione del post:', error);
    
    // Se è un errore di validazione di Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    return res.status(500).json({
      success: false,
      errors: [{ message: 'Errore durante la creazione del post' }]
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trovato'
      });
    }

    // Verifica che l'utente sia l'autore del post o un admin
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a modificare questo post'
      });
    }

    // Crea una copia del body per le modifiche
    let updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    // Gestione dell'immagine di copertina
    if (req.files && req.files.image) {
      try {
        const imageUrl = await uploadToCloudinary(req.files.image, 'posts');
        updateData.coverImage = imageUrl;
      } catch (uploadError) {
        console.error('Errore upload immagine:', uploadError);
        return res.status(400).json({
          success: false,
          message: `Errore caricamento immagine: ${uploadError.message}`
        });
      }
    }

    // Gestione dei tag
    if (updateData.tags) {
      if (typeof updateData.tags === 'string') {
        updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
      }
    }

    // Aggiorna il post
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name bio avatar');

    if (!updatedPost) {
      return res.status(400).json({
        success: false,
        message: 'Errore durante l\'aggiornamento del post'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }

    await post.deleteOne();
    sendResponse(res, null);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get posts by author
// @route   GET /api/posts/author/:authorId
// @access  Public
const getPostsByAuthor = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.authorId })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trovato'
      });
    }

    const likeIndex = post.likes.findIndex(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Rimuovi il like
      post.likes.splice(likeIndex, 1);
    } else {
      // Aggiungi il like
      post.likes.push({
        user: req.user._id,
        createdAt: new Date()
      });

      // Invia notifica all'autore del post se è stato aggiunto un like
      if (post.author.toString() !== req.user._id.toString()) {
        try {
          await createNotification({
            recipient: post.author,
            sender: req.user._id,
            type: 'like',
            post: post._id,
            content: `${req.user.name} ha messo like al tuo post "${post.title}"`,
            link: `/post/${post._id}`
          });
        } catch (error) {
          console.error('Errore nella creazione della notifica:', error);
        }
      }
    }

    // Aggiorna il conteggio dei like
    post.likesCount = post.likes.length;
    await post.save();

    res.json({
      success: true,
      data: {
        likes: post.likes,
        likesCount: post.likesCount,
        userLiked: likeIndex === -1
      }
    });
  } catch (error) {
    console.error('Errore in likePost:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del like'
    });
  }
};

// @desc    React to post
// @route   POST /api/posts/:id/react
// @access  Private
const reactToPost = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findById(req.params.id).populate('author', 'name title');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post non trovato'
      });
    }

    // Valida il tipo di reazione
    const validReactions = ['thumbsUp', 'heart', 'clap', 'wow', 'sad'];
    if (!validReactions.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo di reazione non valido'
      });
    }

    // Trova la reazione esistente dell'utente
    const existingReactionIndex = post.userReactions.findIndex(reaction => 
      reaction.user.toString() === req.user._id.toString()
    );

    if (existingReactionIndex > -1) {
      const existingReaction = post.userReactions[existingReactionIndex];
      
      // Se la reazione è la stessa, rimuovila
      if (existingReaction.type === type) {
        post.reactions[type]--;
        post.userReactions.splice(existingReactionIndex, 1);
      } else {
        // Se è una reazione diversa, aggiorna il tipo
        post.reactions[existingReaction.type]--;
        post.reactions[type]++;
        existingReaction.type = type;
        existingReaction.createdAt = new Date();

        // Invia notifica per il cambio di reazione
        if (post.author._id.toString() !== req.user._id.toString()) {
          try {
            await createNotification({
              recipient: post.author._id,
              sender: req.user._id,
              type: 'reaction',
              post: post._id,
              content: `${req.user.name} ha cambiato la sua reazione in ${getReactionEmoji(type)} sul tuo post "${post.title}"`,
              link: `/post/${post._id}`,
              reactionType: type
            });
          } catch (error) {
            console.error('Errore nella creazione della notifica:', error);
          }
        }
      }
    } else {
      // Aggiungi una nuova reazione
      post.reactions[type]++;
      post.userReactions.push({
        user: req.user._id,
        type,
        createdAt: new Date()
      });

      // Invia notifica per la nuova reazione
      if (post.author._id.toString() !== req.user._id.toString()) {
        try {
          await createNotification({
            recipient: post.author._id,
            sender: req.user._id,
            type: 'reaction',
            post: post._id,
            content: `${req.user.name} ha reagito con ${getReactionEmoji(type)} al tuo post "${post.title}"`,
            link: `/post/${post._id}`,
            reactionType: type
          });
        } catch (error) {
          console.error('Errore nella creazione della notifica:', error);
        }
      }
    }

    await post.save();

    res.json({
      success: true,
      data: {
        reactions: post.reactions,
        userReaction: existingReactionIndex > -1 ? null : type
      }
    });
  } catch (error) {
    console.error('Errore in reactToPost:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento della reazione'
    });
  }
};

// Funzione di utilità per ottenere l'emoji in base al tipo di reazione
const getReactionEmoji = (type) => {
  switch (type) {
    case 'thumbsUp': return '👍';
    case 'heart': return '❤️';
    case 'clap': return '👏';
    case 'wow': return '😮';
    case 'sad': return '😢';
    default: return '��';
  }
};

// @desc    Get post reactions
// @route   GET /api/posts/:id/reactions
// @access  Public
const getPostReactions = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('reactions likesCount');
    
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }
    
    // Se l'utente è autenticato, verifica se ha reagito al post
    let userReaction = null;
    let userLiked = false;
    
    if (req.user) {
      const fullPost = await Post.findById(req.params.id);
      
      // Verifica se l'utente ha messo like
      userLiked = fullPost.likes.some(like => like.user.toString() === req.user.id);
      
      // Verifica se l'utente ha reagito
      const reaction = fullPost.userReactions.find(
        reaction => reaction.user.toString() === req.user.id
      );
      
      if (reaction) {
        userReaction = reaction.type;
      }
    }
    
    sendResponse(res, {
      reactions: post.reactions,
      likesCount: post.likesCount,
      userReaction,
      userLiked
    });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Track post share
// @route   POST /api/posts/:id/share
// @access  Public
const trackShare = async (req, res) => {
  try {
    const { platform = 'other' } = req.body;
    const userId = req.user ? req.user.id : null;
    
    const post = await Post.findById(req.params.id).populate('author');
    
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }
    
    // Aggiorna il conteggio delle condivisioni
    post.shareCount = (post.shareCount || 0) + 1;
    
    // Aggiungi il record della condivisione
    post.shares.push({ platform });
    
    await post.save();
    
    // Se l'utente è autenticato e non è l'autore del post, crea una notifica
    if (userId && post.author._id.toString() !== userId) {
      await createNotification({
        recipient: post.author._id,
        sender: userId,
        type: 'share',
        post: post._id,
        content: `${req.user.name} ha condiviso il tuo post "${post.title}" su ${getPlatformName(platform)}`,
        link: `/post/${post._id}`
      });
    }
    
    sendResponse(res, {
      shareCount: post.shareCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Funzione di utilità per ottenere il nome della piattaforma
function getPlatformName(platform) {
  const platforms = {
    facebook: 'Facebook',
    twitter: 'Twitter',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    other: 'altre piattaforme'
  };
  return platforms[platform] || 'altre piattaforme';
}

// @desc    Get post share statistics
// @route   GET /api/posts/:id/shares
// @access  Public
const getShareStats = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('shareCount shares');
    
    if (!post) {
      return handleError(res, new Error('Post non trovato'), 404);
    }
    
    // Calcola le statistiche per piattaforma
    const platformStats = {};
    
    post.shares.forEach(share => {
      platformStats[share.platform] = (platformStats[share.platform] || 0) + 1;
    });
    
    sendResponse(res, {
      shareCount: post.shareCount,
      platforms: platformStats
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
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
}; 