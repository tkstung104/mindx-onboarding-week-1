import express from 'express';
import cors from 'cors';
import { isProduction, FRONTEND_URL } from './config';

// ============================================
// MIDDLEWARE
// ============================================

export function setupMiddleware(app: express.Application) {
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
}

