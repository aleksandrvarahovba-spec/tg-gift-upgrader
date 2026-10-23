import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  BOT_TOKEN: process.env.BOT_TOKEN || 'test_bot_token_123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  IS_DEV: process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
