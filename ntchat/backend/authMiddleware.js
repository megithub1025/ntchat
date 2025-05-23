const jwt = require('jsonwebtoken');
const config = require('./config'); // Using config for JWT_SECRET

const JWT_SECRET = config.jwtSecret;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add decoded user payload to request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        console.error('Token verification error:', error);
        return res.status(500).json({ message: 'Failed to authenticate token.' });
    }
};

const hasRole = (rolesRequired) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles || !Array.isArray(req.user.roles)) {
            return res.status(403).json({ message: 'Forbidden. User roles not available.' });
        }

        const userRoles = req.user.roles;
        const hasRequiredRole = rolesRequired.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            return res.status(403).json({ message: `Forbidden. Requires one of these roles: ${rolesRequired.join(', ')}.` });
        }

        next(); // User has at least one of the required roles
    };
};

// Specific role check middlewares (optional convenience wrappers)
const isAdmin = (req, res, next) => {
    // This is a convenience function, hasRole(['admin']) should be used directly for consistency
    // or ensure req.user.roles is populated correctly by verifyToken from a DB lookup if detailed user info is needed here.
    // For now, it relies on roles being in the JWT.
    if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
        return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    next();
};

module.exports = {
    verifyToken,
    hasRole,
    isAdmin,
};
