const Notification = require('../models/Notification');
const User = require('../models/User');
const { handleError, sendResponse } = require('../utils/controllerUtils');

// @desc    Ottieni tutte le notifiche dell'utente corrente
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Query di base per l'utente corrente
    const query = { recipient: req.user.id };
    
    // Filtro per notifiche non lette se richiesto
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    // Ottieni notifiche con paginazione
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('post', 'title')
      .populate('comment', 'content');
    
    // Conteggio totale per la paginazione
    const total = await Notification.countDocuments(query);
    
    // Conteggio delle notifiche non lette per il badge
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id,
      read: false
    });
    
    sendResponse(res, {
      notifications,
      unreadCount,
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

// @desc    Segna una notifica come letta
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return handleError(res, new Error('Notifica non trovata'), 404);
    }
    
    // Verifica che l'utente sia il destinatario della notifica
    if (notification.recipient.toString() !== req.user.id) {
      return handleError(res, new Error('Non autorizzato'), 403);
    }
    
    // Aggiorna lo stato di lettura
    notification.read = true;
    await notification.save();
    
    sendResponse(res, notification);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Segna tutte le notifiche come lette
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    
    sendResponse(res, { message: 'Tutte le notifiche sono state segnate come lette' });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Elimina una notifica
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return handleError(res, new Error('Notifica non trovata'), 404);
    }
    
    // Verifica che l'utente sia il destinatario della notifica
    if (notification.recipient.toString() !== req.user.id) {
      return handleError(res, new Error('Non autorizzato'), 403);
    }
    
    await notification.deleteOne();
    sendResponse(res, null);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Crea una nuova notifica (utilizzato internamente)
// @access  Private
const createNotification = async (data) => {
  try {
    // Crea una nuova notifica
    return await Notification.create(data);
  } catch (error) {
    console.error('Errore nella creazione della notifica:', error);
    return null;
  }
};

// @desc    Ottieni il conteggio delle notifiche non lette
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id,
      read: false
    });
    
    sendResponse(res, { count });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount
}; 