# MindX Onboarding - Week 1 Project

Full-stack application with React frontend and Node.js/Express API, designed to deploy on Azure Cloud with Kubernetes and integrated OpenID Connect authentication with MindX Identity Provider.

## 📋 Description

Full-stack web application including:
- **Frontend**: React + TypeScript + Vite with React Router
- **Backend**: Node.js + Express + TypeScript
- **Authentication**: OpenID Connect with MindX Identity Provider (`https://id-dev.mindx.edu.vn`)
- **Deployment**: Docker containers on Azure Kubernetes Service (AKS)
- **HTTPS**: Custom domain with automatic SSL certificate (Let's Encrypt)

## 🛠️ Tech Stack

### Frontend
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- React Router DOM 6.x
- Axios 1.13.2

### Backend
- Node.js 20
- Express 5.2.1
- TypeScript 5.9.3
- JSON Web Token (JWT) 9.0.3
- CORS 2.8.5
- OpenID Connect (low-level implementation)

### DevOps
- Docker (Multi-stage builds)
- Kubernetes
- Azure Cloud (AKS, ACR)
- Nginx Ingress Controller
- cert-manager (Let's Encrypt)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Docker (for containerization)
- Azure CLI (for deployment)
- kubectl (for Kubernetes)

### Local Development

#### Backend API
```bash
cd api
npm install
npm run dev  # Development server with hot reload
```

API will run at: `http://localhost:3000`

#### Frontend
```bash
cd frontend
npm install
npm run dev  # Development server
```

Frontend will run at: `http://localhost:5173`

### Docker Compose (Local Full-Stack)

```bash
# From root directory
docker-compose up --build
```

- **Backend API**: `http://localhost:3000`
- **Frontend**: `http://localhost:8080`

## 🔐 Authentication

The application uses **OpenID Connect** with MindX Identity Provider:

- **Flow**: Authorization Code + PKCE (Proof Key for Code Exchange)
- **Provider**: `https://id-dev.mindx.edu.vn`
- **Token Validation**: JWKS (JSON Web Key Set) verification
- **Security**: State parameter to prevent CSRF attacks

### Authentication Flow

1. User clicks "Login with MindX" on frontend
2. Frontend redirects to MindX authorization endpoint
3. User logs in on MindX
4. MindX redirects to `/callback` with authorization code
5. Frontend sends code to backend `/api/callback`
6. Backend exchanges code for ID Token from MindX
7. Backend verifies ID Token with JWKS
8. Backend returns user info to frontend
9. Frontend saves user info and displays it

For full details about authentication flow, see [Documentation](./documentation.md#authentication-flow).

## 🌐 API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/config` - OpenID configuration (for frontend)
- `GET /api/jwks` - View cached public keys (debug)
- `POST /api/callback` - Exchange authorization code for ID Token
- `POST /api/login` - Verify MindX ID Token (alternative flow)

## ☁️ Production Deployment

The application is deployed on Azure Kubernetes Service (AKS):

- **Frontend**: `https://tungha104.id.vn`
- **Backend API**: `https://tungha104.id.vn/api`
- **HTTPS**: Automatic with Let's Encrypt certificate

### Deployment Process

For details about setup and deployment, see [Documentation](./documentation.md#deployment).

Summary:
1. Build Docker images
2. Push images to Azure Container Registry (ACR)
3. Deploy to AKS with Kubernetes manifests
4. Configure Ingress with TLS
5. Setup DNS and SSL certificates

## 📁 Project Structure

```
mindx-onboarding/
├── api/                    # Backend API
│   ├── src/
│   │   ├── server.ts       # Express server entry point
│   │   ├── auth.ts         # OpenID Connect authentication
│   │   ├── config.ts       # Configuration management
│   │   ├── middleware.ts   # Express middleware
│   │   ├── routes.ts       # API routes
│   │   └── types.ts        # TypeScript types
│   ├── Dockerfile          # Multi-stage Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── App.tsx         # Main component with OpenID login
│   │   ├── Callback.tsx    # OAuth callback handler
│   │   ├── api.ts          # API client
│   │   └── main.tsx        # Entry point with React Router
│   ├── Dockerfile          # Multi-stage build with Nginx
│   ├── package.json
│   └── vite.config.ts
│
├── k8s/                    # Kubernetes manifests
│   ├── api/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── secret.yaml      # MindX OAuth secrets
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── ingress.yaml        # Ingress with TLS
│   └── cluster-issuer.yaml # cert-manager configuration
│
├── docker-compose.yml      # Local development
├── README.md               # This file
├── documentation.md        # Detailed setup, deployment, auth flow
├── architecture.md         # System architecture
├── metrics.md              # Metrics & monitoring guide
└── overview.md             # Acceptance criteria checklist
```

## 🔧 Environment Variables

### Backend (Production)
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://tungha104.id.vn
MINDX_CLIENT_ID=mindx-onboarding
MINDX_CLIENT_SECRET=<base64-encoded-secret>
```

### Backend (Local Development)
Create `.env` file in `api/` directory:
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
MINDX_CLIENT_ID=mindx-onboarding
MINDX_CLIENT_SECRET=<your-secret>
```

## 📚 Documentation

Full details about:
- **Setup**: Installation and local running
- **Deployment**: Deploy to Azure Cloud
- **Authentication Flow**: Detailed OpenID Connect flow
- **Metrics & Monitoring**: Azure App Insights and Google Analytics

👉 See [Documentation](./documentation.md) | [Metrics Guide](./metrics.md)

## 📝 Scripts

### Backend
- `npm run dev` - Development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Production server

### Frontend
- `npm run dev` - Development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎯 Features

- ✅ OpenID Connect authentication with MindX
- ✅ PKCE (Proof Key for Code Exchange) security
- ✅ JWKS token verification
- ✅ HTTPS with Let's Encrypt
- ✅ Custom domain support
- ✅ React Router with protected routes
- ✅ Docker multi-stage builds
- ✅ Kubernetes deployment
- ✅ Health checks and monitoring

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC

## 👥 Authors

MindX Engineering Team

## 🙏 Acknowledgments

- MindX for the onboarding program
- Azure Cloud Platform
- React and Express communities
- OpenID Connect specification
