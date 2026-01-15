const jwt = require('jsonwebtoken');

const { verifyJwtToken } = require("../src/security/verifyJwt");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    const decodedToken = verifyJwtToken(token);

    req.user = {
      id: decodedToken.userId,
      username: decodedToken.username,
      roleId: decodedToken.roleId,
      roleName: decodedToken.roleName,
      permissions: decodedToken.permissions || [],
    };

    next();
  } catch (err) {
    return res.sendStatus(403);
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };