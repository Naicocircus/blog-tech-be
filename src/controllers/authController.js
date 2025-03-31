const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Registra un nuovo utente
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Crea l'utente
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user'
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Login utente
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`Tentativo di login per: ${email}`);

        // Valida email e password
        if (!email || !password) {
            console.log('Email o password mancanti');
            return res.status(400).json({
                success: false,
                error: 'Per favore fornisci email e password'
            });
        }

        // Controlla l'utente
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            console.log(`Utente non trovato: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenziali non valide'
            });
        }

        console.log(`Utente trovato: ${user.name}, ruolo: ${user.role}`);
        console.log(`Password hash nel DB: ${user.password}`);
        console.log(`Password fornita: ${password}`);

        // Verifica la password
        const isMatch = await user.matchPassword(password);
        console.log(`Password match: ${isMatch}`);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Credenziali non valide'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error(`Errore login: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Ottieni utente corrente
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Logout utente
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
};

// @desc    Aggiorna profilo utente
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { name, bio, avatar } = req.body;
    
    console.log('Richiesta di aggiornamento profilo ricevuta:', req.body);
    console.log('ID utente:', req.user.id);
    
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            console.log('Utente non trovato');
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        console.log('Utente trovato:', user.name);
        
        // Aggiorna solo i campi forniti
        if (name) {
            console.log('Aggiornamento nome da', user.name, 'a', name);
            user.name = name;
        }
        if (bio !== undefined) {
            console.log('Aggiornamento bio da', user.bio, 'a', bio);
            user.bio = bio;
        }
        if (avatar) {
            console.log('Aggiornamento avatar');
            user.avatar = avatar;
        }

        const updatedUser = await user.save();
        console.log('Utente aggiornato con successo');

        res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (error) {
        console.error('Errore aggiornamento profilo:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Errore durante l\'aggiornamento del profilo'
        });
    }
});

// @desc    Aggiorna password utente
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Trova l'utente
        const user = await User.findById(req.user.id).select('+password');

        // Verifica la password corrente
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Password attuale non corretta'
            });
        }

        // Aggiorna la password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password aggiornata con successo'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Upload avatar utente
// @route   POST /api/auth/upload-avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
    try {
        console.log('Upload avatar request received:', req.files);
        
        if (!req.files || !req.files.avatar) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }

        const avatarFile = req.files.avatar;
        
        // Validazione del tipo di file
        if (!avatarFile.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                message: 'Il file deve essere un\'immagine'
            });
        }

        // Log dell'upload
        console.log('Tentativo di upload avatar:', {
            fileName: avatarFile.name,
            fileSize: avatarFile.size,
            mimeType: avatarFile.mimetype
        });

        try {
            // Upload su Cloudinary
            const result = await cloudinary.uploader.upload(avatarFile.tempFilePath, {
                folder: 'blog-tech/avatars',
                width: 150,
                height: 150,
                crop: 'fill',
                gravity: 'face'
            });

            console.log('Cloudinary upload result:', result);

            // Aggiorna l'utente con il nuovo avatar
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { avatar: result.secure_url },
                { new: true }
            );

            if (!user) {
                throw new Error('Utente non trovato');
            }

            // Elimina il file temporaneo
            if (avatarFile.tempFilePath) {
                fs.unlink(avatarFile.tempFilePath, (err) => {
                    if (err) console.error('Errore eliminazione file temporaneo:', err);
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    url: result.secure_url
                }
            });
        } catch (uploadError) {
            console.error('Errore durante l\'upload su Cloudinary:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Errore durante l\'upload dell\'immagine'
            });
        }
    } catch (error) {
        console.error('Errore upload avatar:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore durante l\'upload dell\'avatar'
        });
    }
});

// Funzione helper per inviare il token in risposta
const sendTokenResponse = (user, statusCode, res) => {
    // Crea token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        });
};

module.exports = {
    register,
    login,
    getMe,
    logout,
    updateProfile,
    changePassword,
    uploadAvatar
}; 