import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { MindXTokenPayload, JWK, JWKSResponse } from './types';
import { MINDX_ISSUER, CLIENT_ID, MINDX_JWKS_URI } from './config';

// ============================================
// JWKS CACHE
// ============================================

// JWKS cache
let cachedKeys: Map<string, string> = new Map();
let keysExpiry: number = 0;

// ============================================
// FETCH MINDX PUBLIC KEYS (JWKS)
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

export function getKeysExpiry(): number {
    return keysExpiry;
}

// ============================================
// DECODE JWT HEADER
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
// VERIFY JWT TOKEN
// ============================================

// Verify JWT token
export async function verifyMindXIdToken(token: string): Promise<MindXTokenPayload> {
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

// Helper function to create display name from token payload
export function createDisplayName(payload: MindXTokenPayload): string {
    const { name, given_name, family_name, preferred_username, sub } = payload;
    return name || 
           (given_name && family_name ? `${given_name} ${family_name}` : null) ||
           preferred_username ||
           sub;
}

// Export JWKS functions for routes
export { fetchMindXPublicKeys };
