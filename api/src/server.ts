import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ============================================
// CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Environment check
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tungha104.id.vn';

// MindX OAuth Configuration
const CLIENT_ID = process.env.MINDX_CLIENT_ID || 'mindx-onboarding';
const CLIENT_SECRET = process.env.MINDX_CLIENT_SECRET || '';

// MindX OpenID Configuration
const MINDX_ISSUER = 'https://id-dev.mindx.edu.vn';
const MINDX_JWKS_URI = 'https://id-dev.mindx.edu.vn/jwks';
const MINDX_AUTHORIZATION_ENDPOINT = 'https://id-dev.mindx.edu.vn/auth';
const MINDX_TOKEN_ENDPOINT = 'https://id-dev.mindx.edu.vn/token';
const MINDX_USERINFO_ENDPOINT = 'https://id-dev.mindx.edu.vn/me';

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
app.use(cors({
    origin: isProduction 
        ? [
            FRONTEND_URL,
            'https://tungha104.id.vn',
            'http://tungha104.id.vn',
            'http://4.144.170.166',
          ]
        : true,
    credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// TYPES & INTERFACES
// ============================================

interface JWK {
    kty: string;  // Key type (RSA)
    use: string;  // Public key use (sig = signature)
    kid: string;  // Key ID
    n: string;    // Modulus (RSA public key component)
    e: string;    // Exponent (RSA public key component)
    alg: string;  // Algorithm (RS256)
}

interface JWKSResponse {
    keys: JWK[];
}

interface MindXTokenPayload {
    iss: string;                    // Issuer (https://id-dev.mindx.edu.vn)
    aud: string;                    // Audience (Client ID)
    sub: string;                    // Subject (User ID)
    exp: number;                    // Expiration time (Unix timestamp)
    iat: number;                    // Issued at (Unix timestamp)
    // Optional user info fields
    name?: string;
    email?: string;
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
}

interface LoginRequest {
    token: string;
}

interface LoginResponse {
    success: boolean;
    user?: {
        id: string;
        name: string;
        email?: string;
        username?: string;
    };
    message?: string;
}

// ============================================
// JWKS CACHE
// ============================================

// JWKS cache
let cachedKeys: Map<string, string> = new Map();
let keysExpiry: number = 0;

// ============================================
// STEP 1: FETCH MINDX PUBLIC KEYS (JWKS)
// ============================================

// Fetch MindX public keys (JWKS)
async function fetchMindXPublicKeys(): Promise<Map<string, string>> {
    // Check cache
    const now = Date.now();
    if (cachedKeys.size > 0 && now < keysExpiry) {
        console.log('📦 Using cached public keys');
        return cachedKeys;
    }
    
    console.log('🌐 Fetching MindX public keys from JWKS endpoint...');
    console.log(`📍 JWKS URI: ${MINDX_JWKS_URI}`);
    
    try {
        // Fetch JWKS
        const response = await fetch(MINDX_JWKS_URI);
        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        }

        // Parse JWKS response
        const jwks: JWKSResponse = await response.json();
        const keysMap = new Map<string, string>();
        
        // Convert JWK to PEM format
        for (const key of jwks.keys) {
            const publicKey = createPublicKey({
                key: {
                    kty: key.kty,
                    n: key.n,
                    e: key.e,
                },
                format: 'jwk',
            });
            
            const publicKeyPEM = publicKey.export({
                type: 'spki',
                format: 'pem',
            }) as string;
            
            keysMap.set(key.kid, publicKeyPEM);
        }

        // Cache keys
        cachedKeys = keysMap;
        keysExpiry = now + 60 * 60 * 1000;
        
        console.log(`✅ Fetched ${keysMap.size} public keys from MindX`);
        return keysMap;
        
    } catch (error: any) {
        console.error('❌ Error fetching MindX public keys:', error.message);
        throw error;
    }
}

// ============================================
// STEP 2: DECODE JWT HEADER
// ============================================

// Decode JWT header
function decodeJWTHeader(token: string): { kid: string; alg: string } {
    try {
        // Split token into parts
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format: must have 3 parts (header.payload.signature)');
        }

        // Get JWT header
        const headerBase64 = parts[0];
        // Decode header from base64url
        const headerJson = Buffer.from(headerBase64, 'base64url').toString('utf-8');
        const header = JSON.parse(headerJson);

        if (!header.kid) {
            throw new Error('JWT header missing kid (key ID)');
        }

        return {
            kid: header.kid,
            alg: header.alg || 'RS256',
        };
    } catch (error: any) {
        throw new Error(`Failed to decode JWT header: ${error.message}`);
    }
}

// ============================================
// STEP 3: VERIFY JWT TOKEN (LOW LEVEL)
// ============================================

// Verify JWT token
async function verifyMindXIdToken(token: string): Promise<MindXTokenPayload> {
    console.log('🔍 Starting token verification...');

    // Get JWT header
    const { kid, alg } = decodeJWTHeader(token);
    console.log(`🔑 JWT token using key ID: ${kid}, algorithm: ${alg}`);

    // Check algorithm
    if (alg !== 'RS256') {
        throw new Error(`Unsupported algorithm: ${alg}. Only RS256 is supported`);
    }

    // Get public keys
    const publicKeys = await fetchMindXPublicKeys();
    const publicKeyPEM = publicKeys.get(kid);

    if (!publicKeyPEM) {
        throw new Error(`Public key with kid=${kid} not found in JWKS. MindX may have rotated keys.`);
    }

    // Verify signature and decode payload
    let payload: any;
    
    try {
        payload = jwt.verify(token, publicKeyPEM, {
            algorithms: ['RS256'],
        }) as MindXTokenPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error(`Invalid token: ${error.message}`);
        }
        throw error;
    }

    // Verify issuer
    if (payload.iss !== MINDX_ISSUER) {
        throw new Error(`Invalid issuer: ${payload.iss}. Must be ${MINDX_ISSUER}`);
    }

    // Verify audience
    if (payload.aud !== CLIENT_ID) {
        throw new Error(`Invalid audience: ${payload.aud}. Must be ${CLIENT_ID}`);
    }

    console.log('✅ Token verified successfully!');
    return payload;
}

// ============================================
// API ENDPOINTS
// ============================================

// POST /api/login - Verify MindX ID Token
app.post('/api/login', async (
    req: Request<{}, {}, LoginRequest>, 
    res: Response<LoginResponse>
) => {
    // Get token from request
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ 
            success: false, 
            message: "Token is required" 
        });
    }

    try {
        // Verify token
        const payload = await verifyMindXIdToken(token);
        // Extract user info
        const { sub, name, email, preferred_username, given_name, family_name } = payload;

        // Create display name
        const displayName = name || 
                           (given_name && family_name ? `${given_name} ${family_name}` : null) ||
                           preferred_username ||
                           sub;

        console.log(`✅ User ${displayName} (${email || sub}) authenticated successfully.`);
        console.log(`📋 Token payload:`, {
            sub,
            name: displayName,
            email,
            preferred_username,
            iss: payload.iss,
            aud: payload.aud,
            exp: new Date(payload.exp * 1000).toISOString(),
            iat: new Date(payload.iat * 1000).toISOString(),
        });

        res.status(200).json({
            success: true,
            user: {
                id: sub,
                name: displayName,
                email: email,
                username: preferred_username
            }
        });

    } catch (error: any) {
        console.error("❌ Authentication failed:", error.message);
        res.status(401).json({ 
            success: false, 
            message: error.message || "Invalid token" 
        });
    }
});

// GET /api/jwks - View cached public keys
app.get('/api/jwks', async (req: Request, res: Response) => {
    try {
        const keys = await fetchMindXPublicKeys();
        res.json({
            keysCount: keys.size,
            keyIds: Array.from(keys.keys()),
            cacheExpiry: new Date(keysExpiry).toISOString(),
            jwksUri: MINDX_JWKS_URI,
            note: 'Public keys are cached for 1 hour'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/health - Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        issuer: MINDX_ISSUER,
        clientId: CLIENT_ID,
        environment: isProduction ? 'production' : 'development',
        frontendUrl: FRONTEND_URL
    });
});

// GET /api/config - OpenID configuration
app.get('/api/config', (req: Request, res: Response) => {
    res.json({
        issuer: MINDX_ISSUER,
        authorizationEndpoint: MINDX_AUTHORIZATION_ENDPOINT,
        tokenEndpoint: MINDX_TOKEN_ENDPOINT,
        userinfoEndpoint: MINDX_USERINFO_ENDPOINT,
        jwksUri: MINDX_JWKS_URI,
        clientId: CLIENT_ID,
        scopesSupported: ['openid', 'profile', 'email'],
        responseTypesSupported: ['code', 'id_token', 'code id_token']
    });
});

// POST /api/callback - Exchange authorization code for ID Token
interface CallbackRequest {
    code: string;
    redirect_uri: string;
    code_verifier?: string;
}

interface TokenResponse {
    access_token?: string;
    id_token: string;
    token_type?: string;
    expires_in?: number;
}

app.post('/api/callback', async (
    req: Request<{}, {}, CallbackRequest>,
    res: Response<LoginResponse & { idToken?: string }>
) => {
    const { code, redirect_uri, code_verifier } = req.body;

    if (!code) {
        return res.status(400).json({
            success: false,
            message: "Authorization code is required"
        });
    }

    console.log('📥 Received authorization code from frontend');
    console.log('🔑 Code:', code.substring(0, 20) + '...');

    try {
        console.log('🔄 Exchanging code for token from MindX...');

        // Create token params
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        });

        // Add PKCE code verifier if provided
        if (code_verifier) {
            tokenParams.append('code_verifier', code_verifier);
        }

        // Exchange code for token
        const tokenResponse = await fetch(MINDX_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenParams.toString()
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('❌ Error from MindX token endpoint:', errorText);
            throw new Error(`Failed to exchange code: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }

        const tokenData: TokenResponse = await tokenResponse.json();
        console.log('✅ Received token from MindX');

        if (!tokenData.id_token) {
            throw new Error('ID token not found in response');
        }

        // Verify token
        const payload = await verifyMindXIdToken(tokenData.id_token);
        // Extract user info
        const { sub, name, email, preferred_username, given_name, family_name } = payload;

        // Create display name
        const displayName = name ||
            (given_name && family_name ? `${given_name} ${family_name}` : null) ||
            preferred_username ||
            sub;

        console.log(`✅ User ${displayName} (${email || sub}) authenticated successfully.`);
        console.log(`📋 Token payload:`, {
            sub,
            name: displayName,
            email,
            preferred_username,
            iss: payload.iss,
            aud: payload.aud,
            exp: new Date(payload.exp * 1000).toISOString(),
        });

        res.status(200).json({
            success: true,
            user: {
                id: sub,
                name: displayName,
                email: email,
                username: preferred_username
            },
            idToken: tokenData.id_token
        });

    } catch (error: any) {
        console.error("❌ Authentication failed:", error.message);
        res.status(401).json({
            success: false,
            message: error.message || "Failed to exchange code for token"
        });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 OpenID Connect Authentication Server - MindX (Production)');
    console.log('='.repeat(60));
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🔑 Client ID: ${CLIENT_ID}`);
    console.log(`🌐 Issuer: ${MINDX_ISSUER}`);
    console.log(`📚 JWKS endpoint: ${MINDX_JWKS_URI}`);
    console.log(`🔐 Authorization endpoint: ${MINDX_AUTHORIZATION_ENDPOINT}`);
    console.log(`🎯 Frontend URL: ${FRONTEND_URL}`);
    console.log('='.repeat(60));
    console.log('📡 Endpoints:');
    console.log('   POST /api/login   - Verify MindX ID Token');
    console.log('   POST /api/callback - Exchange code for token');
    console.log('   GET  /api/jwks    - View cached public keys');
    console.log('   GET  /api/config  - OpenID configuration');
    console.log('   GET  /api/health  - Health check');
    console.log('='.repeat(60));
});