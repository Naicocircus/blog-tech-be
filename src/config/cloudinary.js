const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgcrdcezz',
    api_key: process.env.CLOUDINARY_API_KEY || '618461191737678',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

module.exports = cloudinary; 