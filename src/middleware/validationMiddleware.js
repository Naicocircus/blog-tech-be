const { validationResult } = require('express-validator');

// Middleware per gestire gli errori di validazione
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Validazione per la creazione/aggiornamento dei post
const postValidationRules = {
    title: {
        notEmpty: {
            errorMessage: 'Il titolo è obbligatorio'
        },
        isLength: {
            options: { min: 3, max: 100 },
            errorMessage: 'Il titolo deve essere compreso tra 3 e 100 caratteri'
        },
        trim: true
    },
    content: {
        notEmpty: {
            errorMessage: 'Il contenuto è obbligatorio'
        },
        isLength: {
            options: { min: 10 },
            errorMessage: 'Il contenuto deve essere di almeno 10 caratteri'
        }
    },
    excerpt: {
        notEmpty: {
            errorMessage: "L'excerpt è obbligatorio"
        },
        isLength: {
            options: { max: 200 },
            errorMessage: "L'excerpt non può superare i 200 caratteri"
        }
    },
    category: {
        notEmpty: {
            errorMessage: 'La categoria è obbligatoria'
        },
        isIn: {
            options: [['Microcontrollers', 'Programming', 'Robotics', 'Artificial Intelligence', 'IoT', 'Hardware', 'Software', 'Other']],
            errorMessage: 'Categoria non valida'
        }
    },
    tags: {
        optional: true,
        custom: {
            options: (value) => {
                if (!value) return true;
                try {
                    if (typeof value === 'string') {
                        // Prova a parsare come JSON
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) {
                            return parsed.every(tag => typeof tag === 'string' && tag.trim().length > 0);
                        }
                        // Se non è JSON, tratta come stringa separata da virgole
                        return value.split(',').every(tag => tag.trim().length > 0);
                    }
                    if (Array.isArray(value)) {
                        return value.every(tag => typeof tag === 'string' && tag.trim().length > 0);
                    }
                    return false;
                } catch (e) {
                    // Se il parsing JSON fallisce, tratta come stringa separata da virgole
                    return value.split(',').every(tag => tag.trim().length > 0);
                }
            },
            errorMessage: 'I tag devono essere validi'
        }
    },
    status: {
        optional: true,
        isIn: {
            options: [['draft', 'published']],
            errorMessage: 'Stato non valido'
        }
    },
    author: {
        optional: true,
        isMongoId: {
            errorMessage: 'ID autore non valido'
        }
    }
};

// Validazione per la creazione/aggiornamento degli autori
const authorValidationRules = {
    name: {
        notEmpty: {
            errorMessage: 'Il nome è obbligatorio'
        },
        isLength: {
            options: { min: 2, max: 50 },
            errorMessage: 'Il nome deve essere compreso tra 2 e 50 caratteri'
        },
        trim: true
    },
    email: {
        notEmpty: {
            errorMessage: "L'email è obbligatoria"
        },
        isEmail: {
            errorMessage: 'Email non valida'
        },
        normalizeEmail: true
    },
    bio: {
        optional: true,
        isLength: {
            options: { max: 500 },
            errorMessage: 'La bio non può superare i 500 caratteri'
        }
    }
};

// Validazione per la registrazione degli utenti
const userValidationRules = {
    name: {
        notEmpty: {
            errorMessage: 'Il nome è obbligatorio'
        },
        isLength: {
            options: { min: 2, max: 50 },
            errorMessage: 'Il nome deve essere compreso tra 2 e 50 caratteri'
        },
        trim: true
    },
    email: {
        notEmpty: {
            errorMessage: "L'email è obbligatoria"
        },
        isEmail: {
            errorMessage: 'Email non valida'
        },
        normalizeEmail: true
    },
    password: {
        notEmpty: {
            errorMessage: 'La password è obbligatoria'
        },
        isLength: {
            options: { min: 6 },
            errorMessage: 'La password deve essere di almeno 6 caratteri'
        }
    },
    role: {
        optional: true,
        isIn: {
            options: [['user', 'author', 'admin']],
            errorMessage: 'Ruolo non valido'
        }
    }
};

// Validazione per il login
const loginValidationRules = {
    email: {
        notEmpty: {
            errorMessage: "L'email è obbligatoria"
        },
        isEmail: {
            errorMessage: 'Email non valida'
        },
        normalizeEmail: true
    },
    password: {
        notEmpty: {
            errorMessage: 'La password è obbligatoria'
        }
    }
};

module.exports = {
    validateRequest,
    postValidationRules,
    authorValidationRules,
    userValidationRules,
    loginValidationRules
}; 