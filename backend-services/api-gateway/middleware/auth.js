import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  // 1. Get token from header
  const token = req.header("x-auth-token");

  // 2. Check if no token is present
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* The payload now contains:
           { id, role, domain } 
           This is injected into 'req.user' for all subsequent routes.
        */
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

/**
 * Admin Middleware
 * Use this for routes like 'Delete Profile' or 'Force Verify'
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied: Admin privileges required" });
  }
};

export default auth;
