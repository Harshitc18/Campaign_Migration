import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  // State to hold the form input values
  const [dashboardUrl, setDashboardUrl] = useState('https://dashboard-09.braze.com');
  const [sessionId, setSessionId] = useState('');
  const [appGroupId, setAppGroupId] = useState('');

  // State for loading and error messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  const navigate = useNavigate();

  // Effect to load stored credentials on component mount
  useEffect(() => {
    const storedCredentials = localStorage.getItem('brazeCredentials');
    if (storedCredentials) {
      try {
        const credentials = JSON.parse(storedCredentials);
        setDashboardUrl(credentials.dashboard_url || 'https://dashboard-09.braze.com');
        setSessionId(credentials.session_id || '');
        setAppGroupId(credentials.app_group_id || '');
        setHasStoredCredentials(true);
      } catch (err) {
        console.error('Error parsing stored credentials:', err);
        // Clear invalid stored credentials
        localStorage.removeItem('brazeCredentials');
      }
    }
  }, []);

  // Function to handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!sessionId || !appGroupId) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      // Create credentials object to store
      const brazeCredentials = {
        dashboard_url: dashboardUrl,
        session_id: sessionId,
        app_group_id: appGroupId
      };

      // Store credentials in localStorage for the frontend to use
      localStorage.setItem('brazeCredentials', JSON.stringify(brazeCredentials));
      
      setSuccess(true);
      setError('');
      
      // Navigate to campaigns page after successful login
      setTimeout(() => {
        navigate('/campaigns');
      }, 1500);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '40px',
        maxWidth: '900px',
        width: '100%',
        alignItems: 'start'
      }}>
        {/* Left Column - Welcome Section */}
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #404040'
        }}>
          <h1 style={{
            margin: '0 0 20px 0',
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🚀 Migration Tool Kit
          </h1>
          
          <p style={{
            marginBottom: '30px',
            lineHeight: '1.6',
            color: '#b3b3b3',
            fontSize: '16px'
          }}>
            Seamlessly migrate your Braze campaigns to MoEngage with our automated migration tool. 
            Get started by authenticating with your Braze dashboard.
          </p>

          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #404040',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#ffffff',
              marginTop: '0',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              ✨ Features
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '8px', color: '#b3b3b3' }}>
                📧 Email campaign migration
              </li>
              <li style={{ marginBottom: '8px', color: '#b3b3b3' }}>
                📱 Push notification migration
              </li>
              <li style={{ marginBottom: '8px', color: '#b3b3b3' }}>
                💬 SMS campaign migration
              </li>
              <li style={{ marginBottom: '8px', color: '#b3b3b3' }}>
                🔄 Automated content conversion
              </li>
              <li style={{ color: '#b3b3b3' }}>
                📊 Real-time progress tracking
              </li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #404040'
          }}>
            <h3 style={{ 
              color: '#ffffff', 
              marginTop: '0',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              🧪 Testing Tools
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => navigate('/push-migrator')}
                style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#FF6B35', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#E55A2B'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#FF6B35'}
              >
                📱 Push Migration Testing
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #404040'
        }}>
          {/* Braze Authentication Section */}
          <h3 style={{ 
            color: '#ffffff', 
            marginBottom: '8px',
            fontSize: '18px'
          }}>
            🔐 Braze Authentication
          </h3>
          <p style={{ 
            color: '#b3b3b3', 
            marginBottom: '25px',
            fontSize: '14px'
          }}>
            {hasStoredCredentials 
              ? "✅ Credentials found! Click 'Start Migration' to continue or update fields below"
              : "Enter your Braze dashboard credentials to get started"
            }
          </p>

          {hasStoredCredentials && (
            <div style={{
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #bee5eb'
            }}>
              💾 Using stored credentials. You can update them below if needed.
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #c3e6cb'
            }}>
              ✅ Authentication successful! Redirecting to campaigns...
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Dashboard URL
              </label>
              <input
                type="text"
                value={dashboardUrl}
                onChange={(e) => setDashboardUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="https://dashboard-XX.braze.com"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Session ID *
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your session ID"
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                App Group ID *
              </label>
              <input
                type="text"
                value={appGroupId}
                onChange={(e) => setAppGroupId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your app group ID"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#555' : (hasStoredCredentials ? '#28a745' : '#007bff'),
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Authenticating...
                </span>
              ) : (
                hasStoredCredentials ? '🚀 Start Migration' : '🚀 Save & Start Migration'
              )}
            </button>

            {hasStoredCredentials && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('brazeCredentials');
                  setDashboardUrl('https://dashboard-09.braze.com');
                  setSessionId('');
                  setAppGroupId('');
                  setHasStoredCredentials(false);
                  setError('');
                  setSuccess(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#dc3545',
                  border: '1px solid #dc3545',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '10px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc3545';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#dc3545';
                }}
              >
                🗑️ Clear Stored Credentials
              </button>
            )}
          </form>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            border: '1px solid #404040'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              color: '#ffffff',
              fontSize: '14px'
            }}>
              💡 How to get credentials:
            </h4>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#b3b3b3',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              <li>Log into your Braze dashboard</li>
              <li>Open browser developer tools (F12)</li>
              <li>Go to Application/Storage → Cookies</li>
              <li>Find 'session_id' and 'app_group_id'</li>
            </ol>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default LoginPage;