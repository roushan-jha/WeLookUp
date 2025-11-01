import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    // 1. Get token from header
    const token = req.header('x-auth-token');

    // 2. Check if no token is present
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user payload to the request object
        req.user = decoded.user;
        next(); // Move to the next middleware or route handler

    } catch (err) {
        // Token is invalid (expired, manipulated, etc.)
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;