import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function MigrationProgressPage() {
  const [migrationData, setMigrationData] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('preparing'); // preparing, migrating, completed
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [currentStep, setCurrentStep] = useState(''); // Current migration step
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({
    successful: [],
    failed: [],
    total: 0
  });
  const [logs, setLogs] = useState([]); // Migration logs
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Load migration data from localStorage
    const data = localStorage.getItem('migrationData');
    if (!data) {
      console.log('No migration data found, redirecting to campaigns');
      setError('No migration data found. Redirecting to campaigns...');
      setTimeout(() => navigate('/campaigns'), 2000);
      return;
    }

    try {
      const parsedData = JSON.parse(data);
      console.log('Migration data loaded:', parsedData);
      
      // Validate migration data structure
      if (!parsedData.campaigns || !Array.isArray(parsedData.campaigns) || parsedData.campaigns.length === 0) {
        throw new Error('Invalid migration data: no campaigns found');
      }
      
      if (!parsedData.brazeCredentials) {
        throw new Error('Invalid migration data: Braze credentials are missing');
      }
      
      if (!parsedData.moEngageCredentials) {
        throw new Error('Invalid migration data: MoEngage credentials are missing');
      }

      setMigrationData(parsedData);
      setResults(prev => ({ ...prev, total: parsedData.campaigns.length }));
      addLog(`🚀 Migration data loaded successfully`, 'success');
      addLog(`📊 Found ${parsedData.campaigns.length} campaign(s) to migrate`, 'info');
      
      // Check if migration was already completed
      const migrationStatus = localStorage.getItem('migrationStatus');
      const currentMigrationId = JSON.stringify(parsedData.campaigns.map(c => c.id).sort());
      
      if (migrationStatus) {
        try {
          const status = JSON.parse(migrationStatus);
          if (status.completed && status.migrationId === currentMigrationId) {
            addLog(`✅ Migration already completed for these campaigns`, 'info');
            addLog(`🔄 Redirecting back to campaigns...`, 'info');
            setTimeout(() => navigate('/campaigns'), 2000);
            return;
          }
        } catch (e) {
          // Invalid stored status, continue with migration
          localStorage.removeItem('migrationStatus');
        }
      }
      
      // Start migration process after a short delay
      setTimeout(() => {
        startMigration(parsedData);
      }, 2000);
      
    } catch (err) {
      const errorMessage = `Migration data error: ${err.message}`;
      setError(errorMessage);
      addLog(`❌ ${errorMessage}`, 'error');
      console.error('Migration data error:', err);
      
      // Redirect back to campaigns after error
      setTimeout(() => navigate('/campaigns'), 3000);
    }
  }, [navigate]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp,
      id: Date.now() + Math.random()
    }]);
  };

  const startMigration = async (data) => {
    console.log('🚀 Starting migration process...');
    setCurrentPhase('migrating');
    addLog('🚀 Starting migration process...', 'info');
    addLog(`📊 Found ${data.campaigns.length} campaign(s) to migrate`, 'info');
    
    // Debug log the credentials
    console.log('Migration data:', {
      campaignCount: data.campaigns.length,
      hasBrazeCredentials: !!data.brazeCredentials,
      hasMoEngageCredentials: !!data.moEngageCredentials,
      brazeKeys: data.brazeCredentials ? Object.keys(data.brazeCredentials) : [],
      moEngageKeys: data.moEngageCredentials ? Object.keys(data.moEngageCredentials) : []
    });
    
    // Filter and group campaigns by type
    const migratableCampaigns = data.campaigns.filter(c => 
      c.type === 'email' || c.type === 'push' || c.type === 'multi' || c.type === 'sms'
    );
    
    if (migratableCampaigns.length === 0) {
      addLog('❌ No migratable campaigns found', 'error');
      setError('No migratable campaigns found. Only Email, Push, and SMS campaigns can be migrated.');
      setCurrentPhase('completed');
      return;
    }
    
    const emailCampaigns = migratableCampaigns.filter(c => c.type === 'email');
    const pushCampaigns = migratableCampaigns.filter(c => c.type === 'push' || c.type === 'multi');
    const smsCampaigns = migratableCampaigns.filter(c => c.type === 'sms');
    
    addLog(`📧 Email campaigns: ${emailCampaigns.length}`, 'info');
    addLog(`📱 Push campaigns: ${pushCampaigns.length}`, 'info');
    addLog(`💬 SMS campaigns: ${smsCampaigns.length}`, 'info');
    
    // Process campaigns one by one with detailed progress
    for (let i = 0; i < migratableCampaigns.length; i++) {
      const campaign = migratableCampaigns[i];
      
      setCurrentCampaign(campaign);
      setCurrentStep(`Processing campaign ${i + 1} of ${migratableCampaigns.length}`);
      
      // Calculate progressive steps for better UX
      const baseProgress = Math.round((i / migratableCampaigns.length) * 100);
      const stepIncrement = Math.round(100 / migratableCampaigns.length / 4); // 4 steps per campaign
      
      // Step 0: Start processing
      setProgress(baseProgress);
      addLog(`\n📋 Processing: ${campaign.name} (${campaign.type.toUpperCase()})`, 'info');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to show step
      
      try {
        // Step 1: Fetch detailed campaign data from Campaign Fetcher API
        setCurrentStep('Fetching campaign details...');
        setProgress(baseProgress + stepIncrement);
        addLog(`📡 Fetching campaign details from Braze...`, 'info');
        const campaignDetails = await fetchCampaignDetails(campaign.id, data.brazeCredentials);
        addLog(`✅ Campaign details fetched successfully`, 'success');
        
        // Step 2: Prepare migration data
        setCurrentStep('Preparing migration data...');
        setProgress(baseProgress + (stepIncrement * 2));
        await new Promise(resolve => setTimeout(resolve, 800)); // Show preparation step
        addLog(`📝 Preparing migration payload...`, 'info');
        
        // Step 3: Migrate campaign using appropriate service
        setCurrentStep('Creating draft in MoEngage...');
        setProgress(baseProgress + (stepIncrement * 3));
        addLog(`🔄 Sending to ${campaign.type} migration service...`, 'info');
        const migrationResult = await migrateCampaign(campaignDetails, campaign.type, data.moEngageCredentials);
        addLog(`✅ Draft created successfully in MoEngage`, 'success');
        
        // Step 4: Complete campaign processing
        setCurrentStep('Finalizing migration...');
        setProgress(Math.round(((i + 1) / migratableCampaigns.length) * 100));
        
        // Add to successful results
        setResults(prev => ({
          ...prev,
          successful: [...prev.successful, { 
            ...campaign, 
            migratedAt: new Date().toISOString(),
            moEngageResponse: migrationResult
          }]
        }));
        
        addLog(`🎉 Migration completed for: ${campaign.name}`, 'success');
        
        // Wait between migrations to show progress
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        addLog(`❌ Migration failed for ${campaign.name}: ${err.message}`, 'error');
        console.error(`❌ Failed to migrate campaign ${campaign.name}:`, err);
        
        // Complete progress for failed campaign too
        setProgress(Math.round(((i + 1) / migratableCampaigns.length) * 100));
        
        // Add to failed results
        setResults(prev => ({
          ...prev,
          failed: [...prev.failed, { 
            ...campaign, 
            error: err.message,
            failedAt: new Date().toISOString()
          }]
        }));
        
        // Continue with next campaign
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Mark migration as completed
    setCurrentPhase('completed');
    setCurrentCampaign(null);
    setCurrentStep('');
    addLog(`\n🏁 Migration process completed!`, 'success');
    
    // Store completion status to prevent re-migration
    const migrationId = JSON.stringify(data.campaigns.map(c => c.id).sort());
    localStorage.setItem('migrationStatus', JSON.stringify({
      completed: true,
      completedAt: new Date().toISOString(),
      migrationId: migrationId,
      totalCampaigns: data.campaigns.length
    }));
    
    addLog(`🔒 Migration marked as completed`, 'info');
  };

  const fetchCampaignDetails = async (campaignId, brazeCredentials) => {
    console.log(`📡 Fetching details for campaign ID: ${campaignId}`);
    
    // Validate Braze credentials
    if (!brazeCredentials) {
      throw new Error('Braze credentials are missing. Please ensure you are logged in.');
    }
    
    if (!brazeCredentials.dashboard_url || !brazeCredentials.session_id || !brazeCredentials.app_group_id) {
      throw new Error('Incomplete Braze credentials. Missing dashboard_url, session_id, or app_group_id.');
    }
    
    try {
      const response = await axios.get(`http://localhost:8082/campaigns/${campaignId}/`, {
        headers: {
          'X-Dashboard-Url': brazeCredentials.dashboard_url,
          'X-Session-Id': brazeCredentials.session_id,
          'X-App-Group-Id': brazeCredentials.app_group_id,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        addLog(`📥 Campaign data retrieved successfully`, 'success');
        return response.data;
      } else {
        throw new Error(`Failed to fetch campaign details: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching campaign details:`, error);
      addLog(`❌ Failed to fetch campaign details: ${error.response?.data?.detail || error.message}`, 'error');
      throw new Error(`Campaign fetch failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const migrateCampaign = async (campaignDetails, campaignType, credentials) => {
    console.log(`🔄 Migrating ${campaignType} campaign...`);
    
    // Determine the appropriate endpoint and payload structure
    let endpoint = '';
    let payload = {};
    
    switch (campaignType.toLowerCase()) {
      case 'email':
        endpoint = 'http://localhost:8080/v1/migrate-campaign';
        addLog(`📧 Using Email Migration Service (Port 8080)`, 'info');
        payload = {
          campaign: campaignDetails.campaign || campaignDetails,
          moengage_credentials: {
            bearer_token: credentials.bearer_token,
            refresh_token: credentials.refresh_token,
            origin: credentials.origin || 'https://dashboard-01.moengage.com',
            api_url: credentials.api_url || 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
          }
        };
        break;
        
      case 'push':
      case 'multi':
        endpoint = 'http://localhost:8081/v1/migrate-push-campaign';
        addLog(`📱 Using Push Migration Service (Port 8081)`, 'info');
        payload = {
          campaign: campaignDetails.campaign || campaignDetails,
          moengage_credentials: {
            bearer_token: credentials.bearer_token,
            refresh_token: credentials.refresh_token,
            origin: credentials.origin || 'https://dashboard-01.moengage.com',
            api_url: credentials.api_url || 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
          }
        };
        break;
        
      case 'sms':
        endpoint = 'http://localhost:8083/v1/migrate-sms-campaign';
        addLog(`💬 Using SMS Migration Service (Port 8083)`, 'info');
        payload = {
          campaign: campaignDetails.campaign || campaignDetails,
          moengage_credentials: {
            bearer_token: credentials.bearer_token,
            refresh_token: credentials.refresh_token,
            origin: credentials.origin || 'https://dashboard-01.moengage.com',
            api_url: credentials.api_url || 'https://dashboard-01.moengage.com/v1.0/campaigns/draft'
          }
        };
        break;
        
      default:
        throw new Error(`Unsupported campaign type: ${campaignType}`);
    }
    
    console.log(`📤 Sending request to ${endpoint}`);
    addLog(`📤 Sending migration request...`, 'info');
    
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Migration successful for ${campaignType} campaign`);
        addLog(`✅ MoEngage API responded with success`, 'success');
        
        // Handle different response structures from different services
        let draftId = 'N/A';
        let draftCreated = true;
        
        if (campaignType.toLowerCase() === 'push' || campaignType.toLowerCase() === 'multi') {
          // Push service response structure
          draftCreated = response.data.draft_created !== false;
          if (response.data.moengage_response?.campaign_id) {
            draftId = response.data.moengage_response.campaign_id;
          }
        } else {
          // SMS and Email service response structure (MigrationSuccessResponse)
          if (response.data.moengage_response?.campaign_id) {
            draftId = response.data.moengage_response.campaign_id;
          }
        }
        
        if (draftCreated && draftId !== 'N/A') {
          addLog(`📋 Draft ID: ${draftId}`, 'info');
        } else if (!draftCreated) {
          addLog(`⚠️ Payload converted but draft creation may have failed`, 'warning');
        }
        
        return response.data;
      } else {
        throw new Error(`Migration failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Migration API call failed:`, error);
      
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.detail || error.response.data?.message || error.response.statusText;
        addLog(`❌ Migration service error: ${errorMessage}`, 'error');
        throw new Error(`Migration failed: ${errorMessage}`);
      } else if (error.request) {
        // Request was made but no response received
        const serviceError = `No response from migration service. Is the ${campaignType} service running on the correct port?`;
        addLog(`❌ ${serviceError}`, 'error');
        throw new Error(serviceError);
      } else {
        // Something else happened
        addLog(`❌ Request error: ${error.message}`, 'error');
        throw new Error(`Migration request failed: ${error.message}`);
      }
    }
  };

  const handleRetryFailed = async () => {
    if (results.failed.length === 0) return;
    
    addLog(`\n🔄 Retrying ${results.failed.length} failed migration(s)...`, 'info');
    setCurrentPhase('migrating');
    
    const failedCampaigns = [...results.failed];
    const retrySuccessful = [];
    const retryFailed = [];
    
    // Reset failed list temporarily
    setResults(prev => ({ ...prev, failed: [] }));
    
    for (let i = 0; i < failedCampaigns.length; i++) {
      const campaign = failedCampaigns[i];
      
      setCurrentCampaign(campaign);
      setCurrentStep(`Retrying campaign ${i + 1} of ${failedCampaigns.length}`);
      setProgress(Math.round(((i + 1) / failedCampaigns.length) * 100));
      
      addLog(`🔄 Retrying: ${campaign.name} (${campaign.type.toUpperCase()})`, 'info');
      
      try {
        // Fetch campaign details and migrate
        setCurrentStep('Fetching campaign details...');
        const campaignDetails = await fetchCampaignDetails(campaign.id, migrationData.brazeCredentials);
        
        setCurrentStep('Creating draft in MoEngage...');
        const migrationResult = await migrateCampaign(campaignDetails, campaign.type, migrationData.moEngageCredentials);
        
        retrySuccessful.push({
          ...campaign,
          migratedAt: new Date().toISOString(),
          moEngageResponse: migrationResult
        });
        
        addLog(`✅ Retry successful for: ${campaign.name}`, 'success');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (err) {
        addLog(`❌ Retry failed for ${campaign.name}: ${err.message}`, 'error');
        retryFailed.push({
          ...campaign,
          error: err.message,
          failedAt: new Date().toISOString()
        });
      }
    }
    
    // Update results
    setResults(prev => ({
      ...prev,
      successful: [...prev.successful, ...retrySuccessful],
      failed: retryFailed
    }));
    
    setCurrentPhase('completed');
    setCurrentCampaign(null);
    setCurrentStep('');
    
    addLog(`\n🏁 Retry process completed!`, 'success');
    addLog(`✅ Successful retries: ${retrySuccessful.length}`, 'success');
    addLog(`❌ Still failed: ${retryFailed.length}`, retryFailed.length > 0 ? 'error' : 'info');
  };

  const handleBackToCampaigns = () => {
    // Clean up migration data and status
    localStorage.removeItem('migrationData');
    localStorage.removeItem('migrationStatus');
    navigate('/campaigns');
  };

  if (!migrationData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F9FAFB', // --color-bg-primary
        color: '#111827', // --color-text-primary
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB', // --color-border-subtle
            borderTop: '4px solid #00AFB9', // Vibrant Teal
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          <p style={{
            fontSize: '18px',
            color: '#6B7280', // --color-text-secondary
            margin: 0
          }}>
            Loading migration data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB', // --color-bg-primary
      color: '#111827', // --color-text-primary
      padding: '0'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes progressGlow {
            0%, 100% { box-shadow: 0 0 5px rgba(0, 175, 185, 0.5); }
            50% { box-shadow: 0 0 20px rgba(0, 175, 185, 0.8); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
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
          margin: '0 0 12px 0',
          fontSize: '42px',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          🚀 Campaign Migration
        </h1>
        <p style={{
          margin: '0',
          fontSize: '18px',
          opacity: '0.9'
        }}>
          Migrating {migrationData.campaigns.length} campaign(s) to MoEngage
        </p>
      </div>

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>

        {/* Phase Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '50px',
          padding: '0 40px',
          position: 'relative'
        }}>
          {/* Progress Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20%',
            right: '20%',
            height: '4px',
            backgroundColor: '#E5E7EB', // --color-border-subtle
            borderRadius: '2px',
            zIndex: 1
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#00AFB9', // Vibrant Teal
              borderRadius: '2px',
              width: currentPhase === 'preparing' ? '0%' : 
                     currentPhase === 'migrating' ? '50%' : '100%',
              transition: 'width 0.5s ease'
            }}></div>
          </div>

          <div style={{
            textAlign: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#00AFB9', // Vibrant Teal
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(0, 175, 185, 0.3)',
              border: '3px solid #FFFFFF'
            }}>
              ⚙️
            </div>
            <div style={{ 
              fontSize: '16px',
              fontWeight: '600',
              color: '#1D244F' // Deep Navy
            }}>
              Preparing
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: currentPhase === 'migrating' || currentPhase === 'completed' ? '#008767' : '#E5E7EB', // Success Green or border-subtle
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '20px',
              animation: currentPhase === 'migrating' ? 'pulse 1.5s infinite' : 'none',
              boxShadow: currentPhase === 'migrating' || currentPhase === 'completed' ? '0 4px 12px rgba(0, 135, 103, 0.3)' : 'none',
              border: '3px solid #FFFFFF',
              transition: 'all 0.3s ease'
            }}>
              {currentPhase === 'migrating' ? '🔄' : currentPhase === 'completed' ? '✅' : '🔄'}
            </div>
            <div style={{ 
              fontSize: '16px',
              fontWeight: '600',
              color: currentPhase === 'migrating' || currentPhase === 'completed' ? '#1D244F' : '#6B7280' // Deep Navy or text-secondary
            }}>
              Migrating
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: currentPhase === 'completed' ? '#008767' : '#E5E7EB', // Success Green or border-subtle
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '20px',
              boxShadow: currentPhase === 'completed' ? '0 4px 12px rgba(0, 135, 103, 0.3)' : 'none',
              border: '3px solid #FFFFFF',
              transition: 'all 0.3s ease'
            }}>
              ✅
            </div>
            <div style={{ 
              fontSize: '16px',
              fontWeight: '600',
              color: currentPhase === 'completed' ? '#1D244F' : '#6B7280' // Deep Navy or text-secondary
            }}>
              Completed
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {currentPhase === 'migrating' && (
          <div style={{
            backgroundColor: '#FFFFFF', // --color-bg-secondary
            border: '1px solid #E5E7EB', // --color-border-subtle
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#1D244F', // Deep Navy
                fontSize: '24px',
                fontWeight: '700'
              }}>
                🔄 Migration Progress
              </h3>
              <span style={{ 
                color: '#00AFB9', // Vibrant Teal
                fontSize: '20px',
                fontWeight: '700'
              }}>
                {progress}%
              </span>
            </div>
            
            <div style={{
              backgroundColor: '#F3F4F6', // Light gray background
              borderRadius: '12px',
              height: '24px',
              marginBottom: '24px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                backgroundColor: '#00AFB9', // Vibrant Teal
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.5s ease',
                borderRadius: '12px',
                animation: 'progressGlow 2s infinite',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  animation: 'shimmer 2s infinite'
                }}></div>
              </div>
            </div>
            
            {currentCampaign && (
              <div style={{
                background: 'linear-gradient(135deg, #F0FDFA 0%, #E6F9F4 100%)', // Light teal gradient
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #A7F3D0' // Light teal border
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ 
                    color: '#1D244F', // Deep Navy
                    fontSize: '16px'
                  }}>
                    Currently migrating:
                  </strong>
                </div>
                <div style={{ 
                  color: '#047857', // Dark green for good contrast
                  marginBottom: '12px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {currentCampaign.name} ({currentCampaign.type.toUpperCase()})
                </div>
                {currentStep && (
                  <div style={{ 
                    color: '#00AFB9', // Vibrant Teal
                    fontSize: '15px',
                    fontStyle: 'italic',
                    fontWeight: '500'
                  }}>
                    {currentStep}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Migration Logs */}
        {currentPhase === 'migrating' && logs.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF', // --color-bg-secondary
            border: '1px solid #E5E7EB', // --color-border-subtle
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '40px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              color: '#1D244F', // Deep Navy
              fontSize: '20px',
              fontWeight: '700'
            }}>
              📋 Migration Logs
            </h3>
            <div style={{
              backgroundColor: '#F9FAFB', // --color-bg-primary
              border: '1px solid #E5E7EB', // --color-border-subtle
              borderRadius: '12px',
              padding: '20px',
              maxHeight: '350px',
              overflowY: 'auto',
              fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {logs.slice(-20).map((log) => (
                <div 
                  key={log.id} 
                  style={{
                    color: log.type === 'error' ? '#D92D20' : // Danger Red
                           log.type === 'success' ? '#008767' : // Success Green
                           log.type === 'warning' ? '#F59E0B' : '#111827', // Warning Yellow or text-primary
                    marginBottom: '6px',
                    whiteSpace: 'pre-wrap',
                    padding: '4px 0'
                  }}
                >
                  <span style={{ 
                    color: '#6B7280', // --color-text-secondary
                    fontSize: '12px'
                  }}>
                    [{log.timestamp}]
                  </span>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {currentPhase === 'completed' && (
          <div style={{
            backgroundColor: '#FFFFFF', // --color-bg-secondary
            border: '1px solid #E5E7EB', // --color-border-subtle
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 30px 0',
              color: '#1D244F', // Deep Navy
              fontSize: '32px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              🎉 Migration Complete!
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #E6F9F4 0%, #D1FAE5 100%)', // Success gradient
                color: '#047857', // Dark green
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #A7F3D0' // Light green border
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#1D244F' // Deep Navy
                }}>
                  {results.successful.length}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Successful</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #FEE4E2 0%, #FED7D3 100%)', // Danger gradient
                color: '#B91C1C', // Dark red
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #FECACA' // Light red border
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#1D244F' // Deep Navy
                }}>
                  {results.failed.length}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Failed</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', // Info gradient
                color: '#0369A1', // Dark blue
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #BAE6FD' // Light blue border
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#1D244F' // Deep Navy
                }}>
                  {results.total}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Total</div>
              </div>
            </div>

            {/* Detailed Results */}
            {results.successful.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ 
                  color: '#008767', // Success Green
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  ✅ Successfully Migrated
                </h4>
                <div style={{ 
                  maxHeight: '250px', 
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '12px',
                  backgroundColor: '#F9FAFB' // --color-bg-primary
                }}>
                  {results.successful.map((campaign, index) => (
                    <div key={index} style={{
                      backgroundColor: '#FFFFFF', // --color-bg-secondary
                      padding: '16px 20px',
                      marginBottom: index < results.successful.length - 1 ? '1px' : '0',
                      borderRadius: index === 0 ? '12px 12px 0 0' : 
                                   index === results.successful.length - 1 ? '0 0 12px 12px' : '0',
                      borderLeft: '4px solid #008767' // Success Green accent
                    }}>
                      <div style={{ 
                        color: '#1D244F', // Deep Navy
                        fontWeight: '600',
                        fontSize: '16px',
                        marginBottom: '6px'
                      }}>
                        {campaign.name}
                      </div>
                      <div style={{ 
                        color: '#6B7280', // --color-text-secondary
                        fontSize: '14px'
                      }}>
                        {campaign.type.toUpperCase()} • Migrated at {new Date(campaign.migratedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.failed.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ 
                  color: '#D92D20', // Danger Red
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  ❌ Failed Migrations
                </h4>
                <div style={{ 
                  maxHeight: '250px', 
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '12px',
                  backgroundColor: '#F9FAFB' // --color-bg-primary
                }}>
                  {results.failed.map((campaign, index) => (
                    <div key={index} style={{
                      backgroundColor: '#FFFFFF', // --color-bg-secondary
                      padding: '16px 20px',
                      marginBottom: index < results.failed.length - 1 ? '1px' : '0',
                      borderRadius: index === 0 ? '12px 12px 0 0' : 
                                   index === results.failed.length - 1 ? '0 0 12px 12px' : '0',
                      borderLeft: '4px solid #D92D20' // Danger Red accent
                    }}>
                      <div style={{ 
                        color: '#1D244F', // Deep Navy
                        fontWeight: '600',
                        fontSize: '16px',
                        marginBottom: '6px'
                      }}>
                        {campaign.name}
                      </div>
                      <div style={{ 
                        color: '#6B7280', // --color-text-secondary
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {campaign.type.toUpperCase()} • Failed at {new Date(campaign.failedAt).toLocaleTimeString()}
                      </div>
                      <div style={{ 
                        color: '#D92D20', // Danger Red
                        fontSize: '13px',
                        fontStyle: 'italic'
                      }}>
                        Error: {campaign.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '40px',
              paddingTop: '20px',
              borderTop: '1px solid #E5E7EB' // --color-border-subtle
            }}>
              <button
                onClick={handleBackToCampaigns}
                style={{
                  backgroundColor: '#00AFB9', // Vibrant Teal
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0, 175, 185, 0.3)',
                  minWidth: '180px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0891A5';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0, 175, 185, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#00AFB9';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 175, 185, 0.3)';
                }}
              >
                📋 Back to Campaigns
              </button>
              
              {results.failed.length > 0 && (
                <button
                  onClick={handleRetryFailed}
                  style={{
                    backgroundColor: '#F59E0B', // Warning Yellow
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    minWidth: '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#D97706';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#F59E0B';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                  }}
                >
                  🔄 Retry Failed ({results.failed.length})
                </button>
              )}
            </div>

            {/* Final Migration Logs */}
            {logs.length > 0 && (
              <div>
                <h4 style={{ 
                  color: '#1D244F', // Deep Navy
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  📋 Complete Migration Logs
                </h4>
                <div style={{
                  backgroundColor: '#F9FAFB', // --color-bg-primary
                  border: '1px solid #E5E7EB', // --color-border-subtle
                  borderRadius: '12px',
                  padding: '20px',
                  maxHeight: '350px',
                  overflowY: 'auto',
                  fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      style={{
                        color: log.type === 'error' ? '#D92D20' : // Danger Red
                               log.type === 'success' ? '#008767' : // Success Green
                               log.type === 'warning' ? '#F59E0B' : '#111827', // Warning Yellow or text-primary
                        marginBottom: '6px',
                        whiteSpace: 'pre-wrap',
                        padding: '4px 0'
                      }}
                    >
                      <span style={{ 
                        color: '#6B7280', // --color-text-secondary
                        fontSize: '12px'
                      }}>
                        [{log.timestamp}]
                      </span>{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#FEE4E2', // Danger Red BG
            color: '#D92D20', // Danger Red text
            padding: '24px 30px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid #FECACA', // Light danger border
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MigrationProgressPage;
