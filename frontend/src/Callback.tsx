import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');
  const [message, setMessage] = useState('Please wait a moment');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const errorParam = urlParams.get('error');

    // Remove query params from URL
    window.history.replaceState({}, document.title, window.location.pathname);

    if (errorParam) {
      console.error('❌ Error from MindX:', errorParam);
      showError(`Login error: ${errorParam}`);
      return;
    }

    if (!code) {
      showError('Did not receive authorization code from MindX');
      return;
    }

    console.log('='.repeat(60));
    console.log('📥 Received authorization code from MindX');
    console.log('🔑 Code:', code.substring(0, 20) + '...');

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      console.error('❌ State mismatch!');
      showError('State does not match. Possible CSRF attack.');
      return;
    }

    try {
      // Send code to backend to exchange for token
      console.log('📤 Sending code to backend to exchange for token...');

      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      
      const response = await api.post('/callback', {
        code: code,
        redirect_uri: `${window.location.origin}/callback`,
        code_verifier: codeVerifier
      });

      console.log('📥 Response status:', response.status);

      if (response.data.success && response.data.user) {
        // Save user info to sessionStorage
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
        sessionStorage.setItem('idToken', response.data.idToken || '');
        
        // Remove state and code_verifier
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');

        // Show success and redirect to main page
        showSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }

    } catch (error: any) {
      console.error('❌ Error:', error);
      showError('Error exchanging code for token: ' + (error.response?.data?.message || error.message));
    }
  }

  function showError(errorMessage: string) {
    setStatus('Error');
    setMessage('');
    setError(errorMessage);
    setSuccess(null);
  }

  function showSuccess(successMessage: string) {
    setStatus('Success!');
    setMessage('');
    setSuccess(successMessage);
    setError(null);
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
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>{status}</h1>
        <p style={{ color: '#666', margin: '10px 0' }}>{message}</p>
        {error && (
          <div style={{
            color: '#c33',
            background: '#fee',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            color: '#3c3',
            background: '#efe',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            {success}
          </div>
        )}
      </div>
    </div>
  );
}

export default Callback;

