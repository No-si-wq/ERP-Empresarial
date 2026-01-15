function checkPermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!req.user.permissions.includes(permissionKey)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    next();
  };
}

module.exports = checkPermission;