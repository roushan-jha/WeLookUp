import express from 'express';
import auth from '../middleware/auth.js'; // The middleware to protect the routes
import ClientProfile from '../models/ClientProfile.js';

const router = express.Router();

// @route   POST api/v1/profiles
// @desc    Create or update a client profile
// @access  Private (Requires JWT from a Service Provider)
router.post('/', auth, async (req, res) => {
    // We only allow certain fields to be set directly by the user
    const { companyName, gstin } = req.body; 

    // Initial scores and stats are set by the model defaults or calculated later
    const profileFields = {
        companyName: companyName.trim(),
        gstin: gstin ? gstin.trim() : undefined
    };

    try {
        // Check if profile already exists by companyName
        let profile = await ClientProfile.findOne({ companyName: companyName.trim() });

        if (profile) {
            // If exists, update it (though for initial MVP, we mostly focus on creation)
            profile = await ClientProfile.findOneAndUpdate(
                { companyName: companyName.trim() },
                { $set: profileFields },
                { new: true }
            );
            return res.json(profile);
        }

        // Create new profile
        profile = new ClientProfile(profileFields);
        await profile.save();
        res.json(profile);

    } catch (err) {
        console.error(err.message);
        // Error code 11000 is a duplicate key error (unique field violation)
        if (err.code === 11000) {
             return res.status(400).json({ message: 'Profile with this Company Name or GSTIN already exists.' });
        }
        res.status(500).send('Server Error during profile creation');
    }
});

// @route   GET api/v1/profiles
// @desc    Get all client profiles (for the Service Provider dashboard)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Find all profiles and return only essential fields for the list/dashboard view
        const profiles = await ClientProfile.find().select('companyName riskScore totalReviews isVerified');
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during profile retrieval');
    }
});

// @route   GET api/v1/profiles/:profile_id
// @desc    Get single client profile by ID
// @access  Private
router.get('/:profile_id', auth, async (req, res) => {
    try {
        const profile = await ClientProfile.findById(req.params.profile_id);

        if (!profile) {
            return res.status(404).json({ message: 'Client profile not found' });
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        // This catches invalid ObjectId format (e.g., if ID is too short)
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Client profile not found' });
        }
        res.status(500).send('Server Error retrieving single profile');
    }
});

export default router;