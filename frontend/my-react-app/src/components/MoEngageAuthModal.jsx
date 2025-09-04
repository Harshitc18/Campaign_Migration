import React, { useState } from 'react';

function MoEngageAuthModal({ isOpen, onClose, onAuthenticate, selectedCampaigns }) {
  const [authData, setAuthData] = useState({
    bearer_token: '',
    refresh_token: '',
    api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
      api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #404040',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid #404040'
        }}>
          <h2 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            🔐 MoEngage Authentication
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Campaign Info */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '25px',
          border: '1px solid #404040'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>
            📋 Migration Summary
          </h4>
          <p style={{ margin: '0', color: '#b3b3b3', fontSize: '14px' }}>
            You are about to migrate <strong style={{ color: '#ffffff' }}>{selectedCampaigns.size}</strong> campaign(s) to MoEngage.
            Please provide your MoEngage API credentials to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Bearer Token *
            </label>
            <input
              type="text"
              value={authData.bearer_token}
              onChange={(e) => setAuthData({...authData, bearer_token: e.target.value})}
              required
              placeholder="Enter your MoEngage Bearer Token"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #404040',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Refresh Token *
            </label>
            <input
              type="text"
              value={authData.refresh_token}
              onChange={(e) => setAuthData({...authData, refresh_token: e.target.value})}
              required
              placeholder="Enter your MoEngage Refresh Token"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #404040',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
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
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #404040',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              readOnly
            />
            <small style={{ color: '#b3b3b3', fontSize: '12px' }}>
              This URL is pre-configured for MoEngage dashboard-01
            </small>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #f5c6cb'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                backgroundColor: '#6c757d',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#555' : '#28a745',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '🔄 Authenticating...' : '🚀 Start Migration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MoEngageAuthModal;
