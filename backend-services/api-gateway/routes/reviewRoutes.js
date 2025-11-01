import express from 'express';
import auth from '../middleware/auth.js';
import Review from '../models/Review.js';
import ClientProfile from '../models/ClientProfile.js';
import { cloudinary, upload } from '../config/cloudinaryConfig.js';

const router = express.Router();

// @route   POST api/v1/reviews
// @desc    Submit a new review (with invoice upload)
// @access  Private (Service Providers only)
router.post('/', auth, upload.single('invoice'), async (req, res) => {
    // req.user is set by the auth middleware (contains id, role)
    const { clientProfileId, paymentDelayDays, rating, reviewText } = req.body;
    const file = req.file; // This is the file buffer from multer

    if (!clientProfileId || !paymentDelayDays || !rating || !reviewText || !file) {
        return res.status(400).json({ message: 'Missing required fields or invoice file.' });
    }

    try {
        // 1. Upload Invoice to Cloudinary
        // We use the temporary file buffer (req.file.buffer)
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'welookup-invoices', resource_type: 'auto' }, // Auto detects file type
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(file.buffer);
        });

        // 2. Create Review Record
        const newReview = new Review({
            submittedBy: req.user.id,
            clientProfile: clientProfileId,
            paymentDelayDays: parseInt(paymentDelayDays),
            rating: parseFloat(rating),
            reviewText: reviewText,
            invoiceUrl: result.secure_url, // URL from Cloudinary
            cloudinaryAssetId: result.public_id // ID for potential future deletion
        });

        await newReview.save();

        // 3. Update ClientProfile Stats (MVP: just increment review count)
        await ClientProfile.findByIdAndUpdate(clientProfileId, {
            $inc: { totalReviews: 1 } // Increment the total reviews count
        });

        // NOTE: In a production system, we would publish a message to RabbitMQ here 
        // for the 'scoring-service' to calculate the new riskScore asynchronously.
        // For now, we return the review and move on.

        res.status(201).json({ 
            message: 'Review submitted successfully. Score update pending.',
            review: newReview 
        });

    } catch (err) {
        console.error('Cloudinary/DB Error:', err.message);
        res.status(500).send('Server Error during review submission.');
    }
});

export default router;