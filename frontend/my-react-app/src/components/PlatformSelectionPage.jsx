import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PlatformSelectionPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedMigrationType, setSelectedMigrationType] = useState('');
  const [showMigrationTypes, setShowMigrationTypes] = useState(false);
  const [showCampaignTypes, setShowCampaignTypes] = useState(false);
  
  const navigate = useNavigate();

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    if (platform === 'braze') {
      setShowMigrationTypes(true);
      setShowCampaignTypes(false);
      setSelectedMigrationType('');
    } else {
      setShowMigrationTypes(false);
      setShowCampaignTypes(false);
    }
  };

  const handleMigrationTypeSelect = (type) => {
    setSelectedMigrationType(type);
    if (type === 'campaigns') {
      setShowCampaignTypes(true);
    } else if (type === 'content-blocks') {
      setShowCampaignTypes(false);
      // Navigate directly to login for content blocks
      navigate('/content-blocks-login');
    } else {
      setShowCampaignTypes(false);
    }
  };

  const handleContinue = () => {
    // Navigate to login page
    navigate('/login');
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
        maxWidth: '1000px',
        width: '100%'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          textAlign: 'center'
        }}>
          {/* Header */}
          <h1 style={{
            color: '#1D244F',
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            🚀 Migratable platforms
          </h1>
          
          <p style={{
            color: '#6B7280',
            fontSize: '16px',
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px auto'
          }}>
            Select the platform you want to migrate from. Choose your source platform and migration type to get started.
          </p>

          {/* Platform Selection */}
          <div style={{
            display: 'flex',
            gap: '30px',
            justifyContent: 'center',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            {/* Braze Platform */}
            <div
              onClick={() => handlePlatformSelect('braze')}
              style={{
                width: '280px',
                height: '200px',
                border: selectedPlatform === 'braze' ? '3px solid #00AFB9' : '3px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: selectedPlatform === 'braze' ? '#F0FDFF' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedPlatform === 'braze' 
                  ? '0 4px 12px rgba(0, 175, 185, 0.15)' 
                  : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (selectedPlatform !== 'braze') {
                  e.target.style.borderColor = '#00AFB9';
                  e.target.style.backgroundColor = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlatform !== 'braze') {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px'
                }}>
                  📧
                </div>
                <h3 style={{
                  color: '#1D244F',
                  fontSize: '24px',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Braze
                </h3>
                <p style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  margin: '8px 0 0 0'
                }}>
                  Customer engagement platform
                </p>
              </div>
            </div>

            {/* Salesforce Platform */}
            <div
              onClick={() => {}} // Disabled for now
              style={{
                width: '280px',
                height: '200px',
                border: '3px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'not-allowed',
                opacity: 0.5,
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px'
                }}>
                  ☁️
                </div>
                <h3 style={{
                  color: '#6B7280',
                  fontSize: '24px',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Salesforce
                </h3>
                <p style={{
                  color: '#9CA3AF',
                  fontSize: '14px',
                  margin: '8px 0 0 0'
                }}>
                  Coming soon
                </p>
              </div>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                Disabled
              </div>
            </div>
          </div>

          {/* Migration Type Dropdown */}
          {showMigrationTypes && (
            <div style={{
              marginBottom: '30px',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <h3 style={{
                color: '#1D244F',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                Select Migration Type
              </h3>
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Campaigns Option */}
                <div
                  onClick={() => handleMigrationTypeSelect('campaigns')}
                  style={{
                    padding: '16px 24px',
                    border: selectedMigrationType === 'campaigns' ? '2px solid #00AFB9' : '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: selectedMigrationType === 'campaigns' ? '#F0FDFF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: '150px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedMigrationType !== 'campaigns') {
                      e.target.style.borderColor = '#00AFB9';
                      e.target.style.backgroundColor = '#F8FAFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMigrationType !== 'campaigns') {
                      e.target.style.borderColor = '#E5E7EB';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '20px',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    📊
                  </div>
                  <h4 style={{
                    color: '#1D244F',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    Campaigns
                  </h4>
                </div>

                {/* Content Blocks Option */}
                <div
                  onClick={() => handleMigrationTypeSelect('content-blocks')}
                  style={{
                    padding: '16px 24px',
                    border: selectedMigrationType === 'content-blocks' ? '2px solid #00AFB9' : '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: selectedMigrationType === 'content-blocks' ? '#F0FDFF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: '150px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedMigrationType !== 'content-blocks') {
                      e.target.style.borderColor = '#00AFB9';
                      e.target.style.backgroundColor = '#F8FAFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMigrationType !== 'content-blocks') {
                      e.target.style.borderColor = '#E5E7EB';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '20px',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    🧩
                  </div>
                  <h4 style={{
                    color: '#1D244F',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    Content Blocks
                  </h4>
                </div>

                {/* Flows Option (Disabled) */}
                <div style={{
                  padding: '16px 24px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6',
                  cursor: 'not-allowed',
                  opacity: 0.5,
                  minWidth: '150px',
                  position: 'relative'
                }}>
                  <div style={{
                    fontSize: '20px',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    🔄
                  </div>
                  <h4 style={{
                    color: '#6B7280',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    Flows
                  </h4>
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
                    Disabled
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Types Display */}
          {showCampaignTypes && (
            <div style={{
              marginBottom: '30px',
              padding: '24px',
              backgroundColor: '#F8F9FF',
              borderRadius: '8px',
              border: '1px solid #E0E7FF',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <h3 style={{
                color: '#1D244F',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                ✅ Available Campaign Types
              </h3>
              
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '12px 20px',
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  borderRadius: '6px',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📧 Email Campaigns
                </div>
                <div style={{
                  padding: '12px 20px',
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  borderRadius: '6px',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📱 Push Campaigns
                </div>
                <div style={{
                  padding: '12px 20px',
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  borderRadius: '6px',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💬 SMS Campaigns
                </div>
              </div>

              <p style={{
                color: '#6B7280',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                Push, Email, and SMS campaigns are migratable. Please click continue to proceed with the migration setup.
              </p>

              <button
                onClick={handleContinue}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#00AFB9',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#009DA6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#00AFB9'}
              >
                Continue to Login 🚀
              </button>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

export default PlatformSelectionPage;
