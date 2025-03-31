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
const uploadToCloudinary = async (file) => {
    try {
        // Verifica che il file sia valido
        if (!file || !file.tempFilePath) {
            throw new Error('Invalid file');
        }

        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: 'auto',
            folder: 'blog-posts',
            transformation: [
                { width: 1080, height: 720, crop: 'fill' },
                { quality: 'auto' }
            ]
        });

        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error('Error in uploadToCloudinary:', error);
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