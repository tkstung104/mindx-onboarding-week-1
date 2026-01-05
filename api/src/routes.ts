import express, { Request, Response } from 'express';
import { 
    LoginRequest, 
    LoginResponse, 
    CallbackRequest, 
    TokenResponse 
} from './types';
import { 
    MINDX_ISSUER,
    MINDX_AUTHORIZATION_ENDPOINT,
    MINDX_TOKEN_ENDPOINT,
    MINDX_USERINFO_ENDPOINT,
    MINDX_JWKS_URI,
    CLIENT_ID,
    CLIENT_SECRET,
    isProduction,
    FRONTEND_URL
} from './config';
import { verifyMindXIdToken, createDisplayName, fetchMindXPublicKeys, getKeysExpiry } from './auth';

// ============================================
// API ENDPOINTS
// ============================================

export function setupRoutes(app: express.Application) {
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
            const { sub, email, preferred_username } = payload;
            const displayName = createDisplayName(payload);

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
                cacheExpiry: new Date(getKeysExpiry()).toISOString(),
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
            const { sub, email, preferred_username } = payload;
            const displayName = createDisplayName(payload);

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
}

