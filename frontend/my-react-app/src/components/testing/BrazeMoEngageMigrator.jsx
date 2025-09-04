import React, { useState } from 'react';
import axios from 'axios';

function BrazeMoEngageMigrator() {
  const [brazePayload, setBrazePayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  
  // MoEngage credentials state
  const [moengageCredentials, setMoengageCredentials] = useState({
    bearer_token: '',
    refresh_token: '',
    origin: 'https://dashboard-01.moengage.com',
    api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
  });
  const [credentialsVisible, setCredentialsVisible] = useState(false);

  // Sample Braze campaign payload for demo
  const sampleBrazePayload = {
    campaign: {
      campaign_name: "Welcome Email Campaign",
      filters: [
        {
          filter_key: "email_subscription_status_filter",
          value: 2,
          comparison_key: "1"
        }
      ],
      conversion_behaviors: [
        {
          event_type: "TrackedUserBehavior::MadeAnyPurchase",
          custom_event_name: "purchase"
        }
      ],
      messaging_actions: [
        {
          message_type: "email",
          is_control: false,
          email_subject: "Welcome to Our Platform!",
          preheader: "Get started with your new account",
          email_body: "<html><body><h1>Welcome!</h1><p>Thank you for joining us. We're excited to have you on board.</p><p>Best regards,<br/>The Team</p></body></html>",
          from_display_name: "Welcome Team",
          from_address: "welcome@company.com",
          reply_to_address: "support@company.com"
        }
      ]
    }
  };

  const handleLoadDemo = () => {
    setBrazePayload(JSON.stringify(sampleBrazePayload, null, 2));
    setDemoMode(true);
    setError('');
    setResult(null);
    // Set demo credentials for testing
    setMoengageCredentials({
      bearer_token: 'demo_bearer_token_for_testing',
      refresh_token: 'demo_refresh_token_for_testing',
      origin: 'https://dashboard-01.moengage.com',
      api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
    });
  };

  const handleClear = () => {
    setBrazePayload('');
    setResult(null);
    setError('');
    setDemoMode(false);
    setMoengageCredentials({
      bearer_token: '',
      refresh_token: '',
      origin: 'https://dashboard-01.moengage.com',
      api_url: 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
    });
  };

  const handleMigrate = async () => {
    if (!brazePayload.trim()) {
      setError('Please enter a Braze campaign payload');
      return;
    }

    if (!moengageCredentials.bearer_token || !moengageCredentials.refresh_token) {
      setError('Please enter MoEngage Bearer Token and Refresh Token');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Parse the payload to validate JSON
      const parsedPayload = JSON.parse(brazePayload);
      
      // Create the request payload with credentials
      const requestPayload = {
        campaign: parsedPayload.campaign || parsedPayload,
        moengage_credentials: moengageCredentials
      };
      
      // Call the FastAPI migration service
      const response = await axios.post('http://localhost:8080/v1/migrate-campaign', requestPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setResult(response.data);
    } catch (err) {
      console.error('Migration error:', err);
      
      if (err.response) {
        // Server responded with error
        setError(`Migration failed: ${err.response.data.detail || err.response.data.message || 'Unknown error'}`);
      } else if (err.name === 'SyntaxError') {
        // JSON parsing error
        setError('Invalid JSON format. Please check your Braze payload syntax.');
      } else {
        // Network or other error
        setError(`Connection error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert('Result copied to clipboard!');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#121212',
      padding: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px 20px',
        textAlign: 'center',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '36px',
          fontWeight: '700'
        }}>
          🚀 Braze → MoEngage Migrator
        </h1>
        <p style={{
          margin: '0',
          fontSize: '16px',
          opacity: '0.9'
        }}>
          Convert Braze email campaigns and create drafts in MoEngage dashboard
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* MoEngage Credentials Section */}
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, color: '#FF9800' }}>🔐 MoEngage API Credentials</h2>
            <button
              onClick={() => setCredentialsVisible(!credentialsVisible)}
              style={{
                backgroundColor: credentialsVisible ? '#757575' : '#2196F3',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {credentialsVisible ? '🙈 Hide' : '👁️ Show'} Credentials
            </button>
          </div>

          {credentialsVisible && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <label style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Bearer Token *
                </label>
                <input
                  type="password"
                  value={moengageCredentials.bearer_token}
                  onChange={(e) => setMoengageCredentials({...moengageCredentials, bearer_token: e.target.value})}
                  placeholder="Enter your MoEngage Bearer Token"
                  style={{
                    width: '100%',
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Refresh Token *
                </label>
                <input
                  type="password"
                  value={moengageCredentials.refresh_token}
                  onChange={(e) => setMoengageCredentials({...moengageCredentials, refresh_token: e.target.value})}
                  placeholder="Enter your MoEngage Refresh Token"
                  style={{
                    width: '100%',
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Origin URL
                </label>
                <input
                  type="text"
                  value={moengageCredentials.origin}
                  onChange={(e) => setMoengageCredentials({...moengageCredentials, origin: e.target.value})}
                  placeholder="MoEngage Origin URL"
                  style={{
                    width: '100%',
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  API URL
                </label>
                <input
                  type="text"
                  value={moengageCredentials.api_url}
                  onChange={(e) => setMoengageCredentials({...moengageCredentials, api_url: e.target.value})}
                  placeholder="MoEngage API URL"
                  style={{
                    width: '100%',
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#1565C0',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            🔒 <strong>Security:</strong> Your credentials are sent directly to the backend for this single request only and are never stored.
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
          gap: '30px',
          alignItems: 'start'
        }}>
          
          {/* Input Section */}
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#4FC3F7' }}>📝 Braze Campaign Payload</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleLoadDemo}
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                >
                  📋 Load Demo
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    backgroundColor: '#757575',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#616161'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#757575'}
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            <textarea
              value={brazePayload}
              onChange={(e) => setBrazePayload(e.target.value)}
              placeholder="Paste your Braze campaign JSON payload here..."
              style={{
                width: '100%',
                height: '400px',
                backgroundColor: '#2d2d2d',
                color: '#ffffff',
                border: '1px solid #404040',
                borderRadius: '8px',
                padding: '15px',
                fontSize: '14px',
                fontFamily: 'Monaco, Consolas, monospace',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            {demoMode && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#1565C0',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                ℹ️ Demo mode: Using sample Braze campaign data
              </div>
            )}

            <button
              onClick={handleMigrate}
              disabled={loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token}
              style={{
                width: '100%',
                backgroundColor: loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token ? '#424242' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                cursor: loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginTop: '20px',
                transition: 'all 0.3s ease',
                opacity: loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && brazePayload.trim() && moengageCredentials.bearer_token && moengageCredentials.refresh_token) {
                  e.target.style.backgroundColor = '#45a049';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && brazePayload.trim() && moengageCredentials.bearer_token && moengageCredentials.refresh_token) {
                  e.target.style.backgroundColor = '#4CAF50';
                }
              }}
            >
              {loading ? '🔄 Creating MoEngage Draft...' : '🚀 Migrate & Create Draft'}
            </button>
          </div>

          {/* Output Section */}
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#81C784' }}>✅ Migration Result</h2>
              {result && (
                <button
                  onClick={handleCopyResult}
                  style={{
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F57C00'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#FF9800'}
                >
                  📋 Copy Result
                </button>
              )}
            </div>

            {error && (
              <div style={{
                backgroundColor: '#f44336',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                ❌ {error}
              </div>
            )}

            {result && (
              <div>
                <div style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  ✅ {result.message}
                </div>

                <div style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  padding: '15px',
                  fontSize: '14px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>

                {result.moengage_response && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    backgroundColor: '#388E3C',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    🎯 Draft created successfully in MoEngage dashboard!
                  </div>
                )}
              </div>
            )}

            {!result && !error && !loading && (
              <div style={{
                backgroundColor: '#2d2d2d',
                border: '2px dashed #404040',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                color: '#888'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                <p style={{ margin: 0, fontSize: '16px' }}>
                  Migration results will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '25px',
          borderRadius: '12px',
          marginTop: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ color: '#FFB74D', marginTop: 0 }}>ℹ️ How it works:</h3>
          <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
            <li>� Enter your MoEngage API credentials (Bearer Token & Refresh Token)</li>
            <li>�📝 Paste your Braze campaign JSON payload in the input area</li>
            <li>🔄 The service converts Braze format to MoEngage format</li>
            <li>🖼️ Images are automatically migrated from Braze CDN to MoEngage CDN</li>
            <li>🎨 Liquid templates are converted to Jinja format</li>
            <li>🎯 A draft campaign is created directly in your MoEngage dashboard</li>
            <li>✅ Review and publish the campaign from MoEngage dashboard</li>
          </ul>
          
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#263238',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#4CAF50' }}>🔒 Security Features:</strong>
            <br />
            • Your MoEngage credentials are only used for this single request
            <br />
            • Credentials are never stored on the server or in databases
            <br />
            • All communication happens over HTTPS
            <br />
            • Your tokens are handled securely and discarded after use
          </div>
          
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#263238',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#FFC107' }}>⚠️ Prerequisites:</strong>
            <br />
            • FastAPI migration service running on port 8080
            <br />
            • Valid MoEngage Bearer Token and Refresh Token
            <br />
            • Access to your MoEngage dashboard for review
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrazeMoEngageMigrator;
