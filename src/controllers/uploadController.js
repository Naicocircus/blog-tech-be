const fs = require('fs');
const { handleError, sendResponse, uploadToCloudinary, deleteFromCloudinary } = require('../utils/controllerUtils');

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return handleError(res, new Error('Nessun file caricato'), 400);
        }

        const url = await uploadToCloudinary(req.file, 'uploads');
        
        // Elimina il file temporaneo
        fs.unlinkSync(req.file.path);

        sendResponse(res, { url });
    } catch (error) {
        // Se c'è un errore e il file esiste ancora, eliminalo
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        handleError(res, error);
    }
};

const deleteImage = async (req, res) => {
    try {
        const { public_id } = req.params;

        if (!public_id) {
            return handleError(res, new Error('Public ID non fornito'), 400);
        }

        const success = await deleteFromCloudinary(public_id);

        if (success) {
            sendResponse(res, { message: 'Immagine eliminata con successo' });
        } else {
            handleError(res, new Error('Impossibile eliminare l\'immagine'), 400);
        }
    } catch (error) {
        handleError(res, error);
    }
};

module.exports = {
    uploadImage,
    deleteImage
}; 