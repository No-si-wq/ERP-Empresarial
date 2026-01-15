function getJwtSecrets() {
  const current = process.env.JWT_SECRET_CURRENT;
  const previous = process.env.JWT_SECRET_PREVIOUS;

  if (!current) {
    throw new Error("JWT_SECRET_CURRENT no definido");
  }

  return {
    current,
    previous: previous || null,
  };
}

module.exports = { getJwtSecrets };