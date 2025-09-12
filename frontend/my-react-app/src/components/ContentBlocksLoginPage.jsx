import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ContentBlocksLoginPage() {
  const [credentials, setCredentials] = useState({
    sessionId: '',
    appGroupId: '',
    dashboardNumber: 9
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const navigate = useNavigate();

  // Auto-populate if credentials exist in localStorage
  useEffect(() => {
    // Try to load from unified Braze credentials first
    const savedCredentials = localStorage.getItem('brazeCredentials');
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials);
        setCredentials({
          sessionId: parsed.session_id || '',
          appGroupId: parsed.app_group_id || '',
          dashboardNumber: parsed.dashboard_number || 9
        });
        if (parsed.session_id || parsed.app_group_id) {
          setHasAutoPopulated(true);
        }
      } catch (e) {
        console.error('Error parsing saved credentials:', e);
        // Fall back to content block specific credentials
        const contentBlockCredentials = localStorage.getItem('brazeContentBlockCredentials');
        if (contentBlockCredentials) {
          try {
            const parsed = JSON.parse(contentBlockCredentials);
            setCredentials(parsed);
            if (parsed.sessionId || parsed.appGroupId) {
              setHasAutoPopulated(true);
            }
          } catch (e) {
            console.error('Error parsing content block credentials:', e);
          }
        }
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConnect = async () => {
    if (!credentials.sessionId.trim() || !credentials.appGroupId.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save credentials to both unified and specific localStorage keys
      const credentialsData = {
        sessionId: credentials.sessionId,
        appGroupId: credentials.appGroupId,
        dashboardNumber: credentials.dashboardNumber
      };
      
      // For content block specific usage
      localStorage.setItem('brazeContentBlockCredentials', JSON.stringify(credentialsData));
      
      // For unified Braze credentials (compatible with main login)
      const unifiedCredentials = {
        session_id: credentials.sessionId,
        app_group_id: credentials.appGroupId,
        dashboard_number: credentials.dashboardNumber
      };
      localStorage.setItem('brazeCredentials', JSON.stringify(unifiedCredentials));
      
      // Navigate to content blocks page
      navigate('/content-blocks');
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      color: '#111827',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              color: '#1D244F',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              🧩 Braze Content Blocks
            </h1>
            <p style={{
              color: '#6B7280',
              fontSize: '16px',
              margin: 0
            }}>
              Connect to your Braze account to fetch content blocks
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Braze Dashboard Number (1-100) *
              </label>
              <input
                type="number"
                name="dashboardNumber"
                min="1"
                max="100"
                value={credentials.dashboardNumber}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  dashboardNumber: parseInt(e.target.value) || 9
                }))}
                placeholder="9"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
              <p style={{
                color: '#6B7280',
                fontSize: '12px',
                margin: '4px 0 0 0'
              }}>
                Will connect to: https://dashboard-{String(credentials.dashboardNumber).padStart(2, '0')}.braze.com
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Session ID *
              </label>
              <input
                type="text"
                name="sessionId"
                value={credentials.sessionId}
                onChange={handleInputChange}
                placeholder="Enter your Braze session ID"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                App Group ID *
              </label>
              <input
                type="text"
                name="appGroupId"
                value={credentials.appGroupId}
                onChange={handleInputChange}
                placeholder="Enter your Braze app group ID"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00AFB9'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            {/* Help Text */}
            <div style={{
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                color: '#0C4A6E',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                💡 How to find your credentials:
              </h4>
              <ul style={{
                color: '#0369A1',
                fontSize: '13px',
                margin: 0,
                paddingLeft: '20px'
              }}>
                <li style={{ marginBottom: '4px' }}>Login to your Braze dashboard</li>
                <li style={{ marginBottom: '4px' }}>Session ID: Check browser cookies for '_session_id'</li>
                <li style={{ marginBottom: '4px' }}>Dashboard Number: Enter a number from 1-100 (e.g., 9 for dashboard-09)</li>
              </ul>
              {hasAutoPopulated && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  borderRadius: '4px',
                  color: '#166534',
                  fontSize: '12px'
                }}>
                  ✅ Credentials auto-populated from previous session
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#F3F4F6';
              }}
            >
              ← Back
            </button>

            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px 20px',
                backgroundColor: loading ? '#9CA3AF' : '#00AFB9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#009DA6';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#00AFB9';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Connecting...
                </>
              ) : (
                <>🚀 Connect & Fetch Content Blocks</>
              )}
            </button>
          </div>

          {/* Clear Credentials Button */}
          {hasAutoPopulated && (
            <div style={{
              marginTop: '16px',
              textAlign: 'center'
            }}>
              <button
                onClick={() => {
                  localStorage.removeItem('brazeCredentials');
                  localStorage.removeItem('brazeContentBlockCredentials');
                  setCredentials({
                    sessionId: '',
                    appGroupId: '',
                    dashboardNumber: 9
                  });
                  setHasAutoPopulated(false);
                  setError('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#DC2626',
                  border: '1px solid #DC2626',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#DC2626';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#DC2626';
                }}
              >
                🗑️ Clear Stored Credentials
              </button>
            </div>
          )}
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

export default ContentBlocksLoginPage;
