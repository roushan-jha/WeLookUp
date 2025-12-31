import express from 'express';
import auth from '../middleware/auth.js';
import Review from '../models/Review.js';
import ClientProfile from '../models/ClientProfile.js';
import { cloudinary, upload } from '../config/cloudinaryConfig.js';
import { publishToQueue } from '../config/rabbitmq.js';

const router = express.Router();

// @route   POST api/v1/reviews
// @desc    Submit a new review (with invoice upload)
// @access  Private (Service Providers only)
router.post('/', auth, upload.single('invoice'), async (req, res) => {
    // req.user is set by the auth middleware (contains id, role)
    const { clientProfileId, paymentDelayDays, reviewText, qualityOfService, customerSupport, onTimeDelivery, valueForMoney, communicationResponsiveness, technicalExpertise } = req.body;
    const file = req.file; // This is the file buffer from multer

    if (!clientProfileId || !paymentDelayDays || !reviewText || !file || !qualityOfService || !customerSupport || !onTimeDelivery || !valueForMoney || !communicationResponsiveness || !technicalExpertise) {
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
            reviewText: reviewText,
            qualityOfService: parseFloat(qualityOfService),
            customerSupport: parseFloat(customerSupport),
            onTimeDelivery: parseFloat(onTimeDelivery),
            valueForMoney: parseFloat(valueForMoney),
            communicationResponsiveness: parseFloat(communicationResponsiveness),
            technicalExpertise: parseFloat(technicalExpertise),
            invoiceUrl: result.secure_url, // URL from Cloudinary
            cloudinaryAssetId: result.public_id, // ID for potential future deletion
        });

        await newReview.save();

        // 3. Update ClientProfile Stats (MVP: just increment review count)
        await ClientProfile.findByIdAndUpdate(clientProfileId, {
            $inc: { totalReviews: 1 } // Increment the total reviews count
        });

       // 4. PUBLISH TASK TO RABBITMQ (The crucial Day 4 step)
        const verificationPayload = {
            reviewId: newReview._id, // MongoDB ID of the newly saved review
            invoiceUrl: newReview.invoiceUrl, // URL needed for verification service
            clientProfileId: newReview.clientProfile // Client ID for context
        };

        // Publish to the queue defined in config/rabbitmq.js
        await publishToQueue('verification_queue', verificationPayload);

        res.status(201).json({ 
            message: 'Review submitted successfully.',
            review: newReview.toObject({ virtuals: true })
        });

    } catch (err) {
        console.error('Cloudinary/DB Error:', err.message);
        res.status(500).send('Server Error during review submission.');
    }
});

// @route   GET api/v1/reviews/profile/:profileId
// @desc    Get reviews for a given client profile
// @access  Private
router.get('/profile/:profileId', auth, async (req, res) => {
    try {
        const { profileId } = req.params;
        const reviews = await Review.find({ clientProfile: profileId })
            .populate('submittedBy', 'email name')
            .sort({ createdAt: -1 })
            .lean();

        // Attach overallRating if virtuals are not applied in lean()
        const enriched = reviews.map(r => {
            const ratingFields = [
                r.qualityOfService, r.customerSupport, r.onTimeDelivery,
                r.valueForMoney, r.communicationResponsiveness, r.technicalExpertise
            ];
            const allPresent = ratingFields.every(v => typeof v === 'number');
            return {
                ...r,
                overallRating: allPresent ? (ratingFields.reduce((a,b) => a+b, 0) / 6).toFixed(1) : null
            };
        });

        res.json(enriched);
    } catch (err) {
        console.error('Error fetching reviews:', err.message);
        res.status(500).send('Server Error fetching reviews');
    }
});

export default router;