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
      backgroundColor: '#F9FAFB', // --color-bg-primary
      color: '#111827', // --color-text-primary
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1000px',
        width: '100%'
      }}>
        {/* Login Form */}
        <div style={{
          backgroundColor: '#FFFFFF', // --color-bg-secondary
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB', // --color-border-subtle
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          {/* Braze Authentication Section */}
          <h3 style={{ 
            color: '#1D244F', // Deep Navy
            marginBottom: '8px',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔐 Braze Authentication
          </h3>
          <p style={{ 
            color: '#6B7280', // --color-text-secondary
            marginBottom: '25px',
            fontSize: '14px'
          }}>
            {hasStoredCredentials 
              ? "Enter your Braze dashboard credentials to get started"
              : "Enter your Braze dashboard credentials to get started"
            }
          </p>

          {success && (
            <div style={{
              backgroundColor: '#E6F9F4', // Success Green BG
              color: '#008767', // Success Green text
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #E5E7EB'
            }}>
              ✅ Authentication successful! Redirecting to campaigns...
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#FEE4E2', // Danger Red BG
              color: '#D92D20', // Danger Red text
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #E5E7EB'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#111827', // --color-text-primary
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
                  backgroundColor: '#FFFFFF', // --color-bg-secondary
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '6px',
                  color: '#111827', // --color-text-primary
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'} // Vibrant Teal focus
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                placeholder="https://dashboard-XX.braze.com"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#111827', // --color-text-primary
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
                  backgroundColor: '#FFFFFF', // --color-bg-secondary
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '6px',
                  color: '#111827', // --color-text-primary
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'} // Vibrant Teal focus
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                placeholder="Enter your session ID"
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#111827', // --color-text-primary
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
                  backgroundColor: '#FFFFFF', // --color-bg-secondary
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '6px',
                  color: '#111827', // --color-text-primary
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'} // Vibrant Teal focus
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                backgroundColor: loading ? '#6B7280' : '#00AFB9', // Vibrant Teal or disabled
                color: '#FFFFFF', // --color-text-on-interactive
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#009DA6'; // Hover state
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#00AFB9';
                }
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
                  color: '#D92D20', // Danger Red
                  border: '1px solid #D92D20',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '10px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#D92D20';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#D92D20';
                }}
              >
                🗑️ Clear Stored Credentials
              </button>
            )}
          </form>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#F9FAFB', // --color-bg-primary (subtle background)
            borderRadius: '6px',
            border: '1px solid #E5E7EB'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              color: '#1D244F', // Deep Navy
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💡 How to get credentials:
            </h4>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#6B7280', // --color-text-secondary
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