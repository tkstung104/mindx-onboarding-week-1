import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment check
export const isProduction = process.env.NODE_ENV === 'production';
export const PORT = process.env.PORT || 3000;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tungha104.id.vn';

// MindX OAuth Configuration
export const CLIENT_ID = process.env.MINDX_CLIENT_ID || 'mindx-onboarding';
export const CLIENT_SECRET = process.env.MINDX_CLIENT_SECRET || '';

// MindX OpenID Configuration
export const MINDX_ISSUER = 'https://id-dev.mindx.edu.vn';
export const MINDX_JWKS_URI = 'https://id-dev.mindx.edu.vn/jwks';
export const MINDX_AUTHORIZATION_ENDPOINT = 'https://id-dev.mindx.edu.vn/auth';
export const MINDX_TOKEN_ENDPOINT = 'https://id-dev.mindx.edu.vn/token';
export const MINDX_USERINFO_ENDPOINT = 'https://id-dev.mindx.edu.vn/me';

