const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Assicurati che la directory di upload esista
const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    console.log('Directory di upload non trovata, la creo...');
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurazione di Multer per l'upload temporaneo
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
    // Lista dei MIME type accettati
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo di file non supportato. Carica solo immagini (JPEG, PNG, GIF, WEBP).'), false);
    }
};

// Crea l'istanza di multer configurata
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Limite di 5MB
        files: 1 // Massimo 1 file per richiesta
    }
});

// Middleware per gestire gli errori di Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Errore Multer:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Il file è troppo grande. Massimo 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Troppi file. Puoi caricare solo un file alla volta.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Errore durante l'upload: ${err.message}`
        });
    } else if (err) {
        console.error('Errore generico:', err);
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Esporta l'istanza di multer e il middleware di gestione errori
module.exports = {
    upload,
    handleMulterError
}; 