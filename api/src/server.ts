import express from 'express';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { 
    PORT, 
    isProduction, 
    CLIENT_ID, 
    MINDX_ISSUER, 
    MINDX_JWKS_URI, 
    MINDX_AUTHORIZATION_ENDPOINT, 
    FRONTEND_URL 
} from './config';

// ============================================
// CREATE EXPRESS APP
// ============================================

const app = express();

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

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
