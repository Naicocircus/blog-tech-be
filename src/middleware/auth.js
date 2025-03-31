const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protegge le route private
exports.protect = async (req, res, next) => {
    let token;

    // Controlla se il token è presente nell'header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Controlla se il token è presente nei cookie
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Verifica se il token esiste
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Non sei autorizzato ad accedere a questa risorsa'
        });
    }

    try {
        // Verifica il token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Aggiunge l'utente alla request
        req.user = await User.findById(decoded.id);
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Non sei autorizzato ad accedere a questa risorsa'
        });
    }
}; 