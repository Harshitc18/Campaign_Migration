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
      const brazeCredentials = localStorage.getItem('braze_credentials');

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
            'X-Dashboard-Url': credentials.dashboard_url,
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
            localStorage.removeItem('braze_credentials');
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
        border: '1px solid #404040',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            backgroundColor: '#2a2a2a',
            padding: '12px 16px',
            borderBottom: expanded ? '1px solid #404040' : 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          onClick={() => toggleSection(sectionKey)}
        >
          <h4 style={{ margin: 0, color: '#ffffff' }}>{title}</h4>
          <span style={{ 
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#b3b3b3'
          }}>
            ▶
          </span>
        </div>
        {expanded && (
          <div style={{ padding: '16px' }}>
            <pre style={{
              backgroundColor: '#1e1e1e',
              color: '#e0e0e0',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              lineHeight: '1.4',
              margin: 0,
              maxHeight: '400px',
              border: '1px solid #404040'
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
        fontSize: '18px'
      }}>
        Loading campaign details...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          color: 'red', 
          fontSize: '18px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
        <button 
          onClick={() => navigate('/campaigns')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  // Render campaign details
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#121212',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #404040'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#ffffff' }}>Campaign Details</h1>
          <p style={{ margin: 0, color: '#b3b3b3', fontSize: '14px' }}>
            Campaign ID: {campaignId}
          </p>
        </div>
        <button 
          onClick={() => navigate('/campaigns')}
          style={{
            backgroundColor: '#404040',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to Campaigns
        </button>
      </div>

      {/* Campaign Summary */}
      {campaignDetails && campaignDetails.campaign && (
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #404040'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#ffffff' }}>
            {campaignDetails.campaign.campaign_name || 'Unnamed Campaign'}
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            color: '#e0e0e0' 
          }}>
            <div>
              <strong style={{ color: '#ffffff' }}>Type:</strong> {campaignDetails.campaign.campaign_type || 'Unknown'}
            </div>
            <div>
              <strong style={{ color: '#ffffff' }}>Status:</strong> {campaignDetails.campaign.status || 'Unknown'}
            </div>
            <div>
              <strong style={{ color: '#ffffff' }}>Created:</strong> {campaignDetails.campaign.created_at ? 
                new Date(campaignDetails.campaign.created_at).toLocaleDateString() : 'Unknown'}
            </div>
            <div>
              <strong style={{ color: '#ffffff' }}>Last Edited:</strong> {campaignDetails.campaign.last_edited ? 
                new Date(campaignDetails.campaign.last_edited).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setJsonView(jsonView === 'formatted' ? 'raw' : 'formatted')}
          style={{
            backgroundColor: '#404040',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {jsonView === 'formatted' ? 'Show Raw JSON' : 'Show Formatted View'}
        </button>
        <button
          onClick={handleCopyToClipboard}
          style={{
            backgroundColor: '#28a745',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📋 Copy JSON
        </button>
        <button
          onClick={handleDownloadJson}
          style={{
            backgroundColor: '#ffc107',
            color: '#000000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
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
              <h3 style={{ marginBottom: '20px', color: '#333' }}>Campaign Structure</h3>
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
              <h3 style={{ marginBottom: '20px', color: '#ffffff' }}>Raw JSON Data</h3>
              <pre style={{
                backgroundColor: '#1e1e1e',
                color: '#e0e0e0',
                padding: '20px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.4',
                border: '1px solid #404040',
                maxHeight: '80vh'
              }}>
                {formatJson(campaignDetails)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ViewDetailsPage;
