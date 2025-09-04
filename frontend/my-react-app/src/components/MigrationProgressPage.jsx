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
    total: 0,
    processed: new Set() // Track processed campaign IDs to prevent duplicates
  });
  const [logs, setLogs] = useState([]); // Migration logs
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const migrationStarted = useRef(false); // Prevent double execution
  const migrationCompleted = useRef(false); // Track if migration is fully completed

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (migrationStarted.current) return;
    
    // Load migration data from localStorage
    const data = localStorage.getItem('migrationData');
    if (!data) {
      navigate('/campaigns');
      return;
    }

    try {
      const parsedData = JSON.parse(data);
      
      // Validate migration data structure
      if (!parsedData.campaigns || !Array.isArray(parsedData.campaigns)) {
        throw new Error('Invalid migration data: campaigns array is missing');
      }
      
      if (!parsedData.brazeCredentials) {
        throw new Error('Invalid migration data: Braze credentials are missing');
      }
      
      if (!parsedData.moEngageCredentials) {
        throw new Error('Invalid migration data: MoEngage credentials are missing');
      }

      // Check if this specific migration batch was already completed
      const migrationKey = `migration_completed_${Date.now()}_${parsedData.campaigns.map(c => c.id).sort().join('_')}`;
      const migrationAlreadyCompleted = localStorage.getItem(migrationKey);
      
      if (migrationAlreadyCompleted) {
        console.log('This exact migration batch was already completed, preventing duplicate execution');
        addLog('⚠️ This migration batch was already completed. Redirecting back to campaigns.', 'warning');
        setTimeout(() => navigate('/campaigns'), 3000);
        return;
      }
      
      setMigrationData(parsedData);
      setResults(prev => ({ ...prev, total: parsedData.campaigns.length }));
      
      // Mark migration as started to prevent double execution
      migrationStarted.current = true;
      
      // Start migration process
      setTimeout(() => {
        startMigration(parsedData, migrationKey);
      }, 2000);
    } catch (err) {
      setError(`Migration data error: ${err.message}`);
      console.error('Migration data error:', err);
    }
    
    // Cleanup function - but don't reset completion status
    return () => {
      migrationStarted.current = false;
      // Don't reset migrationCompleted to prevent duplicates
    };
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

  const startMigration = async (data, migrationKey) => {
    // Multiple safety checks to prevent double execution
    if (migrationStarted.current || migrationCompleted.current) {
      console.log('Migration already started or completed, preventing duplicate execution');
      addLog('⚠️ Migration already in progress or completed, skipping duplicate execution', 'warning');
      return;
    }
    
    if (currentPhase === 'migrating' || currentPhase === 'completed') {
      console.log('Migration already in progress or completed based on phase, skipping...');
      addLog('⚠️ Migration phase indicates already in progress, skipping', 'warning');
      return;
    }
    
    // Check persistent storage for completion status
    if (localStorage.getItem(migrationKey)) {
      console.log('Migration already completed according to persistent storage');
      addLog('⚠️ Migration already completed (persistent check), preventing duplicate execution', 'warning');
      return;
    }
    
    // Mark migration as started immediately
    migrationStarted.current = true;
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
    
    // Group campaigns by type (email, push, sms)
    const emailCampaigns = data.campaigns.filter(c => c.type === 'email');
    const pushCampaigns = data.campaigns.filter(c => c.type === 'push' || c.type === 'multi');
    const smsCampaigns = data.campaigns.filter(c => c.type === 'sms');
    
    addLog(`📧 Email campaigns: ${emailCampaigns.length}`, 'info');
    addLog(`📱 Push campaigns: ${pushCampaigns.length}`, 'info');
    addLog(`💬 SMS campaigns: ${smsCampaigns.length}`, 'info');
    
    const allCampaigns = [...emailCampaigns, ...pushCampaigns, ...smsCampaigns];
    
    // Additional deduplication check based on ID, name, and type
    const uniqueCampaigns = [];
    const seenCampaigns = new Set();
    
    for (const campaign of allCampaigns) {
      const campaignKey = `${campaign.id}-${campaign.name}-${campaign.type}`;
      if (!seenCampaigns.has(campaignKey)) {
        seenCampaigns.add(campaignKey);
        uniqueCampaigns.push(campaign);
      } else {
        addLog(`⚠️ Duplicate campaign detected and removed: ${campaign.name}`, 'warning');
      }
    }
    
    addLog(`🔍 After deduplication: ${uniqueCampaigns.length} unique campaigns`, 'info');
    
    for (let i = 0; i < uniqueCampaigns.length; i++) {
      const campaign = uniqueCampaigns[i];
      
      // Check if this campaign has already been processed
      if (results.processed.has(campaign.id)) {
        addLog(`⚠️ Skipping ${campaign.name} - already processed`, 'warning');
        continue;
      }
      
      setCurrentCampaign(campaign);
      setCurrentStep(`Processing campaign ${i + 1} of ${uniqueCampaigns.length}`);
      setProgress(Math.round(((i + 1) / uniqueCampaigns.length) * 100));
      
      addLog(`\n� Processing: ${campaign.name} (${campaign.type.toUpperCase()})`, 'info');
      
      try {
        // Step 1: Fetch detailed campaign data from Campaign Fetcher API
        setCurrentStep('Fetching campaign details...');
        addLog(`📡 Fetching campaign details from Braze...`, 'info');
        const campaignDetails = await fetchCampaignDetails(campaign.id, data.brazeCredentials);
        addLog(`✅ Campaign details fetched successfully`, 'success');
        
        // Step 2: Migrate campaign using appropriate service
        setCurrentStep('Creating draft in MoEngage...');
        addLog(`🔄 Sending to ${campaign.type} migration service...`, 'info');
        const migrationResult = await migrateCampaign(campaignDetails, campaign.type, data.moEngageCredentials);
        addLog(`✅ Draft created successfully in MoEngage`, 'success');
        
        // Mark campaign as processed and add to successful results
        setResults(prev => ({
          ...prev,
          successful: [...prev.successful, { 
            ...campaign, 
            migratedAt: new Date().toISOString(),
            moEngageResponse: migrationResult
          }],
          processed: new Set([...prev.processed, campaign.id])
        }));
        
        addLog(`🎉 Migration completed for: ${campaign.name}`, 'success');
        
        // Wait between migrations to show progress
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        addLog(`❌ Migration failed for ${campaign.name}: ${err.message}`, 'error');
        console.error(`❌ Failed to migrate campaign ${campaign.name}:`, err);
        
        // Mark campaign as processed (even if failed) and add to failed results
        setResults(prev => ({
          ...prev,
          failed: [...prev.failed, { 
            ...campaign, 
            error: err.message,
            failedAt: new Date().toISOString()
          }],
          processed: new Set([...prev.processed, campaign.id])
        }));
      }
    }
    
    // Mark migration as fully completed
    migrationCompleted.current = true;
    
    // Store completion status persistently to prevent future duplicates
    localStorage.setItem(migrationKey, JSON.stringify({
      completed: true,
      completedAt: new Date().toISOString(),
      campaignIds: data.campaigns.map(c => c.id),
      successful: results.successful.length,
      failed: results.failed.length
    }));
    
    setCurrentPhase('completed');
    setCurrentCampaign(null);
    setCurrentStep('');
    addLog(`\n🏁 Migration process completed!`, 'success');
    addLog(`✅ Successful: ${results.successful.length}`, 'success');
    addLog(`❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'error' : 'info');
    addLog(`🔒 Migration marked as completed to prevent duplicates`, 'info');
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
        
        // Log additional details from MoEngage response
        if (response.data.moengage_response) {
          addLog(`📋 Draft ID: ${response.data.moengage_response.campaign_id || 'N/A'}`, 'info');
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
    
    // Prevent retry if migration is completed
    if (migrationCompleted.current && currentPhase === 'completed') {
      addLog(`⚠️ Cannot retry - migration is already completed`, 'warning');
      return;
    }
    
    addLog(`\n🔄 Retrying ${results.failed.length} failed migration(s)...`, 'info');
    setCurrentPhase('migrating');
    
    const failedCampaigns = [...results.failed];
    const retrySuccessful = [];
    const retryFailed = [];
    
    // Reset failed list temporarily but keep processed tracking
    setResults(prev => ({ ...prev, failed: [] }));
    
    for (let i = 0; i < failedCampaigns.length; i++) {
      const campaign = failedCampaigns[i];
      
      // Double check - don't retry if somehow already processed successfully
      if (results.processed.has(campaign.id)) {
        addLog(`⚠️ Skipping retry for ${campaign.name} - already processed successfully`, 'warning');
        continue;
      }
      
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
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        addLog(`❌ Retry failed for ${campaign.name}: ${err.message}`, 'error');
        retryFailed.push({
          ...campaign,
          error: err.message,
          failedAt: new Date().toISOString()
        });
      }
    }
    
    // Update results with processed tracking
    setResults(prev => ({
      ...prev,
      successful: [...prev.successful, ...retrySuccessful],
      failed: retryFailed,
      processed: new Set([...prev.processed, ...retrySuccessful.map(c => c.id)])
    }));
    
    setCurrentPhase('completed');
    setCurrentCampaign(null);
    setCurrentStep('');
    
    addLog(`\n🏁 Retry process completed!`, 'success');
    addLog(`✅ Successful retries: ${retrySuccessful.length}`, 'success');
    addLog(`❌ Still failed: ${retryFailed.length}`, retryFailed.length > 0 ? 'error' : 'info');
  };

  const handleBackToCampaigns = () => {
    // Clean up migration data and reset ALL state
    localStorage.removeItem('migrationData');
    
    // Note: We keep the persistent migration completion markers in localStorage
    // These are keyed by campaign IDs and prevent duplicate migrations
    // Only remove the current batch data, not the completion markers
    
    migrationStarted.current = false;
    migrationCompleted.current = false;
    navigate('/campaigns');
  };

  if (!migrationData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #333',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading migration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      padding: '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '1px solid #404040'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '32px',
            fontWeight: '700'
          }}>
            🚀 Campaign Migration
          </h1>
          <p style={{
            margin: 0,
            color: '#b3b3b3',
            fontSize: '18px'
          }}>
            Migrating {migrationData.campaigns.length} campaign(s) to MoEngage
          </p>
        </div>

        {/* Phase Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '40px',
          padding: '0 20px'
        }}>
          <div style={{
            textAlign: 'center',
            opacity: currentPhase === 'preparing' ? 1 : 0.5
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentPhase === 'preparing' ? '#007bff' : '#404040',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: '18px'
            }}>
              ⚙️
            </div>
            <div style={{ fontSize: '14px' }}>Preparing</div>
          </div>
          
          <div style={{
            textAlign: 'center',
            opacity: currentPhase === 'migrating' ? 1 : 0.5
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentPhase === 'migrating' ? '#28a745' : '#404040',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: '18px',
              animation: currentPhase === 'migrating' ? 'pulse 1.5s infinite' : 'none'
            }}>
              🔄
            </div>
            <div style={{ fontSize: '14px' }}>Migrating</div>
          </div>
          
          <div style={{
            textAlign: 'center',
            opacity: currentPhase === 'completed' ? 1 : 0.5
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentPhase === 'completed' ? '#28a745' : '#404040',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: '18px'
            }}>
              ✅
            </div>
            <div style={{ fontSize: '14px' }}>Completed</div>
          </div>
        </div>

        {/* Progress Section */}
        {currentPhase === 'migrating' && (
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #404040',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#ffffff' }}>Migration Progress</h3>
              <span style={{ color: '#b3b3b3', fontSize: '16px' }}>{progress}%</span>
            </div>
            
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '10px',
              height: '20px',
              marginBottom: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#28a745',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.5s ease',
                borderRadius: '10px'
              }}></div>
            </div>
            
            {currentCampaign && (
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #404040'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#ffffff' }}>Currently migrating:</strong>
                </div>
                <div style={{ color: '#b3b3b3', marginBottom: '8px' }}>
                  {currentCampaign.name} ({currentCampaign.type.toUpperCase()})
                </div>
                {currentStep && (
                  <div style={{ 
                    color: '#28a745', 
                    fontSize: '14px',
                    fontStyle: 'italic'
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
            backgroundColor: '#1e1e1e',
            border: '1px solid #404040',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              color: '#ffffff',
              fontSize: '18px'
            }}>
              📋 Migration Logs
            </h3>
            <div style={{
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '15px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              {logs.slice(-20).map((log) => (
                <div 
                  key={log.id} 
                  style={{
                    color: log.type === 'error' ? '#ff6b6b' : 
                           log.type === 'success' ? '#51cf66' : 
                           log.type === 'warning' ? '#ffd43b' : '#c9d1d9',
                    marginBottom: '4px',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  <span style={{ color: '#7d8590', fontSize: '11px' }}>
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
            backgroundColor: '#1e1e1e',
            border: '1px solid #404040',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#ffffff',
              fontSize: '24px'
            }}>
              🎉 Migration Complete!
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                backgroundColor: '#d4edda',
                color: '#155724',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {results.successful.length}
                </div>
                <div>Successful</div>
              </div>
              
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>❌</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {results.failed.length}
                </div>
                <div>Failed</div>
              </div>
              
              <div style={{
                backgroundColor: '#d1ecf1',
                color: '#0c5460',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {results.total}
                </div>
                <div>Total</div>
              </div>
            </div>

            {/* Detailed Results */}
            {results.successful.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#28a745', marginBottom: '15px' }}>
                  ✅ Successfully Migrated
                </h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {results.successful.map((campaign, index) => (
                    <div key={index} style={{
                      backgroundColor: '#2a2a2a',
                      padding: '10px 15px',
                      marginBottom: '8px',
                      borderRadius: '6px',
                      border: '1px solid #404040'
                    }}>
                      <div style={{ color: '#ffffff', fontWeight: '500' }}>
                        {campaign.name}
                      </div>
                      <div style={{ color: '#b3b3b3', fontSize: '12px' }}>
                        {campaign.type.toUpperCase()} • Migrated at {new Date(campaign.migratedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.failed.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#dc3545', marginBottom: '15px' }}>
                  ❌ Failed Migrations
                </h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {results.failed.map((campaign, index) => (
                    <div key={index} style={{
                      backgroundColor: '#2a2a2a',
                      padding: '10px 15px',
                      marginBottom: '8px',
                      borderRadius: '6px',
                      border: '1px solid #404040'
                    }}>
                      <div style={{ color: '#ffffff', fontWeight: '500' }}>
                        {campaign.name}
                      </div>
                      <div style={{ color: '#b3b3b3', fontSize: '12px' }}>
                        {campaign.type.toUpperCase()} • Error: {campaign.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '30px'
            }}>
              <button
                onClick={handleBackToCampaigns}
                style={{
                  backgroundColor: '#007bff',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                📋 Back to Campaigns
              </button>
              
              {results.failed.length > 0 && (
                <button
                  onClick={handleRetryFailed}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#000000',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  🔄 Retry Failed
                </button>
              )}
            </div>

            {/* Final Migration Logs */}
            {logs.length > 0 && (
              <div>
                <h4 style={{ 
                  color: '#ffffff', 
                  marginBottom: '15px',
                  fontSize: '18px'
                }}>
                  📋 Migration Logs
                </h4>
                <div style={{
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '15px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      style={{
                        color: log.type === 'error' ? '#ff6b6b' : 
                               log.type === 'success' ? '#51cf66' : 
                               log.type === 'warning' ? '#ffd43b' : '#c9d1d9',
                        marginBottom: '4px',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      <span style={{ color: '#7d8590', fontSize: '11px' }}>
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
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MigrationProgressPage;
