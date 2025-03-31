const cloudinary = require('../config/cloudinary');

// Funzione per gestire gli errori in modo uniforme
const handleError = (res, error, statusCode = 500) => {
    res.status(statusCode).json({
        success: false,
        message: error.message || 'Si è verificato un errore'
    });
};

// Funzione per inviare una risposta di successo
const sendResponse = (res, data, statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        data
    });
};

// Funzione per caricare un file su Cloudinary
const uploadToCloudinary = async (file, folder) => {
    try {
        // Se non c'è un file, non procedere con l'upload
        if (!file) {
            console.log('[Cloudinary] Nessun file fornito, uso immagine default');
            return 'https://res.cloudinary.com/dgcrdcezz/image/upload/v1/blog-tech/defaults/default-post-cover';
        }

        // Log iniziale più dettagliato
        console.log('[Cloudinary] File ricevuto:', {
            fileType: typeof file,
            hasTemp: !!file.tempFilePath,
            hasPath: !!file.path,
            mimeType: file.mimetype,
            size: file.size
        });
        
        console.log('Tentativo di upload su Cloudinary:', {
            fileName: file.name || file.originalname,
            fileSize: file.size,
            filePath: file.tempFilePath || file.path,
            mimeType: file.mimetype,
            folder: `blog-tech/${folder}`
        });
        
        // Se il file è un URL, ritorna l'URL stesso
        if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
            console.log('File è già un URL, ritorno direttamente:', file);
            return file;
        }

        // Gestione file da express-fileupload
        if (file.tempFilePath) {
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: `blog-tech/${folder}`,
                use_filename: true,
                resource_type: 'auto'
            });
            
            console.log('Upload su Cloudinary completato con successo:', {
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                size: result.bytes
            });
            
            return result.secure_url;
        }
        
        // Gestione file da multer
        if (file.path) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: `blog-tech/${folder}`,
                use_filename: true,
                resource_type: 'auto'
            });
            
            console.log('Upload su Cloudinary completato con successo:', {
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                size: result.bytes
            });
            
            return result.secure_url;
        }
        
        console.error('File non valido:', file);
        throw new Error('File non valido per il caricamento');
    } catch (error) {
        console.error('[Cloudinary] Errore upload:', error);
        throw error;
    }
};

// Funzione per eliminare un file da Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        throw new Error('Errore durante l\'eliminazione del file');
    }
};

// Funzione per gestire la paginazione
const getPaginationData = (page = 1, limit = 10, totalCount) => {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    return {
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        hasNextPage: pageNum * limitNum < totalCount,
        hasPrevPage: pageNum > 1,
        total: totalCount
    };
};

module.exports = {
    handleError,
    sendResponse,
    uploadToCloudinary,
    deleteFromCloudinary,
    getPaginationData
}; 