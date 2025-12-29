# Week 1: App set up on Azure Cloud

## Objectives
Set up an JS/TS Fullstack App on Azure Cloud
- Back-end API
- Front-end React Web App
- HTTPS domain setup
- Registration and Authentication
  - [Standard] Registration and Login, or
  - [More challengging] *Authentication via OpenID (using https://id-dev.mindx.edu.vn)

## Acceptance criterias
- [x] The back-end API is deployed and accessible via a public HTTPS endpoint.
  - ✅ API accessible at `https://tungha104.id.vn/api`
  - ✅ Health check endpoint: `/api/health`
  - ✅ OpenID endpoints: `/api/config`, `/api/callback`, `/api/login`
- [x] The front-end React web app is deployed and accessible via a public HTTPS domain.
  - ✅ Frontend accessible at `https://tungha104.id.vn`
  - ✅ React Router configured with `/` and `/callback` routes
- [x] HTTPS is enforced for all endpoints (front-end and back-end).
  - ✅ Ingress configured with TLS and `ssl-redirect: "true"`
  - ✅ Cert-manager with Let's Encrypt certificate
- [x] Authentication is integrated and functional using OpenID with https://id-dev.mindx.edu.vn.
  - ✅ OpenID Connect flow implemented (Authorization Code + PKCE)
  - ✅ JWKS verification for ID tokens
  - ✅ Integration with MindX Identity Provider
- [x] Users can log in and log out via the front-end using OpenID.
  - ✅ Login button redirects to MindX authorization endpoint
  - ✅ Callback handler processes authorization code
  - ✅ Logout function clears session storage
- [x] After login, authenticated users can access protected routes/pages on the front-end.
  - ✅ User info displayed after successful login
  - ✅ Conditional rendering based on authentication state
  - ✅ Session storage for user data persistence
- [x] The back-end API validates and authorizes requests using the OpenID token.
  - ✅ `verifyMindXIdToken()` function validates JWT tokens
  - ✅ JWKS fetching and caching for public key verification
  - ✅ Token validation in `/api/callback` and `/api/login` endpoints
- [x] All services are running on Azure Cloud infrastructure.
  - ✅ Deployed on Azure Kubernetes Service (AKS)
  - ✅ Images stored in Azure Container Registry (ACR)
  - ✅ Services: api-deployment, frontend-deployment
- [x] Deployment scripts/configs are committed and pushed to the repository pipeline for testing.
  - ✅ Kubernetes manifests in `k8s/` folder
  - ✅ Dockerfiles for both API and Frontend
  - ✅ Ingress configuration with TLS
- [x] Documentation is provided for setup, deployment, and authentication flow.
  - ✅ README.md with setup instructions
  - ✅ architecture.md for system architecture
  - ✅ documentation.md with detailed OpenID flow documentation
