import { useState, useEffect } from 'react';
import api from './api';
import './App.css';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import ReactGA from 'react-ga4';

// Initialize App Insights
const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
  }
});

// QUAN TRỌNG: Phải thêm telemetry initializer TRƯỚC loadAppInsights()
// Để filter out các requests đến Google Analytics ngay từ đầu
appInsights.addTelemetryInitializer((envelope) => {
  // Kiểm tra nếu là dependency telemetry (outgoing HTTP request)
  const name = envelope.name || '';
  const baseData = envelope.baseData as any;
  
  // Xác định dependency telemetry
  if (name.includes('Dependency') || baseData?.type === 'Dependency' || baseData?.baseType === 'RemoteDependencyData') {
    // Lấy target/url của request
    const target = baseData?.target || baseData?.name || baseData?.url || '';
    
    // Loại trừ tất cả requests đến Google Analytics domains
    if (target && (
      target.includes('google-analytics.com') ||
      target.includes('googletagmanager.com') ||
      target.includes('googleapis.com') ||
      target.includes('analytics.google.com') ||
      target.includes('doubleclick.net') ||
      target.includes('google.com/analytics')
    )) {
      return false; // Không gửi telemetry này lên Azure
    }
  }
  
  return true; // Gửi các telemetry khác bình thường
});

appInsights.loadAppInsights();
appInsights.trackPageView(); // Follow the page view


// Initialize Google Analytics 4
const GA_ID = import.meta.env.VITE_GA_ID;
if (GA_ID) {
  console.log('✅ Google Analytics initialized with ID:', GA_ID);
  try {
    ReactGA.initialize(GA_ID, {
      // Test mode trong development (không gửi request thật)
      testMode: import.meta.env.DEV,
      // Gửi pageview tự động
      gtagOptions: {
        send_page_view: false // Tắt auto pageview, sẽ gửi thủ công
      }
    });
  } catch (error) {
    console.error('❌ Error initializing Google Analytics:', error);
  }
} else {
  console.error('❌ Google Analytics is not initialized');
}



interface OpenIdConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  clientId: string;
  scopesSupported: string[];
  responseTypesSupported: string[];
}

interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
}

function App() {
  const [openIdConfig, setOpenIdConfig] = useState<OpenIdConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize: Load OpenID config and check if user is logged in
  useEffect(() => {
    init();
    checkLoggedInUser();
    
    // Send pageview with error handling
    try {
      ReactGA.send("pageview");
    } catch (error) {
      console.warn('⚠️ Failed to send GA pageview:', error);
    }
  }, []);

  async function init() {
    console.log('🚀 Frontend is ready!');
    const BACKEND_URL = window.location.origin;
    console.log('📍 Backend URL:', BACKEND_URL);

    try {
      // Get OpenID configuration from backend
      const response = await api.get('/config');
      setOpenIdConfig(response.data);
      console.log('✅ OpenID Config:', response.data);
    } catch (error: any) {
      console.error('❌ Could not get config:', error);
      setError('Cannot connect to server. Make sure the server is running.');
    }
  }

  function checkLoggedInUser() {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        console.log('✅ User is logged in:', parsedUser);
      } catch (error) {
        console.error('❌ Error parsing user:', error);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('idToken');
      }
    }
  }

  async function handleLogin() {
    // Track the event for 2 analytics platforms
    appInsights.trackEvent({ name: 'UserStartedLogin' }); //App Insights
    
    try {
      ReactGA.event({
        category: "User",
        action: "Started Login",
        label: "MindX OIDC"
      });
    } catch (error) {
      console.warn('⚠️ Failed to send GA event:', error);
    }

    if (!openIdConfig) {
      setError('OpenID configuration not loaded yet');
      return;
    }

    console.log('='.repeat(60));
    console.log('🔐 Starting login flow...');

    // Generate state and code_verifier for PKCE
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(96);
    const codeChallenge = await sha256(codeVerifier);
    const codeChallengeBase64 = base64UrlEncode(codeChallenge);

    // Save to sessionStorage for later use
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);

    // Create authorization URL
    const params = new URLSearchParams({
      client_id: openIdConfig.clientId,
      redirect_uri: `${window.location.origin}/callback`,
      response_type: 'code',
      scope: 'openid profile email',
      state: state,
      code_challenge: codeChallengeBase64,
      code_challenge_method: 'S256'
    });

    const authUrl = `${openIdConfig.authorizationEndpoint}?${params.toString()}`;
    
    console.log('📤 Redirecting to:', authUrl);
    console.log('='.repeat(60));

    // Redirect to MindX
    window.location.href = authUrl;
  }

  function handleLogout() {
    // Track the event for 2 analytics platforms
    appInsights.trackEvent({ name: 'UserLoggedOut' }); //App Insights
    
    try {
      ReactGA.event({
        category: "User",
        action: "Logged Out",
      });
    } catch (error) {
      console.warn('⚠️ Failed to send GA event:', error);
    }

    // Remove user info and token
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_code_verifier');
    
    // Reset state
    setUser(null);
    setError(null);
    
    console.log('✅ Logged out');
  }

  // Utility functions
  function generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // Convert Uint8Array to base64url
    const base64 = btoa(String.fromCharCode(...array));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async function sha256(message: string): Promise<Uint8Array> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return new Uint8Array(hashBuffer);
  }

  function base64UrlEncode(bytes: Uint8Array): string {
    // Convert Uint8Array to base64url
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{ color: '#333', marginBottom: '10px', fontSize: '28px' }}>
          🔐 MindX OpenID Connect
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          Login with MindX Identity Provider
        </p>

        {!user ? (
          <>
            <div style={{ marginBottom: '30px' }}>
              <button
                onClick={handleLogin}
                disabled={!openIdConfig}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: !openIdConfig ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: !openIdConfig ? 'not-allowed' : 'pointer',
                  transition: 'background 0.3s'
                }}
              >
                🔑 Login with MindX
              </button>
            </div>

            {error && (
              <div style={{
                padding: '15px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                color: '#c33',
                marginTop: '20px'
              }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '10px',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>{user.name || 'User'}</h3>
            <p style={{ color: '#666', margin: '5px 0' }}>
              <strong>User ID:</strong> {user.id}
            </p>
            <p style={{ color: '#666', margin: '5px 0' }}>
              <strong>Email:</strong> {user.email || 'N/A'}
            </p>
            <p style={{ color: '#666', margin: '5px 0' }}>
              <strong>Username:</strong> {user.username || 'N/A'}
            </p>
            <button
              onClick={handleLogout}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;