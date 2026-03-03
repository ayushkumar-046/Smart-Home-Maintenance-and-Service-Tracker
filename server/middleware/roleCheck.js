function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
}

function isHomeowner(req, res, next) {
    if (req.user && (req.user.role === 'homeowner' || req.user.role === 'admin')) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Homeowner privileges required.' });
}

function isProvider(req, res, next) {
    if (req.user && (req.user.role === 'service_provider' || req.user.role === 'admin')) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Service provider privileges required.' });
}

function isHomeownerOrProvider(req, res, next) {
    if (req.user && (req.user.role === 'homeowner' || req.user.role === 'service_provider' || req.user.role === 'admin')) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied.' });
}

module.exports = { isAdmin, isHomeowner, isProvider, isHomeownerOrProvider };
