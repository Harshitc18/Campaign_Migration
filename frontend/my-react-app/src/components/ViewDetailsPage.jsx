import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function ViewDetailsPage() {
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jsonView, setJsonView] = useState('formatted'); // 'formatted' or 'raw'
  const [expandedSections, setExpandedSections] = useState({
    campaignInfo: true,
    messagingActions: false,
    filters: false,
    conversionBehaviors: false,
    scheduleData: false,
    fullRawData: false
  });
  const navigate = useNavigate();
  const { campaignId } = useParams();

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      const brazeCredentials = localStorage.getItem('brazeCredentials');

      if (!brazeCredentials) {
        setError('No active session found. Please log in.');
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        const credentials = JSON.parse(brazeCredentials);
        
        // Make API call to get detailed campaign information using FastAPI
        const response = await axios.get(`http://localhost:8082/campaigns/${campaignId}/`, {
          headers: {
            'X-Dashboard-Url': `https://dashboard-${String(credentials.dashboard_number || 9).padStart(2, '0')}.braze.com`,
            'X-Session-Id': credentials.session_id,
            'X-App-Group-Id': credentials.app_group_id,
          },
        });

        // The FastAPI returns the campaign details directly
        if (response.data) {
          setCampaignDetails(response.data);
        } else {
          setError('Campaign not found.');
        }
      } catch (err) {
        let errorMessage = 'An unexpected error occurred.';
        if (err.response) {
          if (err.response.status === 401) {
            errorMessage = 'Authentication expired. Please log in again.';
            localStorage.removeItem('brazeCredentials');
            setTimeout(() => navigate('/'), 1000);
          } else if (err.response.status === 404) {
            errorMessage = 'Campaign not found.';
          } else if (err.response.data && err.response.data.detail) {
            errorMessage = err.response.data.detail;
          } else {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          }
        } else if (err.request) {
          errorMessage = 'Cannot connect to the Braze Campaign Fetcher service. Is it running on port 8082?';
        } else {
          errorMessage = err.message;
        }
        setError(errorMessage);
        console.error('Fetch campaign details error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaignDetails();
    } else {
      setError('No campaign ID provided.');
      setLoading(false);
    }
  }, [campaignId, navigate]);

  const handleCopyToClipboard = () => {
    const jsonText = JSON.stringify(campaignDetails, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => {
      alert('JSON copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleDownloadJson = () => {
    const jsonText = JSON.stringify(campaignDetails, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign_${campaignId}_details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatJson = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderJsonSection = (title, data, sectionKey) => {
    if (!data) return null;

    const expanded = expandedSections[sectionKey];

    return (
      <div style={{ 
        marginBottom: '20px',
        border: '1px solid #E5E7EB', // --color-border-subtle
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF', // --color-bg-secondary
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div 
          style={{
            backgroundColor: '#F9FAFB', // --color-bg-primary
            padding: '16px 20px',
            borderBottom: expanded ? '1px solid #E5E7EB' : 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.2s ease'
          }}
          onClick={() => toggleSection(sectionKey)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#F9FAFB';
          }}
        >
          <h4 style={{ 
            margin: 0, 
            color: '#1D244F', // Deep Navy
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {title}
          </h4>
          <span style={{ 
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#6B7280', // --color-text-secondary
            fontSize: '12px'
          }}>
            ▶
          </span>
        </div>
        {expanded && (
          <div style={{ padding: '20px' }}>
            <pre style={{
              backgroundColor: '#F9FAFB', // --color-bg-primary
              color: '#111827', // --color-text-primary
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px',
              lineHeight: '1.5',
              margin: 0,
              maxHeight: '400px',
              border: '1px solid #E5E7EB', // --color-border-subtle
              fontFamily: 'Monaco, Consolas, "Courier New", monospace'
            }}>
              {formatJson(data)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px',
        color: '#6B7280' // --color-text-secondary
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid #E5E7EB',
            borderTop: '3px solid #00AFB9', // Vibrant Teal
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading campaign details...
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px',
        textAlign: 'center',
        minHeight: '100vh',
        backgroundColor: '#F9FAFB', // --color-bg-primary
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          padding: '20px 40px',
          backgroundColor: '#FEE4E2', // Danger Red BG
          color: '#D92D20', // Danger Red text
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          fontSize: '16px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          ⚠️ Error: {error}
        </div>
        <button 
          onClick={() => navigate('/campaigns')}
          style={{
            backgroundColor: '#00AFB9', // Vibrant Teal
            color: '#FFFFFF',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ← Back to Campaigns
        </button>
      </div>
    );
  }

  // Render campaign details
  return (
    <div style={{ 
      padding: '0', 
      backgroundColor: '#F9FAFB', // --color-bg-primary
      color: '#111827', // --color-text-primary
      minHeight: '100vh'
    }}>
      {/* Add CSS keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1D244F 0%, #00AFB9 100%)', // Deep Navy to Vibrant Teal
        color: '#FFFFFF',
        padding: '40px 20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px',
              fontWeight: '700'
            }}>
              📋 Campaign Details
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: '16px',
              opacity: '0.9'
            }}>
              Campaign ID: {campaignId}
            </p>
          </div>
          <button 
            onClick={() => navigate('/campaigns')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1D244F', // Deep Navy
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#FFFFFF';
            }}
          >
            ← Back to Campaigns
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Campaign Summary */}
        {campaignDetails && campaignDetails.campaign && (
          <div style={{
            backgroundColor: '#FFFFFF', // --color-bg-secondary
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid #E5E7EB', // --color-border-subtle
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              color: '#1D244F', // Deep Navy
              fontSize: '24px',
              fontWeight: '600'
            }}>
              {campaignDetails.campaign.campaign_name || 'Unnamed Campaign'}
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px',
              color: '#111827' // --color-text-primary
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#F9FAFB', // --color-bg-primary
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#6B7280', // --color-text-secondary
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  Campaign Type
                </div>
                <div style={{ 
                  color: '#1D244F', // Deep Navy
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
                  {campaignDetails.campaign.campaign_type || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setJsonView(jsonView === 'formatted' ? 'raw' : 'formatted')}
            style={{
              backgroundColor: '#F3F4F6',
              color: '#1D244F', // Deep Navy
              border: '1px solid #E5E7EB',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#F3F4F6';
            }}
          >
            {jsonView === 'formatted' ? '📄 Show Raw JSON' : '📋 Show Formatted View'}
          </button>
          <button
            onClick={handleCopyToClipboard}
            style={{
              backgroundColor: '#008767', // Success Green
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#006B4F';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#008767';
            }}
          >
            📋 Copy JSON
          </button>
          <button
            onClick={handleDownloadJson}
            style={{
              backgroundColor: '#F59E0B', // Warning Yellow
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#D97706';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#F59E0B';
            }}
          >
            💾 Download JSON
          </button>
        </div>

        {/* JSON Content */}
        {campaignDetails && (
          <div>
            {jsonView === 'formatted' ? (
              <div>
                <h3 style={{ 
                  marginBottom: '24px', 
                  color: '#1D244F', // Deep Navy
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  📊 Campaign Structure
                </h3>
                {renderJsonSection('Campaign Info', campaignDetails.campaign, 'campaignInfo')}
                {campaignDetails.campaign.messaging_actions && 
                  renderJsonSection('Messaging Actions', campaignDetails.campaign.messaging_actions, 'messagingActions')}
                {campaignDetails.campaign.filters && 
                  renderJsonSection('Filters', campaignDetails.campaign.filters, 'filters')}
                {campaignDetails.campaign.conversion_behaviors && 
                  renderJsonSection('Conversion Behaviors', campaignDetails.campaign.conversion_behaviors, 'conversionBehaviors')}
                {campaignDetails.campaign.schedule_data && 
                  renderJsonSection('Schedule Data', campaignDetails.campaign.schedule_data, 'scheduleData')}
                {renderJsonSection('Full Raw Data', campaignDetails, 'fullRawData')}
              </div>
            ) : (
              <div>
                <h3 style={{ 
                  marginBottom: '24px', 
                  color: '#1D244F', // Deep Navy
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  🔍 Raw JSON Data
                </h3>
                <div style={{
                  backgroundColor: '#FFFFFF', // --color-bg-secondary
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <pre style={{
                    backgroundColor: '#F9FAFB', // --color-bg-primary
                    color: '#111827', // --color-text-primary
                    padding: '24px',
                    overflow: 'auto',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    margin: 0,
                    maxHeight: '80vh',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                  }}>
                    {formatJson(campaignDetails)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewDetailsPage;
