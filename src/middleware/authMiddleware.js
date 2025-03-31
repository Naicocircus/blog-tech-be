const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Proteggi le route
const protect = async (req, res, next) => {
    let token;

    // Controlla se il token è presente nell'header Authorization o nei cookie
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Verifica che il token esista
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Non autorizzato ad accedere a questa risorsa'
        });
    }

    try {
        // Verifica il token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Non autorizzato ad accedere a questa risorsa'
        });
    }
};

// Autorizzazione per ruoli
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Il ruolo ${req.user.role} non è autorizzato ad accedere a questa risorsa`
            });
        }
        next();
    };
};

module.exports = {
    protect,
    authorize
}; 