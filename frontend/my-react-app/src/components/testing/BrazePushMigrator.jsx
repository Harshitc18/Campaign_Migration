import React, { useState } from 'react';
import axios from 'axios';

function BrazePushMigrator() {
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

  // Sample Braze push campaign payload for demo
  const sampleBrazePushPayload = {
    campaign: {
      campaign_name: "Welcome Push Notification",
      schedule_type: "time_based",
      schedule_data: {
        start_date_time: 1725356400, // Sample timestamp
        recurring: false
      },
      filters: [
        {
          filter_key: "push_subscription_status_filter",
          value: 1,
          comparison_key: "1"
        }
      ],
      conversion_behaviors: [
        {
          event_type: "TrackedUserBehavior::UsedApp",
          type: "open"
        }
      ],
      messaging_actions: [
        {
          message_type: "androidPush",
          android_title: "Welcome to Our App! 🎉",
          android_push_message: "Thanks for downloading our app. Start exploring amazing features now!",
          android_custom_uri: "myapp://welcome",
          image_url: "https://braze-images.com/appboy/communication/assets/image_assets/images/welcome_image.jpg"
        },
        {
          message_type: "iosPush",
          ios_alert_hash: {
            title: "Welcome to Our App! 🎉"
          },
          ios_push_message: "Thanks for downloading our app. Start exploring amazing features now!",
          ios_uri: "myapp://welcome",
          ios_image_url: "https://braze-images.com/appboy/communication/assets/image_assets/images/welcome_image.jpg"
        },
        {
          message_type: "webPush",
          web_title: "Welcome to Our App! 🎉",
          web_push_message: "Thanks for visiting our app. Start exploring amazing features now!",
          web_custom_uri: "https://myapp.com/welcome",
          image_url: "https://braze-images.com/appboy/communication/assets/image_assets/images/welcome_image.jpg"
        }
      ]
    }
  };

  const handleLoadDemo = () => {
    setBrazePayload(JSON.stringify(sampleBrazePushPayload, null, 2));
    setDemoMode(true);
    setError('');
    setResult(null);
    // Set demo credentials for testing
    setMoengageCredentials({
      bearer_token: 'demo_bearer_token_for_push_testing',
      refresh_token: 'demo_refresh_token_for_push_testing',
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
      setError('Please enter a Braze push campaign payload');
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
      
      // Call the FastAPI push migration service
      const response = await axios.post('http://localhost:8081/v1/migrate-push-campaign', requestPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setResult(response.data);
    } catch (err) {
      console.error('Push migration error:', err);
      
      if (err.response) {
        // Server responded with error
        setError(`Push migration failed: ${err.response.data.detail || err.response.data.message || 'Unknown error'}`);
      } else if (err.name === 'SyntaxError') {
        // JSON parsing error
        setError('Invalid JSON format. Please check your Braze push campaign payload syntax.');
      } else {
        // Network or other error
        setError(`Connection error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const detectPlatforms = (campaign) => {
    const messaging_actions = campaign.messaging_actions || [];
    const platforms = [];
    
    if (messaging_actions.some(action => action.message_type === 'androidPush')) {
      platforms.push('Android');
    }
    if (messaging_actions.some(action => action.message_type === 'iosPush')) {
      platforms.push('iOS');
    }
    if (messaging_actions.some(action => action.message_type === 'webPush')) {
      platforms.push('Web');
    }
    
    return platforms;
  };

  const handleCopyResult = () => {
    if (result && (result.moengage_payload || result)) {
      navigator.clipboard.writeText(JSON.stringify(result.moengage_payload || result, null, 2));
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
        background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
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
          📱 Braze → MoEngage Push Migrator
        </h1>
        <p style={{
          margin: '0',
          fontSize: '16px',
          opacity: '0.9'
        }}>
          Convert Braze push notification campaigns to MoEngage format and create drafts
        </p>
        <div style={{
          marginTop: '15px',
          fontSize: '14px',
          opacity: '0.8'
        }}>
          Supports Android • iOS • Web Push Notifications
        </div>
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
              <h2 style={{ margin: 0, color: '#FF6B35' }}>📱 Braze Push Campaign Payload</h2>
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
              placeholder="Paste your Braze push campaign JSON payload here..."
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
                ℹ️ Demo mode: Using sample Braze push campaign data (Android, iOS, Web)
              </div>
            )}

            <button
              onClick={handleMigrate}
              disabled={loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token}
              style={{
                width: '100%',
                backgroundColor: loading || !brazePayload.trim() || !moengageCredentials.bearer_token || !moengageCredentials.refresh_token ? '#424242' : '#FF6B35',
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
                  e.target.style.backgroundColor = '#E55A2B';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && brazePayload.trim() && moengageCredentials.bearer_token && moengageCredentials.refresh_token) {
                  e.target.style.backgroundColor = '#FF6B35';
                }
              }}
            >
              {loading ? '🔄 Converting & Creating Draft...' : '📱 Convert & Create Draft'}
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
              {result && result.moengage_payload && (
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
                  📋 Copy Payload
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
                  backgroundColor: result.draft_created ? '#4CAF50' : '#2196F3',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {result.draft_created ? '🎯' : '✅'} {result.message}
                </div>

                {result.platforms_detected && result.platforms_detected.length > 0 && (
                  <div style={{
                    backgroundColor: '#673AB7',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    fontSize: '14px'
                  }}>
                    📱 <strong>Platforms detected:</strong> {result.platforms_detected.join(', ')}
                  </div>
                )}

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

                {result.draft_created && result.moengage_response && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    backgroundColor: '#388E3C',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    🎯 Push campaign draft created successfully in MoEngage dashboard! {result.moengage_response.campaign_id ? `Campaign ID: ${result.moengage_response.campaign_id}` : ''}
                  </div>
                )}

                {!result.draft_created && result.error && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    backgroundColor: '#F44336',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'white'
                  }}>
                    ⚠️ Draft creation failed: {result.error}
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
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📱</div>
                <p style={{ margin: 0, fontSize: '16px' }}>
                  Push migration results will appear here
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
          <h3 style={{ color: '#FFB74D', marginTop: 0 }}>📱 Push Migration Features:</h3>
          <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
            <li>🔐 Enter your MoEngage API credentials (Bearer Token & Refresh Token)</li>
            <li>📱 Paste your Braze push campaign JSON payload</li>
            <li>🤖 Automatic conversion from Braze to MoEngage push format</li>
            <li>📷 Images are migrated from Braze CDN to MoEngage CDN automatically</li>
            <li>🔄 Liquid templates converted to Jinja format</li>
            <li>📱 Multi-platform support: Android, iOS, and Web push</li>
            <li>⏰ Schedule and trigger settings conversion</li>
            <li>🎯 Conversion goals and targeting migration</li>
            <li>🚀 Direct draft creation in MoEngage dashboard</li>
            <li>✅ Review and publish from MoEngage dashboard</li>
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
            • Credentials used only for single request execution
            <br />
            • No server-side storage of authentication tokens
            <br />
            • Secure HTTPS communication for all API calls
            <br />
            • Tokens discarded immediately after processing
          </div>
          
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#263238',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#FF9800' }}>📱 Push Campaign Support:</strong>
            <br />
            • Android Push: Title, message, images, deep links, custom URIs
            <br />
            • iOS Push: Alert title, body, images, URIs, interruption levels
            <br />
            • Web Push: Title, message, images, redirect URLs
            <br />
            • Multi-platform campaigns with platform-specific customization
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
            • FastAPI push migration service running on port 8081
            <br />
            • Valid MoEngage Bearer Token and Refresh Token
            <br />
            • Access to MoEngage dashboard for draft review
            <br />
            • Braze push campaign JSON export
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrazePushMigrator;
