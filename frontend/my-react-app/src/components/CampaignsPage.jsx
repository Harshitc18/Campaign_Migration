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
  const campaignsPerPage = 15; // Increased for list view
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
            'X-Dashboard-Url': `https://dashboard-${String(credentials.dashboard_number || 9).padStart(2, '0')}.braze.com`,
            'X-Session-Id': credentials.session_id,
            'X-App-Group-Id': credentials.app_group_id,
          },
        });

        // The FastAPI returns an array of campaign summaries directly
        if (response.data && Array.isArray(response.data)) {
          // Debug: Log the first campaign to see the actual data structure
          if (response.data.length > 0) {
            console.log('Sample campaign data from API:', response.data[0]);
          }
          
          // Map the FastAPI response format to the expected frontend format
          const mappedCampaigns = response.data.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type === 'multi' ? 'multi' : campaign.type, // Keep 'multi' for push campaigns
            created: campaign.created,
            last_edit: campaign.last_edit,
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
    console.log('🚀 Single campaign migration triggered for:', campaign.name);
    // Clear any previous migration status to avoid conflicts
    console.log('🗑️ Clearing previous migration status...');
    localStorage.removeItem('migrationStatus');
    localStorage.removeItem('migrationData');
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
      // Clear any previous migration status to avoid conflicts
      console.log('🗑️ Clearing previous migration status...');
      localStorage.removeItem('migrationStatus');
      localStorage.removeItem('migrationData');
      setShowMoEngageAuth(true);
    }
  };

  const handleMoEngageAuth = async (moEngageCredentials, campaignIds) => {
    try {
      console.log('🚀 Starting migration setup...');
      console.log('Selected campaign IDs:', Array.from(campaignIds));
      console.log('MoEngage credentials received:', Object.keys(moEngageCredentials));
      
      // Get Braze credentials from localStorage (fix the key name)
      const brazeCredentials = localStorage.getItem('brazeCredentials');
      const parsedBrazeCredentials = brazeCredentials ? JSON.parse(brazeCredentials) : null;
      
      console.log('Braze credentials from localStorage:', parsedBrazeCredentials ? 'Found' : 'Not found');
      
      // Navigate to migration progress page
      const selectedCampaignData = campaigns.filter(c => campaignIds.has(c.id));
      console.log('Selected campaign data:', selectedCampaignData);
      
      // Store migration data in localStorage for the migration page
      const migrationData = {
        campaigns: selectedCampaignData,
        moEngageCredentials: moEngageCredentials,
        brazeCredentials: parsedBrazeCredentials,
        timestamp: Date.now()
      };
      
      console.log('Storing migration data in localStorage:', migrationData);
      localStorage.setItem('migrationData', JSON.stringify(migrationData));
      
      // Verify storage was successful
      const storedData = localStorage.getItem('migrationData');
      console.log('✅ Migration data stored successfully:', storedData ? 'Yes' : 'No');
      
      // Navigate to migration progress page
      console.log('🔄 Navigating to migration progress page...');
      navigate('/migration-progress');
      
    } catch (error) {
      console.error('❌ Migration setup error:', error);
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
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#00AFB9', // Vibrant Teal
            color: '#FFFFFF',
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
      backgroundColor: '#F9FAFB', // --color-bg-primary
      padding: '0',
      color: '#111827' // --color-text-primary
    }}>
      {/* Add CSS keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .btn-primary {
            transition: all 0.2s ease;
          }
          
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,175,185,0.3);
          }
          
          .btn-success {
            transition: all 0.2s ease;
          }
          
          .btn-success:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,135,103,0.3);
          }
        `}
      </style>

      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1D244F 0%, #00AFB9 100%)', // Deep Navy to Vibrant Teal
        color: '#FFFFFF',
        padding: '40px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '42px',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          🚀 Braze Campaigns
        </h1>
        <p style={{
          margin: '0',
          fontSize: '18px',
          opacity: '0.9'
        }}>
          Manage and migrate your campaigns with ease
        </p>
      </div>

      {/* Controls Section */}
      <div style={{
        backgroundColor: '#FFFFFF', // --color-bg-secondary
        padding: '30px 20px',
        borderBottom: '1px solid #E5E7EB', // --color-border-subtle
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
                border: '2px solid #E5E7EB', // --color-border-subtle
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#FFFFFF', // --color-bg-secondary
                color: '#111827' // --color-text-primary
              }}
              onFocus={(e) => e.target.style.borderColor = '#00AFB9'} // Vibrant Teal focus
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                border: '2px solid #E5E7EB', // --color-border-subtle
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#FFFFFF', // --color-bg-secondary
                color: '#111827', // --color-text-primary
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
            color: '#6B7280', // --color-text-secondary
            fontSize: '14px'
          }}>
            <span>
              <strong style={{ color: '#111827' }}>{filteredCampaigns.length}</strong> campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </span>
            {filteredCampaigns.length !== campaigns.length && (
              <span style={{ color: '#00AFB9' }}> {/* Vibrant Teal */}
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
              backgroundColor: '#FFFFFF', // --color-bg-secondary
              border: '1px solid #E5E7EB', // --color-border-subtle
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
                <div style={{ color: '#1D244F', fontSize: '16px', fontWeight: '600' }}> {/* Deep Navy */}
                  📋 Bulk Migration
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      backgroundColor: '#F3F4F6', // Light gray
                      color: '#1D244F', // Deep Navy
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
                      backgroundColor: '#6B7280', // --color-text-secondary
                      color: '#FFFFFF',
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
                <div style={{ color: '#6B7280', fontSize: '14px' }}> {/* --color-text-secondary */}
                  {selectedCampaigns.size} selected
                  <span style={{ color: '#9CA3AF', marginLeft: '8px' }}>
                    (Only Email, Push & SMS campaigns can be migrated)
                  </span>
                </div>
                {selectedCampaigns.size > 0 && (
                  <button
                    onClick={handleBulkMigrate}
                    style={{
                      backgroundColor: '#008767', // Success Green
                      color: '#FFFFFF',
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

            {/* Campaigns List */}
            <div style={{
              backgroundColor: '#FFFFFF', // --color-bg-secondary
              borderRadius: '12px',
              border: '1px solid #E5E7EB', // --color-border-subtle
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '40px'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 120px 200px',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: '#F9FAFB', // --color-bg-primary
                borderBottom: '1px solid #E5E7EB',
                fontWeight: '600',
                fontSize: '14px',
                color: '#6B7280', // --color-text-secondary
                alignItems: 'center'
              }}>
                <div>SELECT</div>
                <div>CAMPAIGN NAME</div>
                <div>TYPE</div>
                <div style={{ textAlign: 'center' }}>ACTIONS</div>
              </div>

              {/* Campaign Rows */}
              {currentCampaigns.map((campaign, index) => (
                <div 
                  key={campaign.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 120px 200px',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: index < currentCampaigns.length - 1 ? '1px solid #E5E7EB' : 'none',
                    backgroundColor: selectedCampaigns.has(campaign.id) ? '#F0FDFA' : '#FFFFFF', // Light teal for selected
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    opacity: isCampaignMigratable(campaign) ? 1 : 0.6,
                    cursor: isCampaignMigratable(campaign) ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (isCampaignMigratable(campaign)) {
                      handleCampaignSelect(campaign.id);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (isCampaignMigratable(campaign)) {
                      if (!selectedCampaigns.has(campaign.id)) {
                        e.target.style.backgroundColor = '#F9FAFB';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCampaignMigratable(campaign)) {
                      if (!selectedCampaigns.has(campaign.id)) {
                        e.target.style.backgroundColor = '#FFFFFF';
                      }
                    }
                  }}
                >
                  {/* Selection Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isCampaignMigratable(campaign) ? (
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.has(campaign.id)}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent row click from also firing
                          handleCampaignSelect(campaign.id);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#008767' // Success Green
                        }}
                      />
                    ) : (
                      <span style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        fontWeight: '600',
                        padding: '2px 6px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '4px'
                      }}>
                        N/A
                      </span>
                    )}
                  </div>

                  {/* Campaign Name */}
                  <div>
                    <div style={{
                      color: '#1D244F', // Deep Navy
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      lineHeight: '1.2'
                    }}>
                      {campaign.name}
                    </div>
                    <div style={{
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: '12px',
                      color: '#6B7280', // --color-text-secondary
                      backgroundColor: '#F3F4F6',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {campaign.id}
                    </div>
                  </div>

                  {/* Campaign Type */}
                  <div>
                    <span style={{
                      backgroundColor: campaign.type === 'multi' ? '#008767' : 
                                     campaign.type === 'email' ? '#4A90E2' : 
                                     campaign.type === 'sms' ? '#00AFB9' :
                                     campaign.type === 'banner' ? '#F59E0B' : 
                                     campaign.type === 'webhook' ? '#8B5CF6' : '#6B7280',
                      color: '#FFFFFF',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {campaign.type === 'multi' ? 'PUSH' : campaign.type}
                    </span>
                  </div>


                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(campaign.id);
                      }}
                      style={{
                        backgroundColor: '#F3F4F6',
                        color: '#1D244F', // Deep Navy
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
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
                      📋 Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCampaignMigratable(campaign)) {
                          handleMigrate(campaign);
                        }
                      }}
                      disabled={!isCampaignMigratable(campaign)}
                      style={{
                        backgroundColor: isCampaignMigratable(campaign) ? '#008767' : '#6B7280', // Success Green or text-secondary
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: isCampaignMigratable(campaign) ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: '500',
                        opacity: isCampaignMigratable(campaign) ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isCampaignMigratable(campaign)) {
                          e.target.style.backgroundColor = '#006B4F';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isCampaignMigratable(campaign)) {
                          e.target.style.backgroundColor = '#008767';
                        }
                      }}
                    >
                      {isCampaignMigratable(campaign) ? '🚀 Migrate' : '❌ N/A'}
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
                    border: '1px solid #E5E7EB', // --color-border-subtle
                    backgroundColor: currentPage === 1 ? '#F3F4F6' : '#FFFFFF', // --color-bg-secondary
                    color: currentPage === 1 ? '#9CA3AF' : '#111827', // --color-text-primary
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
                      border: '1px solid #E5E7EB', // --color-border-subtle
                      backgroundColor: currentPage === page ? '#00AFB9' : '#FFFFFF', // Vibrant Teal or bg-secondary
                      color: currentPage === page ? '#FFFFFF' : '#00AFB9', // White or Vibrant Teal
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
                    border: '1px solid #E5E7EB', // --color-border-subtle
                    backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#FFFFFF', // --color-bg-secondary
                    color: currentPage === totalPages ? '#9CA3AF' : '#111827', // --color-text-primary
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
              color: '#6B7280', // --color-text-secondary
              fontSize: '14px'
            }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#FFFFFF', // --color-bg-secondary
            borderRadius: '12px',
            border: '1px solid #E5E7EB' // --color-border-subtle
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#1D244F', // Deep Navy
              fontSize: '24px'
            }}>
              No campaigns found
            </h3>
            <p style={{ 
              margin: '0', 
              color: '#6B7280', // --color-text-secondary
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
                  backgroundColor: '#00AFB9', // Vibrant Teal
                  color: '#FFFFFF',
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