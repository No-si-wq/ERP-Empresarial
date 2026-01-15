const jwt = require("jsonwebtoken");
const { getJwtSecrets } = require("./jwtSecrets");

function verifyJwtToken(token) {
  const { current, previous } = getJwtSecrets();

  try {
    return jwt.verify(token, current);
  } catch (err) {
    if (previous) {
      return jwt.verify(token, previous);
    }
    throw err;
  }
}

module.exports = { verifyJwtToken };