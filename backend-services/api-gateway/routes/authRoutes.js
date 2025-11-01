import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Import the User model

const router = express.Router();

// --- 1. User Registration Route ---
router.post('/register', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Create new user instance
        user = new User({
            email,
            password, // Will be hashed below
            role: role || 'ServiceProvider' 
        });

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 4. Save user to database
        await user.save();

        // 5. Generate JWT Token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Use the secret from your .env
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Send token back to the client
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during registration');
    }
});

// --- 2. User Login Route ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // 2. Compare password (plain text vs. hashed)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // 3. Generate JWT Token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }, // Token valid for 1 day
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Send token back
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during login');
    }
});

export default router;