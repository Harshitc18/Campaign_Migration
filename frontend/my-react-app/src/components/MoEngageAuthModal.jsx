import React, { useState, useEffect } from 'react';

function MoEngageAuthModal({ isOpen, onClose, onAuthenticate, selectedCampaigns }) {
  const [authData, setAuthData] = useState({
    bearer_token: '',
    refresh_token: '',
    data_center: 'dashboard-01',
    api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasStoredTokens, setHasStoredTokens] = useState(false);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(null);

  // Load stored tokens on component mount
  useEffect(() => {
    if (isOpen) {
      loadStoredTokens();
    }
  }, [isOpen]);

  const loadStoredTokens = () => {
    try {
      const storedTokens = localStorage.getItem('moEngageTokens');
      const storedExpiry = localStorage.getItem('moEngageTokensExpiry');
      
      if (storedTokens && storedExpiry) {
        const expiryTime = new Date(parseInt(storedExpiry));
        const now = new Date();
        
        // Check if tokens are still valid (within 2 hours)
        if (now < expiryTime) {
          const tokens = JSON.parse(storedTokens);
          setAuthData(prev => ({
            ...prev,
            bearer_token: tokens.bearer_token || '',
            refresh_token: tokens.refresh_token || '',
            data_center: tokens.data_center || 'dashboard-01',
            api_url: `https://${tokens.data_center || 'dashboard-01'}.moengage.com/v1.0/campaigns/draft`
          }));
          setHasStoredTokens(true);
          setTokenExpiryTime(expiryTime);
        } else {
          // Tokens expired, remove them
          clearStoredTokens();
        }
      }
    } catch (err) {
      console.error('Error loading stored tokens:', err);
      clearStoredTokens();
    }
  };

  const saveTokensToStorage = (tokens) => {
    try {
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 2); // 2 hours from now
      
      localStorage.setItem('moEngageTokens', JSON.stringify({
        bearer_token: tokens.bearer_token,
        refresh_token: tokens.refresh_token,
        data_center: tokens.data_center || 'dashboard-01'
      }));
      localStorage.setItem('moEngageTokensExpiry', expiryTime.getTime().toString());
      
      // Also save to unified MoEngage credentials for content blocks
      const existingCredentials = localStorage.getItem('moEngageCredentials');
      let credentialsToSave = {
        bearerToken: tokens.bearer_token,
        refreshToken: tokens.refresh_token,
        apiUrl: tokens.api_url || `https://${tokens.data_center || 'dashboard-01'}.moengage.com/v1.0/campaigns/draft`,
        origin: `https://${tokens.data_center || 'dashboard-01'}.moengage.com`,
        dataCenter: tokens.data_center || 'dashboard-01'
      };
      
      if (existingCredentials) {
        try {
          const existing = JSON.parse(existingCredentials);
          credentialsToSave = { ...existing, ...credentialsToSave };
        } catch (e) {
          console.error('Error parsing existing credentials:', e);
        }
      }
      
      localStorage.setItem('moEngageCredentials', JSON.stringify(credentialsToSave));
      
      setHasStoredTokens(true);
      setTokenExpiryTime(expiryTime);
    } catch (err) {
      console.error('Error saving tokens:', err);
    }
  };

  const clearStoredTokens = () => {
    localStorage.removeItem('moEngageTokens');
    localStorage.removeItem('moEngageTokensExpiry');
    localStorage.removeItem('moEngageCredentials'); // Also clear unified credentials
    setHasStoredTokens(false);
    setTokenExpiryTime(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Save tokens to localStorage for 2 hours
      if (authData.bearer_token && authData.refresh_token) {
        saveTokensToStorage(authData);
      }
      
      // Skip validation for now and proceed directly to migration
      // The credentials will be validated during the actual migration process
      onAuthenticate(authData, selectedCampaigns);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAuthData({
      bearer_token: '',
      refresh_token: '',
      data_center: 'dashboard-01',
      api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Add CSS keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(29, 36, 79, 0.8)', // Deep Navy with transparency
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', // --color-bg-secondary
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #E5E7EB', // --color-border-subtle
        boxShadow: '0 20px 50px rgba(29, 36, 79, 0.3)' // Deep Navy shadow
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #E5E7EB' // --color-border-subtle
        }}>
          <div>
            <h2 style={{
              margin: '0 0 8px 0',
              color: '#1D244F', // Deep Navy
              fontSize: '28px',
              fontWeight: '700'
            }}>
              🔐 MoEngage Authentication
            </h2>
            <p style={{
              margin: 0,
              color: '#6B7280', // --color-text-secondary
              fontSize: '16px'
            }}>
              Secure connection to your MoEngage workspace
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280', // --color-text-secondary
              fontSize: '28px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F3F4F6';
              e.target.style.color = '#1D244F';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6B7280';
            }}
          >
            ×
          </button>
        </div>

        {/* Campaign Info */}
        <div style={{
          background: 'linear-gradient(135deg, #F0FDFA 0%, #E6F9F4 100%)', // Light teal gradient
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #A7F3D0' // Light teal border
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#1D244F', // Deep Navy
            fontSize: '18px',
            fontWeight: '600'
          }}>
            📋 Migration Summary
          </h4>
          <p style={{ 
            margin: '0', 
            color: '#047857', // Dark green for good contrast
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            You are about to migrate <strong style={{ 
              color: '#1D244F', // Deep Navy
              backgroundColor: '#FFFFFF',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>{selectedCampaigns.size}</strong> campaign(s) to MoEngage.
            <br />Please provide your MoEngage API credentials to continue.
          </p>
        </div>

        {/* Token Status */}
        {hasStoredTokens && tokenExpiryTime && (
          <div style={{
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', // Light yellow gradient
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #F59E0B' // Orange border
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⏰</span>
              <h5 style={{ 
                margin: '0', 
                color: '#92400E', // Dark orange
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Stored Tokens Found
              </h5>
            </div>
            <p style={{ 
              margin: '0', 
              color: '#92400E', // Dark orange
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              Using saved credentials that expire at {tokenExpiryTime.toLocaleTimeString()} on {tokenExpiryTime.toLocaleDateString()}.
              <br />
              <strong>Tokens will auto-expire in 2 hours</strong> for security.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          background: '#F8F9FF', // Light blue background
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '25px',
          border: '1px solid #E0E7FF'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#1D244F', // Deep Navy
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💡 How to get MoEngage Tokens
          </h4>
          <ol style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#4B5563', // Dark gray
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            <li style={{ marginBottom: '6px' }}>
              <strong>Log into your MoEngage dashboard</strong>
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong>Open browser developer tools</strong> (F12 or right-click → Inspect)
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong>Go to Network tab</strong> and refresh the page
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong>Look for any API request</strong> (e.g., to your selected dashboard.moengage.com)
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong>In Request Headers, find:</strong>
              <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                <li><code style={{ backgroundColor: '#E5E7EB', padding: '2px 4px', borderRadius: '3px' }}>authorization: Bearer [token]</code></li>
                <li><code style={{ backgroundColor: '#E5E7EB', padding: '2px 4px', borderRadius: '3px' }}>refreshtoken: [refresh_token]</code></li>
              </ul>
            </li>
          </ol>
          
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#FEF3C7', // Light yellow
            borderRadius: '6px',
            border: '1px solid #F59E0B'
          }}>
            <p style={{
              margin: '0',
              color: '#92400E', // Dark orange
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🔒</span>
              <strong>Security Note:</strong> Tokens are stored locally for 2 hours only and automatically expire for your security.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Data Center Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#1D244F', // Deep Navy
              marginBottom: '8px',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              MoEngage Data Center *
            </label>
            <select
              value={authData.data_center}
              onChange={(e) => {
                const selectedDC = e.target.value;
                setAuthData({
                  ...authData, 
                  data_center: selectedDC,
                  api_url: `https://${selectedDC}.moengage.com/v1.0/campaigns/draft`
                });
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: '#F9FAFB', // --color-bg-primary
                border: '2px solid #E5E7EB', // --color-border-subtle
                borderRadius: '8px',
                color: '#111827', // --color-text-primary
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00AFB9'; // Vibrant Teal
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 175, 185, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="dashboard-01">Dashboard 01 (dashboard-01.moengage.com)</option>
              <option value="dashboard-02">Dashboard 02 (dashboard-02.moengage.com)</option>
              <option value="dashboard-03">Dashboard 03 (dashboard-03.moengage.com)</option>
              <option value="dashboard-04">Dashboard 04 (dashboard-04.moengage.com)</option>
            </select>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              color: '#1D244F', // Deep Navy
              marginBottom: '8px',
              fontSize: '15px',
              fontWeight: '600',
              alignItems: 'center',
              gap: '8px'
            }}>
              Bearer Token *
              {hasStoredTokens && (
                <span style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  AUTO-FILLED
                </span>
              )}
            </label>
            <input
              type="text"
              value={authData.bearer_token}
              onChange={(e) => setAuthData({...authData, bearer_token: e.target.value})}
              required
              placeholder="Enter your MoEngage Bearer Token"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: '#F9FAFB', // --color-bg-primary
                border: '2px solid #E5E7EB', // --color-border-subtle
                borderRadius: '8px',
                color: '#111827', // --color-text-primary
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00AFB9'; // Vibrant Teal
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 175, 185, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              color: '#1D244F', // Deep Navy
              marginBottom: '8px',
              fontSize: '15px',
              fontWeight: '600',
              alignItems: 'center',
              gap: '8px'
            }}>
              Refresh Token *
              {hasStoredTokens && (
                <span style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  AUTO-FILLED
                </span>
              )}
            </label>
            <input
              type="text"
              value={authData.refresh_token}
              onChange={(e) => setAuthData({...authData, refresh_token: e.target.value})}
              required
              placeholder="Enter your MoEngage Refresh Token"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: '#F9FAFB', // --color-bg-primary
                border: '2px solid #E5E7EB', // --color-border-subtle
                borderRadius: '8px',
                color: '#111827', // --color-text-primary
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00AFB9'; // Vibrant Teal
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 175, 185, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              color: '#1D244F', // Deep Navy
              marginBottom: '8px',
              fontSize: '15px',
              fontWeight: '600'
            }}>
              API URL
            </label>
            <input
              type="text"
              value={authData.api_url}
              onChange={(e) => setAuthData({...authData, api_url: e.target.value})}
              placeholder="MoEngage API URL"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: '#F3F4F6', // Slightly darker for readonly
                border: '2px solid #D1D5DB', // Lighter border for readonly
                borderRadius: '8px',
                color: '#6B7280', // --color-text-secondary
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'Monaco, Consolas, monospace', // Monospace for URL
                cursor: 'not-allowed'
              }}
              readOnly
            />
            <small style={{ 
              color: '#6B7280', // --color-text-secondary
              fontSize: '13px',
              display: 'block',
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              ℹ️ API URL updates automatically based on selected data center
            </small>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FEE4E2', // Danger Red BG
              color: '#D92D20', // Danger Red text
              padding: '16px 20px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '15px',
              border: '1px solid #FECACA', // Light danger border
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Clear Tokens Button */}
          {hasStoredTokens && (
            <div style={{
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <button
                type="button"
                onClick={() => {
                  clearStoredTokens();
                  setAuthData({
                    bearer_token: '',
                    refresh_token: '',
                    data_center: 'dashboard-01',
                    api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
                  });
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#DC2626', // Red
                  border: '1px solid #DC2626',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '0 auto'
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
                🗑️ Clear Stored Tokens
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
            borderTop: '1px solid #E5E7EB' // --color-border-subtle
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                backgroundColor: '#F3F4F6', // Light gray
                color: '#1D244F', // Deep Navy
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                minWidth: '120px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#E5E7EB';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#F3F4F6';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9CA3AF' : '#008767', // Success Green
                color: '#FFFFFF',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                minWidth: '160px',
                boxShadow: loading ? 'none' : '0 2px 4px rgba(0, 135, 103, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#006B4F';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 135, 103, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#008767';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 135, 103, 0.2)';
                }
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #FFFFFF',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Authenticating...
                </span>
              ) : (
                '🚀 Start Migration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default MoEngageAuthModal;
