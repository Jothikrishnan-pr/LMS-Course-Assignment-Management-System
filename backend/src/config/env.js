require('dotenv').config();

const get = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

module.exports = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),
  mongoUri: get('MONGO_URI', 'mongodb://127.0.0.1:27017/lms'),
  jwtAccessSecret: get('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: get('JWT_REFRESH_SECRET'),
  accessTtl: get('ACCESS_TOKEN_TTL', '15m'),
  refreshTtlDays: Number(get('REFRESH_TOKEN_TTL_DAYS', 7)),
  clientUrl: get('CLIENT_URL', 'http://localhost:5173'),
};
