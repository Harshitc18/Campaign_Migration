import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentBlockMoEngageModal from './ContentBlockMoEngageModal';

function ContentBlocksPage() {
  const [contentBlocks, setContentBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMoEngageModal, setShowMoEngageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchContentBlocks();
  }, []);

  const fetchContentBlocks = async () => {
    setLoading(true);
    setError('');

    try {
      // Get credentials from localStorage
      const savedCredentials = localStorage.getItem('brazeContentBlockCredentials');
      if (!savedCredentials) {
        setError('No Braze credentials found. Please login again.');
        navigate('/content-blocks-login');
        return;
      }

      const credentials = JSON.parse(savedCredentials);
      
      // Make API call to fetch content blocks
      const response = await fetch(`http://localhost:8084/braze/content-blocks?session_id=${credentials.sessionId}&app_group_id=${credentials.appGroupId}&dashboard_number=${credentials.dashboardNumber || 9}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content blocks: ${response.status}`);
      }

      const data = await response.json();
      setContentBlocks(data.content_blocks || []);
    } catch (err) {
      console.error('Error fetching content blocks:', err);
      setError('Failed to fetch content blocks. Please check your connection and credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBlock = (blockId) => {
    setSelectedBlocks(prev => {
      if (prev.includes(blockId)) {
        return prev.filter(id => id !== blockId);
      } else {
        return [...prev, blockId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedBlocks.length === filteredBlocks.length) {
      setSelectedBlocks([]);
    } else {
      setSelectedBlocks(filteredBlocks.map(block => block.id));
    }
  };

  const handleMigrate = () => {
    if (selectedBlocks.length === 0) {
      alert('Please select at least one content block to migrate.');
      return;
    }
    setShowMoEngageModal(true);
  };

  const handleMigrationComplete = () => {
    setShowMoEngageModal(false);
    setSelectedBlocks([]);
    // Optionally refresh the content blocks list
    fetchContentBlocks();
  };

  const handleBack = () => {
    navigate('/');
  };

  const filteredBlocks = contentBlocks.filter(block =>
    block.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #00AFB9',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6B7280', fontSize: '16px' }}>Fetching content blocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h1 style={{
              color: '#1D244F',
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🧩 Braze Content Blocks
            </h1>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ← Back to Platform Selection
            </button>
          </div>

          {/* Search and Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Search content blocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              <span>
                Total: <strong style={{ color: '#1D244F' }}>{filteredBlocks.length}</strong>
              </span>
              <span>
                Selected: <strong style={{ color: '#00AFB9' }}>{selectedBlocks.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚠️ {error}
            <button
              onClick={fetchContentBlocks}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                backgroundColor: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Actions Bar */}
        {filteredBlocks.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedBlocks.length === filteredBlocks.length ? '#00AFB9' : '#F3F4F6',
                  color: selectedBlocks.length === filteredBlocks.length ? '#FFFFFF' : '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {selectedBlocks.length === filteredBlocks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <button
              onClick={handleMigrate}
              disabled={selectedBlocks.length === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedBlocks.length > 0 ? '#00AFB9' : '#9CA3AF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: selectedBlocks.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🚀 Migrate Selected ({selectedBlocks.length})
            </button>
          </div>
        )}

        {/* Content Blocks Grid */}
        {filteredBlocks.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {filteredBlocks.map((block) => (
              <div
                key={block.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: selectedBlocks.includes(block.id) ? '2px solid #00AFB9' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedBlocks.includes(block.id) ? '0 4px 12px rgba(0, 175, 185, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                onClick={() => handleSelectBlock(block.id)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    color: '#1D244F',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {block.name || 'Unnamed Block'}
                  </h3>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '2px solid',
                    borderColor: selectedBlocks.includes(block.id) ? '#00AFB9' : '#D1D5DB',
                    backgroundColor: selectedBlocks.includes(block.id) ? '#00AFB9' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '12px',
                    flexShrink: 0
                  }}>
                    {selectedBlocks.includes(block.id) && (
                      <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                    )}
                  </div>
                </div>

                {block.description && (
                  <p style={{
                    color: '#6B7280',
                    fontSize: '14px',
                    margin: '0 0 12px 0',
                    lineHeight: '1.4'
                  }}>
                    {block.description.length > 100 
                      ? `${block.description.substring(0, 100)}...` 
                      : block.description
                    }
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#9CA3AF'
                }}>
                  <span>ID: {block.id}</span>
                  {block.tags && block.tags.length > 0 && (
                    <span>{block.tags.length} tag{block.tags.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                {block.tags && block.tags.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}>
                    {block.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {block.tags.length > 3 && (
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: '#E5E7EB',
                        color: '#6B7280',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        +{block.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '60px 40px',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <h3 style={{
                color: '#1D244F',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                No Content Blocks Found
              </h3>
              <p style={{
                color: '#6B7280',
                fontSize: '16px',
                marginBottom: '24px'
              }}>
                {searchTerm ? 'No content blocks match your search criteria.' : 'No content blocks were found in your Braze account.'}
              </p>
              <button
                onClick={fetchContentBlocks}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#00AFB9',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            </div>
          )
        )}
      </div>

      {/* MoEngage Modal */}
      {showMoEngageModal && (
        <ContentBlockMoEngageModal
          selectedBlocks={selectedBlocks.map(id => contentBlocks.find(block => block.id === id)).filter(Boolean)}
          onClose={() => setShowMoEngageModal(false)}
          onComplete={handleMigrationComplete}
        />
      )}

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

export default ContentBlocksPage;
