# MindX Onboarding - Documentation

Detailed documentation about setup, deployment, and authentication flow for Week 1 project.

## 📑 Table of Contents

1. [Setup](#setup)
2. [Deployment](#deployment)
3. [Authentication Flow](#authentication-flow)
4. [Troubleshooting](#troubleshooting)

---

## Setup

### Prerequisites

Before starting, ensure you have installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Docker** - [Download](https://www.docker.com/get-started)
- **Azure CLI** - [Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **kubectl** - [Install Guide](https://kubernetes.io/docs/tasks/tools/)
- **Git** - Version control

### Local Development Setup

#### 1. Clone Repository

```bash
git clone <repository-url>
cd mindx-onboarding
```

#### 2. Backend Setup

```bash
cd api

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
MINDX_CLIENT_ID=mindx-onboarding
MINDX_CLIENT_SECRET= <your-secret>
EOF

# Run development server
npm run dev
```

Backend will run at: `http://localhost:3000`

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run at: `http://localhost:5173`

#### 4. Test Local Setup

1. Open browser at `http://localhost:5173`
2. Click "Login with MindX"
3. Login with MindX credentials
4. Verify callback flow works correctly

### Docker Setup (Local)

#### Build and run with Docker Compose

```bash
# From root directory
docker-compose up --build
```

Or run each service separately:

```bash
# Build API
cd api
docker build -t mindx-api .
docker run -p 3000:3000 mindx-api

# Build Frontend
cd frontend
docker build -t mindx-frontend .
docker run -p 8080:8080 mindx-frontend
```

---

## Deployment

### Azure Cloud Setup

#### 1. Azure Container Registry (ACR)

```bash
# Login to Azure
az login

# Create or use existing ACR
az acr create --resource-group <resource-group> --name <registry-name> --sku Basic

# Login to ACR
az acr login --name <registry-name>
```

#### 2. Build and Push Docker Images

```bash
# Build API image
docker build -t <registry-name>.azurecr.io/mindx-onboarding-backend:latest ./api

# Build Frontend image
docker build -t <registry-name>.azurecr.io/mindx-onboarding-frontend:latest ./frontend

# Push images
docker push <registry-name>.azurecr.io/mindx-onboarding-backend:latest
docker push <registry-name>.azurecr.io/mindx-onboarding-frontend:latest
```

#### 3. Azure Kubernetes Service (AKS)

##### 3.1. Connect to AKS Cluster

```bash
# Get AKS credentials
az aks get-credentials --resource-group <resource-group> --name <cluster-name>

# Verify connection
kubectl get nodes
```

##### 3.2. Create ACR Secret

```bash
# Get ACR login server
ACR_NAME=<registry-name>
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)

# Create secret for pulling images
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_LOGIN_SERVER \
  --docker-username=<service-principal-id> \
  --docker-password=<service-principal-password> \
  --docker-email=<email>
```

##### 3.3. Create API Secrets

```bash
# Update k8s/api/secret.yaml with base64 value
# Then apply
kubectl apply -f k8s/api/secret.yaml
```

##### 3.4. Deploy Services

```bash
# Deploy API
kubectl apply -f k8s/api/deployment.yaml
kubectl apply -f k8s/api/service.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml

# Deploy Ingress
kubectl apply -f k8s/ingress.yaml
```

##### 3.5. Setup SSL Certificate (cert-manager)

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s

# Apply ClusterIssuer
kubectl apply -f k8s/cluster-issuer.yaml
```

##### 3.6. Configure DNS

1. Get External IP of Ingress:
```bash
kubectl get ingress
```

2. Create A record in DNS provider:
   - Type: A
   - Name: @ (or subdomain)
   - Value: <external-ip>

3. Wait for DNS propagation (may take a few minutes to several hours)

##### 3.7. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# Check certificates
kubectl get certificates

# View logs
kubectl logs -l app=mindx-api
kubectl logs -l app=mindx-frontend
```

### Update Deployment

When there's new code:

```bash
# 1. Build and push new images
docker build -t <registry-name>.azurecr.io/mindx-onboarding-backend:latest ./api
docker push <registry-name>.azurecr.io/mindx-onboarding-backend:latest

docker build -t <registry-name>.azurecr.io/mindx-onboarding-frontend:latest ./frontend
docker push <registry-name>.azurecr.io/mindx-onboarding-frontend:latest

# 2. Restart deployments to pull new images
kubectl rollout restart deployment/api-deployment
kubectl rollout restart deployment/frontend-deployment

# 3. Check rollout status
kubectl rollout status deployment/api-deployment
kubectl rollout status deployment/frontend-deployment
```

---

## Authentication Flow

### OpenID Connect with MindX Identity Provider

The application uses **OpenID Connect Authorization Code Flow with PKCE** to ensure security.

### Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────┐
│ Browser │         │ Frontend │         │   Backend   │         │  MindX   │
│         │         │          │         │    API      │         │    IDP   │
└────┬────┘         └────┬─────┘         └──────┬──────┘         └────┬─────┘
     │                   │                       │                      │
     │ 1. Click Login   │                       │                      │
     ├─────────────────>│                       │                      │
     │                   │                       │                      │
     │                   │ 2. Generate PKCE      │                      │
     │                   │    (code_verifier,   │                      │
     │                   │     code_challenge)   │                      │
     │                   │                       │                      │
     │                   │ 3. Redirect to       │                      │
     │                   │    /auth?client_id=   │                      │
     │                   │    &redirect_uri=     │                      │
     │                   │    &code_challenge=   │                      │
     │                   │    &state=            │                      │
     │                   ├──────────────────────────────────────────────>│
     │                   │                       │                      │
     │                   │                       │  4. User Login       │
     │                   │                       │                      │
     │                   │ 5. Redirect with    │                      │
     │                   │    authorization     │                      │
     │                   │    code + state      │                      │
     │                   │<──────────────────────────────────────────────┤
     │                   │                       │                      │
     │ 6. /callback?     │                       │                      │
     │    code=...&      │                       │                      │
     │    state=...      │                       │                      │
     ├──────────────────>│                       │                      │
     │                   │                       │                      │
     │                   │ 7. POST /api/callback│                      │
     │                   │    {code, redirect_  │                      │
     │                   │     uri, code_       │                      │
     │                   │     verifier}         │                      │
     │                   ├──────────────────────>│                      │
     │                   │                       │                      │
     │                   │                       │ 8. Exchange code     │
     │                   │                       │    for token         │
     │                   │                       ├─────────────────────>│
     │                   │                       │                      │
     │                   │                       │ 9. Return ID Token   │
     │                   │                       │<─────────────────────┤
     │                   │                       │                      │
     │                   │                       │ 10. Verify token     │
     │                   │                       │    with JWKS         │
     │                   │                       │                      │
     │                   │ 11. Return user info │                      │
     │                   │<──────────────────────┤                      │
     │                   │                       │                      │
     │ 12. Display user  │                       │                      │
     │     info          │                       │                      │
     │<──────────────────┤                       │                      │
     │                   │                       │                      │
```

### Step-by-Step Details

#### Step 1-2: Frontend prepares PKCE

```typescript
// Generate code_verifier (random string 128 chars)
const codeVerifier = generateRandomString(128);

// Generate code_challenge (SHA256 hash of code_verifier, base64url encoded)
const codeChallenge = await sha256(codeVerifier);
const codeChallengeBase64 = base64UrlEncode(codeChallenge);

// Save to sessionStorage
sessionStorage.setItem('oauth_code_verifier', codeVerifier);
sessionStorage.setItem('oauth_state', state);
```

#### Step 3: Redirect to MindX

Frontend redirects user to:
```
https://id-dev.mindx.edu.vn/auth?
  client_id=mindx-onboarding&
  redirect_uri=https://tungha104.id.vn/callback&
  response_type=code&
  scope=openid profile email&
  state=<random-state>&
  code_challenge=<code-challenge>&
  code_challenge_method=S256
```

#### Step 4: User logs in on MindX

User enters credentials on MindX Identity Provider.

#### Step 5: MindX redirects to callback

MindX redirects to:
```
https://tungha104.id.vn/callback?
  code=<authorization-code>&
  state=<original-state>
```

#### Step 6-7: Frontend handles callback

```typescript
// Verify state (prevent CSRF)
const savedState = sessionStorage.getItem('oauth_state');
if (state !== savedState) {
  throw new Error('State mismatch');
}

// Send code to backend
const response = await api.post('/api/callback', {
  code: code,
  redirect_uri: `${window.location.origin}/callback`,
  code_verifier: sessionStorage.getItem('oauth_code_verifier')
});
```

#### Step 8-9: Backend exchanges code for token

```typescript
// Backend sends request to MindX token endpoint
const tokenResponse = await fetch('https://id-dev.mindx.edu.vn/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirect_uri,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: code_verifier
  })
});

const tokenData = await tokenResponse.json();
// tokenData.id_token contains JWT token
```

#### Step 10: Backend verifies token

```typescript
// 1. Decode JWT header to get kid (key ID)
const { kid } = decodeJWTHeader(idToken);

// 2. Fetch public keys from JWKS endpoint
const jwks = await fetch('https://id-dev.mindx.edu.vn/jwks');
const publicKeys = parseJWKS(jwks);

// 3. Verify signature with public key
const payload = jwt.verify(idToken, publicKeys[kid], {
  algorithms: ['RS256']
});

// 4. Verify claims (iss, aud, exp)
if (payload.iss !== 'https://id-dev.mindx.edu.vn') {
  throw new Error('Invalid issuer');
}
if (payload.aud !== CLIENT_ID) {
  throw new Error('Invalid audience');
}
```

#### Step 11-12: Return user info

```typescript
// Backend returns
{
  success: true,
  user: {
    id: payload.sub,
    name: payload.name || payload.preferred_username,
    email: payload.email,
    username: payload.preferred_username
  },
  idToken: idToken
}

// Frontend saves to sessionStorage and displays
sessionStorage.setItem('user', JSON.stringify(user));
sessionStorage.setItem('idToken', idToken);
```

### Security Features

1. **PKCE (Proof Key for Code Exchange)**
   - Prevents authorization code interception attacks
   - Code verifier is hashed and sent in authorization request
   - Original code verifier is sent when exchanging code for token

2. **State Parameter**
   - Prevents CSRF attacks
   - Random state is created and verified when receiving callback

3. **JWKS Token Verification**
   - Verify signature with public keys from MindX
   - Verify issuer, audience, expiration
   - Do not trust token without verification

4. **HTTPS Everywhere**
   - All communication over HTTPS
   - SSL certificates automatically renewed with Let's Encrypt

---

## Troubleshooting

### Local Development Issues

#### Backend won't start
```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux

# Check .env file
cat api/.env

# Check logs
npm run dev
```

#### Frontend can't connect to API
```bash
# Check CORS configuration in api/src/server.ts
# Development mode should have: origin: true

# Check if API is running
curl http://localhost:3000/api/health
```

### Deployment Issues

#### Pods won't start
```bash
# Check pod status
kubectl get pods
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Common issues:
# - Image pull errors: Check ACR secret
# - CrashLoopBackOff: Check application logs
# - ImagePullBackOff: Check image exists in ACR
```

#### Ingress not working
```bash
# Check ingress
kubectl get ingress
kubectl describe ingress total-ingress

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check DNS
nslookup tungha104.id.vn
```

#### SSL Certificate issues
```bash
# Check certificate status
kubectl get certificates
kubectl describe certificate mindx-app-tls

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Common issues:
# - DNS not propagated: Wait longer or check DNS records
# - Rate limiting: Let's Encrypt has rate limits
```

#### Authentication not working
```bash
# Check backend logs
kubectl logs -l app=mindx-api

# Check frontend logs
kubectl logs -l app=mindx-frontend

# Verify environment variables
kubectl get deployment api-deployment -o yaml | grep -A 10 env

# Test API endpoints
curl https://tungha104.id.vn/api/health
curl https://tungha104.id.vn/api/config
```

### Common Errors

#### "State mismatch"
- **Cause**: State parameter doesn't match
- **Solution**: Clear browser cache and try again

#### "Invalid token"
- **Cause**: Token has expired or signature is incorrect
- **Solution**: Check JWKS endpoint and token expiration

#### "Failed to exchange code"
- **Cause**: Authorization code has been used or expired
- **Solution**: Try logging in again

#### "CORS error"
- **Cause**: Frontend URL not allowed in CORS config
- **Solution**: Check FRONTEND_URL environment variable

---

## Additional Resources

- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Azure Kubernetes Service Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [cert-manager Documentation](https://cert-manager.io/docs/)

---

## Support

If you encounter issues, please:
1. Check logs and error messages
2. Review this documentation
3. Create an issue on the repository with detailed information

