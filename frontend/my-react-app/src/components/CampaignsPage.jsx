import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MoEngageAuthModal from './MoEngageAuthModal';


function CampaignsPage() {
  // State for storing campaigns, loading status, and errors
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState(new Set());
  const [showMoEngageAuth, setShowMoEngageAuth] = useState(false);
  const campaignsPerPage = 6;
  const navigate = useNavigate();

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    const fetchCampaigns = async () => {
      // Retrieve the stored Braze credentials from localStorage
      const brazeCredentials = localStorage.getItem('brazeCredentials');

      // If no credentials are found, redirect to the login page
      if (!brazeCredentials) {
        setError('No active session found. Please log in.');
        setLoading(false);
        // Optional: redirect to login after a short delay
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        const credentials = JSON.parse(brazeCredentials);
        
        // Make the API call directly to the FastAPI Braze Campaign Fetcher
        const response = await axios.get('http://localhost:8082/campaigns/', {
          headers: {
            'X-Dashboard-Url': credentials.dashboard_url,
            'X-Session-Id': credentials.session_id,
            'X-App-Group-Id': credentials.app_group_id,
          },
        });

        // The FastAPI returns an array of campaign summaries directly
        if (response.data && Array.isArray(response.data)) {
          // Map the FastAPI response format to the expected frontend format
          const mappedCampaigns = response.data.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type === 'multi' ? 'multi' : campaign.type, // Keep 'multi' for push campaigns
            status: campaign.status,
            last_edited: campaign.last_edited,
            message_types: campaign.message_types || [],
            variation_count: campaign.variation_count || 0
          }));
          
          setCampaigns(mappedCampaigns);
        } else {
          setError('Unexpected response format from Braze API.');
        }
      } catch (err) {
        // Handle network errors
        let errorMessage = 'An unexpected error occurred.';
        if (err.response) {
          if (err.response.status === 401) {
            errorMessage = 'Authentication expired. Please log in again.';
            localStorage.removeItem('brazeCredentials');
            setTimeout(() => navigate('/'), 1000);
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
        console.error('Fetch campaigns error:', err);
      } finally {
        setLoading(false); // Stop loading indicator
      }
    };

    fetchCampaigns();
  }, [navigate]); // Add navigate to the dependency array

  // Filter and search functionality - Show all campaigns but only allow email/multi selection
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || campaign.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);
  const startIndex = (currentPage - 1) * campaignsPerPage;
  const endIndex = startIndex + campaignsPerPage;
  const currentCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleViewDetails = (campaignId) => {
    navigate(`/campaign/${campaignId}/details`);
  };

  const handleMigrate = (campaign) => {
    // For single campaign migration, add to selection and show MoEngage auth
    setSelectedCampaigns(new Set([campaign.id]));
    setShowMoEngageAuth(true);
  };

  // Campaign selection functions
  const isCampaignMigratable = (campaign) => {
    return campaign.type === 'email' || campaign.type === 'multi' || campaign.type === 'sms';
  };

  const handleCampaignSelect = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!isCampaignMigratable(campaign)) return; // Only allow selection of migratable campaigns
    
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const handleSelectAll = () => {
    const migratableIds = new Set(filteredCampaigns.filter(isCampaignMigratable).map(c => c.id));
    setSelectedCampaigns(migratableIds);
  };

  const handleClearSelection = () => {
    setSelectedCampaigns(new Set());
  };

  const handleBulkMigrate = () => {
    if (selectedCampaigns.size > 0) {
      setShowMoEngageAuth(true);
    }
  };

  const handleMoEngageAuth = async (moEngageCredentials, campaignIds) => {
    try {
      // Get Braze credentials from localStorage (fix the key name)
      const brazeCredentials = localStorage.getItem('brazeCredentials');
      const parsedBrazeCredentials = brazeCredentials ? JSON.parse(brazeCredentials) : null;
      
      // Navigate to migration progress page
      const selectedCampaignData = campaigns.filter(c => campaignIds.has(c.id));
      
      // Store migration data in localStorage for the migration page
      localStorage.setItem('migrationData', JSON.stringify({
        campaigns: selectedCampaignData,
        moEngageCredentials: moEngageCredentials,
        brazeCredentials: parsedBrazeCredentials,
        timestamp: Date.now()
      }));
      
      // Navigate to migration progress page
      navigate('/migration-progress');
      
    } catch (error) {
      console.error('Migration setup error:', error);
      // Handle error appropriately
    }
    
    setShowMoEngageAuth(false);
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
        color: '#666'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading campaigns...
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          padding: '20px 40px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          fontSize: '16px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          ⚠️ Error: {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render the main component UI
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#121212',
      padding: '0',
      color: '#ffffff'
    }}>
      {/* Add CSS keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .campaign-card {
            transition: all 0.3s ease;
          }
          
          .campaign-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4) !important;
          }
          
          .btn-primary {
            transition: all 0.2s ease;
          }
          
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.4);
          }
          
          .btn-success {
            transition: all 0.2s ease;
          }
          
          .btn-success:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40,167,69,0.4);
          }
        `}
      </style>

      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
        color: 'white',
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
          🚀 Braze Campaigns
        </h1>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          opacity: '0.9'
        }}>
          Manage and migrate your campaigns with ease
        </p>
        
        {/* Navigation Buttons - Testing Tools */}
        <div style={{ 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #404040'
        }}>
          <h3 style={{ 
            color: '#ffffff', 
            margin: '0 0 15px 0',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            🧪 Testing Tools
          </h3>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/draft-migrator')}
              style={{
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#5a67d8';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#667eea';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              🚀 Draft Migrator
            </button>

            <button
              onClick={() => navigate('/push-migrator')}
              style={{
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 8px rgba(255, 107, 53, 0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#E55A2B';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 12px rgba(255, 107, 53, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#FF6B35';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 8px rgba(255, 107, 53, 0.3)';
              }}
            >
              📱 Push Migrator
            </button>

            <button
              onClick={() => navigate('/sms-migrator')}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 8px rgba(23, 162, 184, 0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#138496';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 12px rgba(23, 162, 184, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#17a2b8';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 8px rgba(23, 162, 184, 0.3)';
              }}
            >
              💬 SMS Migrator
            </button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '30px 20px',
        borderBottom: '1px solid #333',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Bar */}
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="🔍 Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #404040',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#2a2a2a',
                color: '#ffffff'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#404040'}
            />
          </div>

          {/* Filter Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #404040',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Types</option>
              <option value="email">Email Campaigns</option>
              <option value="multi">Push Campaigns</option>
              <option value="sms">SMS Campaigns</option>
              <option value="banner">Banner Campaigns</option>
              <option value="webhook">Webhook Campaigns</option>
            </select>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            color: '#b3b3b3',
            fontSize: '14px'
          }}>
            <span>
              <strong style={{ color: '#ffffff' }}>{filteredCampaigns.length}</strong> campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </span>
            {filteredCampaigns.length !== campaigns.length && (
              <span style={{ color: '#007bff' }}>
                (filtered from {campaigns.length})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {currentCampaigns.length > 0 ? (
          <>
            {/* Bulk Selection Controls */}
            <div style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #404040',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
                  📋 Bulk Migration
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      backgroundColor: '#404040',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Select All Migratable
                  </button>
                  <button
                    onClick={handleClearSelection}
                    style={{
                      backgroundColor: '#6c757d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ color: '#b3b3b3', fontSize: '14px' }}>
                  {selectedCampaigns.size} selected
                  <span style={{ color: '#888', marginLeft: '8px' }}>
                    (Only Email, Push & SMS campaigns can be migrated)
                  </span>
                </div>
                {selectedCampaigns.size > 0 && (
                  <button
                    onClick={handleBulkMigrate}
                    style={{
                      backgroundColor: '#28a745',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    🚀 Migrate Selected ({selectedCampaigns.size})
                  </button>
                )}
              </div>
            </div>

            {/* Campaigns Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
              gap: '24px',
              marginBottom: '40px'
            }}>
              {currentCampaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="campaign-card"
                  style={{
                    background: '#1e1e1e',
                    border: `1px solid ${selectedCampaigns.has(campaign.id) ? '#28a745' : '#333'}`,
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: selectedCampaigns.has(campaign.id) 
                      ? '0 2px 8px rgba(40, 167, 69, 0.3)' 
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: isCampaignMigratable(campaign) ? 1 : 0.6
                  }}
                >
                  {/* Selection Checkbox */}
                  {isCampaignMigratable(campaign) && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      zIndex: 10
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.has(campaign.id)}
                        onChange={() => handleCampaignSelect(campaign.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#28a745'
                        }}
                      />
                    </div>
                  )}

                  {/* Not Migratable Badge */}
                  {!isCampaignMigratable(campaign) && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      zIndex: 10
                    }}>
                      NOT MIGRATABLE
                    </div>
                  )}
                  {/* Campaign Type Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    backgroundColor: campaign.type === 'multi' ? '#28a745' : 
                                   campaign.type === 'email' ? '#007bff' : 
                                   campaign.type === 'sms' ? '#17a2b8' :
                                   campaign.type === 'banner' ? '#fd7e14' : 
                                   campaign.type === 'webhook' ? '#6f42c1' : '#6c757d',
                    color: 'white',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    borderBottomLeftRadius: '8px'
                  }}>
                    {campaign.type === 'multi' ? 'PUSH' : campaign.type}
                  </div>

                  {/* Campaign Header */}
                  <div style={{ marginBottom: '20px', paddingRight: '80px' }}>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      color: '#ffffff',
                      fontSize: '20px',
                      fontWeight: '600',
                      lineHeight: '1.3'
                    }}>
                      {campaign.name}
                    </h3>
                  </div>
                  
                  {/* Campaign Details */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <span style={{ 
                          display: 'block',
                          fontWeight: '600', 
                          color: '#b3b3b3',
                          marginBottom: '4px'
                        }}>
                          Campaign ID
                        </span>
                        <span style={{ 
                          fontFamily: 'Monaco, Consolas, monospace', 
                          backgroundColor: '#2a2a2a',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#ffffff',
                          display: 'block',
                          wordBreak: 'break-all'
                        }}>
                          {campaign.id}
                        </span>
                      </div>
                      
                      <div>
                        <span style={{ 
                          display: 'block',
                          fontWeight: '600', 
                          color: '#b3b3b3',
                          marginBottom: '4px'
                        }}>
                          Status
                        </span>
                        <span style={{ 
                          display: 'inline-block',
                          backgroundColor: campaign.status === 'Active' ? '#d4edda' : 
                                         campaign.status === 'Draft' ? '#fff3cd' : '#f8d7da',
                          color: campaign.status === 'Active' ? '#155724' : 
                                 campaign.status === 'Draft' ? '#856404' : '#721c24',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ 
                        display: 'block',
                        fontWeight: '600', 
                        color: '#b3b3b3',
                        marginBottom: '4px',
                        fontSize: '14px'
                      }}>
                        Last Edited
                      </span>
                      <span style={{ 
                        color: '#e0e0e0', 
                        fontSize: '14px'
                      }}>
                        {new Date(campaign.last_edited).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ 
                    borderTop: '1px solid #e9ecef',
                    paddingTop: '16px',
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <button 
                      className="btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(campaign.id);
                      }}
                      style={{
                        flex: '1',
                        backgroundColor: '#404040',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      📋 View Details
                    </button>
                    <button 
                      className="btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCampaignMigratable(campaign)) {
                          handleMigrate(campaign);
                        }
                      }}
                      disabled={!isCampaignMigratable(campaign)}
                      style={{
                        flex: '1',
                        backgroundColor: isCampaignMigratable(campaign) ? '#28a745' : '#6c757d',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        cursor: isCampaignMigratable(campaign) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: isCampaignMigratable(campaign) ? 1 : 0.6
                      }}
                    >
                      {isCampaignMigratable(campaign) ? '🚀 Migrate' : '❌ Not Available'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '40px'
              }}>
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #404040',
                    backgroundColor: currentPage === 1 ? '#2a2a2a' : '#1e1e1e',
                    color: currentPage === 1 ? '#666' : '#ffffff',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      backgroundColor: currentPage === page ? '#007bff' : 'white',
                      color: currentPage === page ? 'white' : '#007bff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      minWidth: '40px'
                    }}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #404040',
                    backgroundColor: currentPage === totalPages ? '#2a2a2a' : '#1e1e1e',
                    color: currentPage === totalPages ? '#666' : '#ffffff',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Pagination Info */}
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              color: '#b3b3b3',
              fontSize: '14px'
            }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#495057',
              fontSize: '24px'
            }}>
              No campaigns found
            </h3>
            <p style={{ 
              margin: '0', 
              color: '#6c757d',
              fontSize: '16px'
            }}>
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by creating your first campaign.'}
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* MoEngage Authentication Modal */}
      <MoEngageAuthModal
        isOpen={showMoEngageAuth}
        onClose={() => setShowMoEngageAuth(false)}
        onAuthenticate={handleMoEngageAuth}
        selectedCampaigns={selectedCampaigns}
      />
    </div>
  );
}

export default CampaignsPage;