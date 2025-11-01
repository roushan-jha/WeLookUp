import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// 1. Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Multer to temporarily store files in memory
// Multer is used here to handle the file upload data from the client.
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    // Optional: Limit file size to 5MB
    limits: { fileSize: 5 * 1024 * 1024 } 
});

export { cloudinary, upload };