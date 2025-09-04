import React, { useState } from 'react';
import axios from 'axios';

function BrazeSMSMigrator() {
  const [moEngageCredentials, setMoEngageCredentials] = useState({
    bearer_token: '',
    refresh_token: '',
    origin: 'https://dashboard-01.moengage.com',
    api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
  });

  const [brazeJsonPayload, setBrazeJsonPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Demo JSON payload for testing
  const demoPayload = {
    "campaign_name": "Demo SMS Campaign",
    "campaign_id": "sample_campaign_123",
    "schedule_type": "time_based",
    "schedule_data": {
      "start_date_time": Math.floor(Date.now() / 1000),
      "recurring": false
    },
    "conversion_behaviors": [
      {
        "event_type": "TrackedUserBehavior::UsedApp",
        "conversion_window": 86400
      }
    ],
    "messaging_actions": [
      {
        "message_type": "sms",
        "body": "Hello {{${first_name}}}! Check out our latest offers.",
        "is_control": false
      }
    ]
  };

  const handleCredentialChange = (field, value) => {
    setMoEngageCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (!isDemoMode) {
      setBrazeJsonPayload(JSON.stringify(demoPayload, null, 2));
      setMoEngageCredentials({
        bearer_token: 'demo_bearer_token_123',
        refresh_token: 'demo_refresh_token_456',
        origin: 'https://dashboard-01.moengage.com',
        api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
      });
    } else {
      setBrazeJsonPayload('');
      setMoEngageCredentials({
        bearer_token: '',
        refresh_token: '',
        origin: 'https://dashboard-01.moengage.com',
        api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
      });
    }
  };

  const validateInputs = () => {
    if (!moEngageCredentials.bearer_token.trim()) {
      setError('MoEngage Bearer Token is required');
      return false;
    }
    if (!moEngageCredentials.refresh_token.trim()) {
      setError('MoEngage Refresh Token is required');
      return false;
    }
    if (!brazeJsonPayload.trim()) {
      setError('Braze JSON payload is required');
      return false;
    }

    try {
      JSON.parse(brazeJsonPayload);
    } catch (e) {
      setError('Invalid JSON format in Braze payload');
      return false;
    }

    return true;
  };

  const handleMigration = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const campaignData = JSON.parse(brazeJsonPayload);
      
      const requestBody = {
        campaign: campaignData,
        moengage_credentials: moEngageCredentials
      };

      const response = await axios.post(
        'http://localhost:8083/v1/migrate-sms-campaign',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      setResult(response.data);
      setError('');
    } catch (err) {
      console.error('Migration error:', err);
      
      let errorMessage = 'An unexpected error occurred during migration.';
      
      if (err.response) {
        if (err.response.data && err.response.data.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail;
          } else if (err.response.data.detail.message) {
            errorMessage = err.response.data.detail.message;
          }
        } else {
          errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
        }
      } else if (err.request) {
        errorMessage = 'Cannot connect to SMS converter service. Is it running on port 8083?';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setBrazeJsonPayload('');
    setMoEngageCredentials({
      bearer_token: '',
      refresh_token: '',
      origin: 'https://dashboard-01.moengage.com',
      api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
    });
    setError('');
    setResult(null);
    setIsDemoMode(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
        padding: '40px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '42px',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          📱 Braze SMS Migrator
        </h1>
        <p style={{
          margin: '0',
          fontSize: '18px',
          opacity: '0.9'
        }}>
          Convert Braze SMS campaigns to MoEngage drafts
        </p>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px'
      }}>
        {/* Left Panel - Configuration */}
        <div style={{
          backgroundColor: '#1e1e1e',
          borderRadius: '12px',
          padding: '30px',
          border: '1px solid #333',
          height: 'fit-content'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px'
          }}>
            <h2 style={{
              margin: '0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#ff6b35'
            }}>
              🔐 MoEngage Authentication
            </h2>
            <button
              onClick={handleDemoMode}
              style={{
                backgroundColor: isDemoMode ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isDemoMode ? '✓ Demo Mode' : '🧪 Demo Mode'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                Bearer Token *
              </label>
              <input
                type="password"
                value={moEngageCredentials.bearer_token}
                onChange={(e) => handleCredentialChange('bearer_token', e.target.value)}
                placeholder="Enter your MoEngage bearer token"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #404040',
                  borderRadius: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                onBlur={(e) => e.target.style.borderColor = '#404040'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                Refresh Token *
              </label>
              <input
                type="password"
                value={moEngageCredentials.refresh_token}
                onChange={(e) => handleCredentialChange('refresh_token', e.target.value)}
                placeholder="Enter your MoEngage refresh token"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #404040',
                  borderRadius: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                onBlur={(e) => e.target.style.borderColor = '#404040'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                MoEngage Origin URL
              </label>
              <input
                type="url"
                value={moEngageCredentials.origin}
                onChange={(e) => handleCredentialChange('origin', e.target.value)}
                placeholder="https://dashboard-01.moengage.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #404040',
                  borderRadius: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                onBlur={(e) => e.target.style.borderColor = '#404040'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                MoEngage API URL
              </label>
              <input
                type="url"
                value={moEngageCredentials.api_url}
                onChange={(e) => handleCredentialChange('api_url', e.target.value)}
                placeholder="https://dashboard-01.moengage.com/v1.0/campaigns/draft"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #404040',
                  borderRadius: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                onBlur={(e) => e.target.style.borderColor = '#404040'}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            marginTop: '30px',
            display: 'flex',
            gap: '15px'
          }}>
            <button
              onClick={handleMigration}
              disabled={loading}
              style={{
                flex: '1',
                backgroundColor: loading ? '#6c757d' : '#ff6b35',
                color: 'white',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
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
                  }}></div>
                  Migrating...
                </>
              ) : (
                <>🚀 Migrate SMS Campaign</>
              )}
            </button>

            <button
              onClick={clearForm}
              disabled={loading}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Right Panel - Braze JSON Payload */}
        <div style={{
          backgroundColor: '#1e1e1e',
          borderRadius: '12px',
          padding: '30px',
          border: '1px solid #333',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: '#ff6b35'
          }}>
            📋 Braze SMS Campaign JSON
          </h2>

          <textarea
            value={brazeJsonPayload}
            onChange={(e) => setBrazeJsonPayload(e.target.value)}
            placeholder="Paste your Braze SMS campaign JSON export here..."
            style={{
              flex: '1',
              minHeight: '400px',
              padding: '16px',
              border: '2px solid #404040',
              borderRadius: '8px',
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'Monaco, Consolas, monospace',
              outline: 'none',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
            onBlur={(e) => e.target.style.borderColor = '#404040'}
          />

          <div style={{
            marginTop: '15px',
            fontSize: '14px',
            color: '#b3b3b3',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              {brazeJsonPayload ? `${brazeJsonPayload.length} characters` : 'No JSON data'}
            </span>
            {brazeJsonPayload && (
              <span style={{ color: '#28a745' }}>
                ✓ JSON Ready
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {(result || error) && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 40px auto',
          padding: '0 20px'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #b02a37'
            }}>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                ❌ Migration Failed
              </h3>
              <p style={{ margin: '0', fontSize: '14px' }}>
                {error}
              </p>
            </div>
          )}

          {result && (
            <div style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #1e7e34'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                ✅ Migration Successful!
              </h3>
              <p style={{
                margin: '0 0 15px 0',
                fontSize: '14px'
              }}>
                {result.message}
              </p>
              
              {result.moengage_response && (
                <details style={{ marginTop: '15px' }}>
                  <summary style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    marginBottom: '10px'
                  }}>
                    📄 View MoEngage Response
                  </summary>
                  <pre style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '15px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    margin: '0'
                  }}>
                    {JSON.stringify(result.moengage_response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div style={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #333',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#ff6b35'
          }}>
            🔄 How SMS Migration Works
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#b3b3b3'
          }}>
            This tool converts Braze SMS campaigns to MoEngage format, handling message content, 
            scheduling, audience targeting, and conversion goals. The migrated campaign will be 
            created as a draft in your MoEngage dashboard.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '25px'
          }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #404040'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📱</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffffff' }}>SMS Content</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#b3b3b3' }}>
                Message text with Liquid template conversion
              </p>
            </div>
            
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #404040'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏰</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffffff' }}>Scheduling</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#b3b3b3' }}>
                Campaign timing and delivery settings
              </p>
            </div>
            
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #404040'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎯</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffffff' }}>Targeting</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#b3b3b3' }}>
                Audience segmentation and filters
              </p>
            </div>
            
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #404040'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📊</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffffff' }}>Analytics</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#b3b3b3' }}>
                Conversion goals and tracking setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
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

export default BrazeSMSMigrator;
