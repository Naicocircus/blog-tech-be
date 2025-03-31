const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Tutte le rotte richiedono autenticazione
router.use(protect);

// Rotta per ottenere tutte le notifiche dell'utente
router.get('/', getNotifications);

// Rotta per ottenere conteggio notifiche non lette
router.get('/unread-count', getUnreadCount);

// Rotta per segnare tutte le notifiche come lette
router.put('/read-all', markAllAsRead);

// Rotta per segnare una notifica come letta
router.put('/:id/read', markAsRead);

// Rotta per eliminare una notifica
router.delete('/:id', deleteNotification);

module.exports = router; 