// ============================================
// TYPES & INTERFACES
// ============================================

export interface JWK {
    kty: string;  // Key type (RSA)
    use: string;  // Public key use (sig = signature)
    kid: string;  // Key ID
    n: string;    // Modulus (RSA public key component)
    e: string;    // Exponent (RSA public key component)
    alg: string;  // Algorithm (RS256)
}

export interface JWKSResponse {
    keys: JWK[];
}

export interface MindXTokenPayload {
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

export interface LoginRequest {
    token: string;
}

export interface LoginResponse {
    success: boolean;
    user?: {
        id: string;
        name: string;
        email?: string;
        username?: string;
    };
    message?: string;
}

export interface CallbackRequest {
    code: string;
    redirect_uri: string;
    code_verifier?: string;
}

export interface TokenResponse {
    access_token?: string;
    id_token: string;
    token_type?: string;
    expires_in?: number;
}

