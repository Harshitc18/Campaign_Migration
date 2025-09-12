import React, { useState, useEffect } from 'react';

function ContentBlockMoEngageModal({ selectedBlocks, onClose, onComplete }) {
  const [credentials, setCredentials] = useState({
    appKey: '',
    appSecret: '',
    apiUrl: 'https://api-02.moengage.com/v1/external/campaigns/content-blocks',
    createdByEmail: '',
    bearerToken: '',
    refreshToken: '',
    origin: 'https://dashboard-01.moengage.com',
    dataCenter: 'dashboard-01'
  });
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Auto-populate credentials from localStorage on component mount
  useEffect(() => {
    // Load stored MoEngage tokens
    const storedTokens = localStorage.getItem('moEngageTokens');
    const storedExpiry = localStorage.getItem('moEngageTokensExpiry');
    
    if (storedTokens && storedExpiry) {
      const expiryTime = new Date(parseInt(storedExpiry));
      const now = new Date();
      
      // Check if tokens are still valid (within 2 hours)
      if (now < expiryTime) {
        try {
          const tokens = JSON.parse(storedTokens);
          setCredentials(prev => ({
            ...prev,
            bearerToken: tokens.bearer_token || '',
            refreshToken: tokens.refresh_token || ''
          }));
        } catch (e) {
          console.error('Error parsing stored MoEngage tokens:', e);
        }
      }
    }

    // Load other stored MoEngage credentials
    const storedMoEngageCredentials = localStorage.getItem('moEngageCredentials');
    if (storedMoEngageCredentials) {
      try {
        const creds = JSON.parse(storedMoEngageCredentials);
        setCredentials(prev => ({
          ...prev,
          appKey: creds.appKey || prev.appKey,
          appSecret: creds.appSecret || prev.appSecret,
          apiUrl: creds.apiUrl || prev.apiUrl,
          createdByEmail: creds.createdByEmail || prev.createdByEmail,
          origin: creds.origin || prev.origin,
          dataCenter: creds.dataCenter || prev.dataCenter,
          // Don't override tokens if they're fresher from moEngageTokens
          bearerToken: prev.bearerToken || creds.bearerToken || '',
          refreshToken: prev.refreshToken || creds.refreshToken || ''
        }));
      } catch (e) {
        console.error('Error parsing stored MoEngage credentials:', e);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Save to localStorage whenever credentials change
      const credentialsToSave = {
        appKey: updated.appKey,
        appSecret: updated.appSecret,
        apiUrl: updated.apiUrl,
        createdByEmail: updated.createdByEmail,
        bearerToken: updated.bearerToken,
        refreshToken: updated.refreshToken,
        origin: updated.origin,
        dataCenter: updated.dataCenter
      };
      localStorage.setItem('moEngageCredentials', JSON.stringify(credentialsToSave));
      
      // Also update the token-specific storage for consistency
      if (updated.bearerToken && updated.refreshToken) {
        const tokenData = {
          bearer_token: updated.bearerToken,
          refresh_token: updated.refreshToken
        };
        localStorage.setItem('moEngageTokens', JSON.stringify(tokenData));
        
        // Set expiry to 2 hours from now
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 2);
        localStorage.setItem('moEngageTokensExpiry', expiryTime.getTime().toString());
      }
      
      return updated;
    });
  };

  const handleMigrate = async () => {
    if (!credentials.appKey.trim() || !credentials.appSecret.trim() || !credentials.createdByEmail.trim() || 
        !credentials.bearerToken.trim() || !credentials.refreshToken.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setMigrating(true);
    setMigrationResults([]);
    
    const results = [];

    try {
      // Get Braze credentials for fetching content
      const brazeCredentials = JSON.parse(localStorage.getItem('brazeContentBlockCredentials') || '{}');

      for (const block of selectedBlocks) {
        try {
          // Transform Braze credentials to match backend format
          const transformedBrazeCredentials = {
            session_id: brazeCredentials.sessionId,
            app_group_id: brazeCredentials.appGroupId,
            dashboard_number: brazeCredentials.dashboardNumber || 9
          };

          // Transform MoEngage credentials to match backend format
          const transformedMoEngageCredentials = {
            app_key: credentials.appKey,
            app_secret: credentials.appSecret,
            api_url: credentials.apiUrl,
            created_by_email: credentials.createdByEmail,
            bearer_token: credentials.bearerToken,
            refresh_token: credentials.refreshToken,
            origin: credentials.origin,
            data_center: credentials.dataCenter
          };

          // Prepare migration payload
          const migrationPayload = {
            braze_credentials: transformedBrazeCredentials,
            moengage_credentials: transformedMoEngageCredentials,
            content_block: block
          };

          // Call the migration API
          const response = await fetch('http://localhost:8084/migrate-content-block', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(migrationPayload)
          });

          const result = {
            blockName: block.name || 'Unnamed Block',
            blockId: block.id,
            success: response.ok,
            status: response.status,
            message: response.ok ? 'Successfully migrated' : `Failed: ${response.status}`,
            details: response.ok ? await response.json() : await response.text()
          };

          results.push(result);
          setMigrationResults([...results]);

        } catch (error) {
          console.error(`Error migrating block ${block.name}:`, error);
          results.push({
            blockName: block.name || 'Unnamed Block',
            blockId: block.id,
            success: false,
            message: `Error: ${error.message}`,
            details: error.toString()
          });
          setMigrationResults([...results]);
        }

        // Small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setShowResults(true);
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed. Please check your credentials and try again.');
    } finally {
      setMigrating(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const successCount = migrationResults.filter(r => r.success).length;
  const failureCount = migrationResults.filter(r => !r.success).length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              color: '#1D244F',
              fontSize: '20px',
              fontWeight: '600',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎯 MoEngage Content Block Migration
            </h2>
            <button
              onClick={onClose}
              disabled={migrating}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: migrating ? 'not-allowed' : 'pointer',
                color: '#6B7280',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          <p style={{
            color: '#6B7280',
            fontSize: '14px',
            margin: '8px 0 0 0'
          }}>
            Migrating {selectedBlocks.length} content block{selectedBlocks.length !== 1 ? 's' : ''} to MoEngage
          </p>
        </div>

        {!showResults ? (
          /* Credentials Form */
          <div style={{ padding: '24px' }}>
            {/* Info Section */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                color: '#1E40AF',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                ℹ️ Credential Requirements
              </h4>
              <div style={{ color: '#1E40AF', fontSize: '13px', lineHeight: '1.5' }}>
                <div><strong>App Key & Secret:</strong> For creating content blocks via MoEngage API</div>
                <div><strong>Bearer & Refresh Token:</strong> For uploading Braze images to MoEngage CDN</div>
                <div><strong>Created By Email:</strong> Email to attribute content block creation</div>
                <div><strong>Data Center:</strong> Select your MoEngage dashboard region (01, 02, 03, or 04)</div>
              </div>
              {(credentials.bearerToken || credentials.refreshToken || credentials.appKey) && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  borderRadius: '4px',
                  color: '#166534',
                  fontSize: '12px'
                }}>
                  ✅ Some credentials auto-populated from storage
                </div>
              )}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                MoEngage App Key *
              </label>
              <input
                type="text"
                name="appKey"
                value={credentials.appKey}
                onChange={handleInputChange}
                placeholder="Enter your MoEngage App Key"
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                MoEngage App Secret *
              </label>
              <input
                type="password"
                name="appSecret"
                value={credentials.appSecret}
                onChange={handleInputChange}
                placeholder="Enter your MoEngage App Secret"
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                API URL
              </label>
              <input
                type="text"
                name="apiUrl"
                value={credentials.apiUrl}
                onChange={handleInputChange}
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                Created By Email *
              </label>
              <input
                type="email"
                name="createdByEmail"
                value={credentials.createdByEmail}
                onChange={handleInputChange}
                placeholder="your.email@company.com"
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                Bearer Token * (for CDN image conversion)
              </label>
              <input
                type="password"
                name="bearerToken"
                value={credentials.bearerToken}
                onChange={handleInputChange}
                placeholder="Enter your MoEngage Bearer Token"
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                Refresh Token * (for CDN image conversion)
              </label>
              <input
                type="password"
                name="refreshToken"
                value={credentials.refreshToken}
                onChange={handleInputChange}
                placeholder="Enter your MoEngage Refresh Token"
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                Origin URL (for CDN image conversion)
              </label>
              <input
                type="text"
                name="origin"
                value={credentials.origin}
                onChange={handleInputChange}
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px'
              }}>
                MoEngage Data Center
              </label>
              <select
                name="dataCenter"
                value={credentials.dataCenter}
                onChange={(e) => {
                  const selectedDC = e.target.value;
                  const dcNumber = selectedDC.split('-')[1]; // Extract "01", "02", etc.
                  
                  handleInputChange({
                    target: {
                      name: 'dataCenter',
                      value: selectedDC
                    }
                  });
                  // Also update origin URL automatically
                  handleInputChange({
                    target: {
                      name: 'origin',
                      value: `https://${selectedDC}.moengage.com`
                    }
                  });
                  // Also update API URL to match data center
                  handleInputChange({
                    target: {
                      name: 'apiUrl',
                      value: `https://api-${dcNumber}.moengage.com/v1/external/campaigns/content-blocks`
                    }
                  });
                }}
                disabled={migrating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: migrating ? '#F3F4F6' : '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: migrating ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="dashboard-01">Dashboard 01</option>
                <option value="dashboard-02">Dashboard 02</option>
                <option value="dashboard-03">Dashboard 03</option>
                <option value="dashboard-04">Dashboard 04</option>
              </select>
            </div>

            {/* Selected Blocks Preview */}
            <div style={{
              backgroundColor: '#F8F9FF',
              border: '1px solid #E0E7FF',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                color: '#3730A3',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px'
              }}>
                Content Blocks to Migrate:
              </h4>
              <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                {selectedBlocks.map((block, index) => (
                  <div
                    key={block.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < selectedBlocks.length - 1 ? '1px solid #E0E7FF' : 'none'
                    }}
                  >
                    <span style={{
                      color: '#3730A3',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {block.name || 'Unnamed Block'}
                    </span>
                    <span style={{
                      color: '#6366F1',
                      fontSize: '12px'
                    }}>
                      {block.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Migration Progress */}
            {migrating && (
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #F59E0B',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#92400E', fontSize: '14px', fontWeight: '500' }}>
                    Migrating content blocks...
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#92400E' }}>
                  Progress: {migrationResults.length} / {selectedBlocks.length} completed
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginBottom: credentials.bearerToken || credentials.refreshToken || credentials.appKey ? '16px' : '0'
            }}>
              <button
                onClick={onClose}
                disabled={migrating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: migrating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMigrate}
                disabled={migrating || !credentials.appKey || !credentials.appSecret || !credentials.createdByEmail || 
                         !credentials.bearerToken || !credentials.refreshToken}
                style={{
                  padding: '10px 20px',
                  backgroundColor: migrating ? '#9CA3AF' : '#00AFB9',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (migrating || !credentials.appKey || !credentials.appSecret || !credentials.createdByEmail ||
                          !credentials.bearerToken || !credentials.refreshToken) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {migrating ? '⏳ Migrating...' : '🚀 Start Migration'}
              </button>
            </div>

            {/* Clear Credentials Button */}
            {(credentials.bearerToken || credentials.refreshToken || credentials.appKey) && (
              <div style={{
                textAlign: 'center'
              }}>
                <button
                  onClick={() => {
                    localStorage.removeItem('moEngageCredentials');
                    localStorage.removeItem('moEngageTokens');
                    localStorage.removeItem('moEngageTokensExpiry');
                    setCredentials({
                      appKey: '',
                      appSecret: '',
                      apiUrl: 'https://api-02.moengage.com/v1/external/campaigns/content-blocks',
                      createdByEmail: '',
                      bearerToken: '',
                      refreshToken: '',
                      origin: 'https://dashboard-01.moengage.com',
                      dataCenter: 'dashboard-01'
                    });
                  }}
                  disabled={migrating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#DC2626',
                    border: '1px solid #DC2626',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: migrating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!migrating) {
                      e.target.style.backgroundColor = '#DC2626';
                      e.target.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!migrating) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#DC2626';
                    }
                  }}
                >
                  🗑️ Clear All Stored Credentials
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Results View */
          <div style={{ padding: '24px' }}>
            {/* Results Summary */}
            <div style={{
              backgroundColor: successCount === selectedBlocks.length ? '#DCFCE7' : failureCount === selectedBlocks.length ? '#FEF2F2' : '#FEF3C7',
              border: `1px solid ${successCount === selectedBlocks.length ? '#BBF7D0' : failureCount === selectedBlocks.length ? '#FECACA' : '#FDE68A'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: successCount === selectedBlocks.length ? '#166534' : failureCount === selectedBlocks.length ? '#DC2626' : '#92400E',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Migration Complete!
              </h3>
              <div style={{
                color: successCount === selectedBlocks.length ? '#166534' : failureCount === selectedBlocks.length ? '#DC2626' : '#92400E',
                fontSize: '14px'
              }}>
                <div>✅ Success: {successCount} content blocks</div>
                {failureCount > 0 && <div>❌ Failed: {failureCount} content blocks</div>}
              </div>
            </div>

            {/* Detailed Results */}
            <div style={{
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}>
              {migrationResults.map((result, index) => (
                <div
                  key={result.blockId}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < migrationResults.length - 1 ? '1px solid #E5E7EB' : 'none',
                    backgroundColor: result.success ? '#F0FDF4' : '#FEF2F2'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      fontWeight: '500',
                      color: '#1D244F',
                      fontSize: '14px'
                    }}>
                      {result.blockName}
                    </span>
                    <span style={{
                      fontSize: '20px'
                    }}>
                      {result.success ? '✅' : '❌'}
                    </span>
                  </div>
                  <div style={{
                    color: result.success ? '#166534' : '#DC2626',
                    fontSize: '12px'
                  }}>
                    {result.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Complete Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={handleComplete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#00AFB9',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🎉 Complete
              </button>
            </div>
          </div>
        )}
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

export default ContentBlockMoEngageModal;
