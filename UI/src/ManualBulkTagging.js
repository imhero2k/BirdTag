import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css'; // Reuse gallery styles

// Media thumbnail component with selection checkbox
const SelectableMediaThumbnail = ({ url, fileType, tags, isSelected, onSelect, onMediaClick, width = 200 }) => {
  const [imageError, setImageError] = useState(false);
  const [mediaType, setMediaType] = useState(null);

  const detectMediaType = (url, fileType) => {
    if (fileType) {
      if (fileType.startsWith('image/')) return 'image';
      if (fileType.startsWith('video/')) return 'video';  
      if (fileType.startsWith('audio/')) return 'audio';
    }
    
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || 
        lowerUrl.includes('.png') || lowerUrl.includes('.gif') || 
        lowerUrl.includes('.webp') || lowerUrl.includes('.bmp')) {
      return 'image';
    }
    
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || 
        lowerUrl.includes('.avi') || lowerUrl.includes('.mkv') || 
        lowerUrl.includes('.webm') || lowerUrl.includes('.quicktime')) {
      return 'video';
    }
    
    if (lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || 
        lowerUrl.includes('.ogg') || lowerUrl.includes('.m4a') || 
        lowerUrl.includes('.flac') || lowerUrl.includes('.aac')) {
      return 'audio';
    }
    
    return 'unknown';
  };

  const currentMediaType = mediaType || detectMediaType(url, fileType);
  const handleImageError = () => {
    setImageError(true);
    setMediaType(detectMediaType(url, fileType));
  };

  const renderImageThumbnail = () => (
    <img
      src={url}
      alt="thumbnail"
      style={{
        width: '100%',
        height: 180,
        objectFit: 'cover',
        cursor: 'pointer',
        border: isSelected ? '3px solid #2196f3' : '1px solid #ddd',
        borderRadius: '4px',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
      onError={handleImageError}
    />
  );

  const renderVideoThumbnail = () => (
    <div
      style={{
        width: '100%',
        height: 180,
        border: isSelected ? '3px solid #2196f3' : '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%)',
        backgroundSize: '20px 20px'
      }}
      onClick={() => onMediaClick(url)}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <div style={{
        fontSize: '14px',
        color: '#666',
        marginTop: '8px',
        fontWeight: 'bold'
      }}>
        VIDEO
      </div>
    </div>
  );

  const renderAudioThumbnail = () => (
    <div
      style={{
        width: '100%',
        height: 180,
        border: isSelected ? '3px solid #2196f3' : '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#f0f8ff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#4a90e2">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
      <div style={{
        fontSize: '14px',
        color: '#4a90e2',
        marginTop: '8px',
        fontWeight: 'bold'
      }}>
        AUDIO
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '15px',
        display: 'flex',
        alignItems: 'end',
        gap: '2px'
      }}>
        {[12, 20, 8, 16, 24, 10, 18, 14, 22, 6, 16, 12].map((height, i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${height}px`,
              backgroundColor: '#4a90e2',
              borderRadius: '1px',
              opacity: 0.7
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderUnknownThumbnail = () => (
    <div
      style={{
        width: '100%',
        height: 180,
        border: isSelected ? '3px solid #2196f3' : '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#999">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      <div style={{
        fontSize: '14px',
        color: '#999',
        marginTop: '8px',
        fontWeight: 'bold'
      }}>
        FILE
      </div>
    </div>
  );

  // Render the appropriate thumbnail
  let thumbnailContent;
  if (!imageError && (currentMediaType === 'image' || currentMediaType === 'unknown')) {
    thumbnailContent = renderImageThumbnail();
  } else if (currentMediaType === 'video') {
    thumbnailContent = renderVideoThumbnail();
  } else if (currentMediaType === 'audio') {
    thumbnailContent = renderAudioThumbnail();
  } else {
    thumbnailContent = renderUnknownThumbnail();
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Selection checkbox */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        zIndex: 10
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer'
          }}
        />
      </div>
      
      {/* Thumbnail content */}
      {thumbnailContent}
    </div>
  );
};

const ManualBulkTagging = ({ onBack }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchTag, setSearchTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Tagging interface state
  const [bulkOperation, setBulkOperation] = useState('add'); // 'add' or 'remove'
  const [bulkTags, setBulkTags] = useState([{ name: '', count: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

  useEffect(() => {
    fetchAllMedia();
  }, []);

  const fetchAllMedia = async () => {
    setLoading(true);
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('Authentication token not available');
      }

      const res = await fetch(`${apiBase}/show-gallery`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      console.log('Gallery API response:', data);

      const allItems = transformGalleryData(data.gallery || {});
      setMediaItems(allItems);
      setTotalCount(data.total_count || allItems.length);
      setError('');
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media files.');
    } finally {
      setLoading(false);
    }
  };

  const transformGalleryData = (gallery) => {
    const allItems = [];
    
    ['images', 'audio', 'video', 'other'].forEach(fileType => {
      if (gallery[fileType] && Array.isArray(gallery[fileType])) {
        gallery[fileType].forEach(item => {
          const tagsArray = transformTags(item.tags || {});
          
          allItems.push({
            url: item.url,
            file_type: item.file_type,
            file_id: item.file_id,
            upload_date: item.upload_date,
            tags: tagsArray,
            tagsObject: item.tags || {}
          });
        });
      }
    });
    
    return allItems;
  };

  const transformTags = (tagsObject) => {
    if (!tagsObject || typeof tagsObject !== 'object') {
      return [];
    }
    
    return Object.entries(tagsObject).map(([species, count]) => {
      return count > 1 ? `${species} (${count})` : species;
    });
  };

  const handleSelectItem = (url) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set()); // Deselect all
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.url))); // Select all filtered
    }
  };

  const handleMediaClick = async (mediaUrl) => {
    // Same media click handler from Gallery
    try {
      console.log('Opening media:', mediaUrl);

      if (mediaUrl.includes('/thumbnails/')) {
        try {
          const { tokens } = await fetchAuthSession();
          const token = tokens?.idToken?.toString();

          const response = await fetch(
            `${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(mediaUrl)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.links && data.links.length > 0) {
              window.open(data.links[0], '_blank');
              return;
            }
          }
        } catch (err) {
          console.error('API lookup failed, trying fallback:', err);
        }
        
        const originalUrl = mediaUrl.replace('/thumbnails/', '/');
        window.open(originalUrl, '_blank');
      } else {
        window.open(mediaUrl, '_blank');
      }
    } catch (err) {
      console.error('Media click failed:', err);
      setError(`Error opening media: ${err.message}`);
    }
  };

  const handleSubmitTags = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one media file');
      return;
    }

    const validTags = bulkTags.filter(t => t.name.trim() && t.count > 0);
    if (validTags.length === 0) {
      setError('Please add at least one valid tag');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const tagArray = validTags.map(t => `${t.name.trim()},${t.count}`);
      const urlArray = Array.from(selectedItems);

      const response = await fetch(`${apiBase}/manual-bulk-tagging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: urlArray,
          operation: bulkOperation === 'add' ? 1 : 0,
          tags: tagArray,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      // Success - refresh the gallery and clear selections
      await fetchAllMedia();
      setSelectedItems(new Set());
      setBulkTags([{ name: '', count: 1 }]);
      
      alert(`Successfully ${bulkOperation === 'add' ? 'added' : 'removed'} tags for ${urlArray.length} files`);

    } catch (err) {
      console.error('Bulk tagging error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items based on search tag
  const filteredItems = searchTag
    ? mediaItems.filter((item) => {
        const searchLower = searchTag.toLowerCase();
        
        const matchesDisplayTags = item.tags?.some(tag =>
          tag.toLowerCase().includes(searchLower)
        );
        
        const matchesOriginalTags = Object.keys(item.tagsObject || {}).some(species =>
          species.toLowerCase().includes(searchLower)
        );
        
        return matchesDisplayTags || matchesOriginalTags;
      })
    : mediaItems;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          style={{
            padding: '8px 16px',
            marginRight: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Search
        </button>
        <h2 style={{ margin: 0 }}>Manual Bulk Tagging</h2>
      </div>

      {/* Selection and search controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px'
      }}>
        <input
          type="text"
          placeholder="Filter by bird species..."
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px'
          }}
        />
        
        <button 
          onClick={handleSelectAll}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedItems.size === filteredItems.length ? '#ff9800' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
        </button>
        
        <span style={{ color: '#666' }}>
          {selectedItems.size} of {filteredItems.length} selected
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #d32f2f'
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          color: '#1976d2',
          backgroundColor: '#e3f2fd',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Loading gallery...
        </div>
      )}

      {/* Gallery grid */}
      <div className="gallery-grid" style={{ marginBottom: '30px' }}>
        {filteredItems.length === 0 && !loading ? (
          <p>No matching files found.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.file_id || index} className="gallery-tile">
              <SelectableMediaThumbnail
                url={item.url}
                fileType={item.file_type}
                tags={item.tags}
                isSelected={selectedItems.has(item.url)}
                onSelect={() => handleSelectItem(item.url)}
                onMediaClick={handleMediaClick}
              />
              
              {/* Tags display */}
              {item.tags && item.tags.length > 0 && (
                <ul style={{ marginTop: '8px' }}>
                  {item.tags.map((tag, i) => (
                    <li key={i}>{tag}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Tagging interface */}
      {selectedItems.size > 0 && (
        <div style={{
          position: 'sticky',
          bottom: '20px',
          backgroundColor: '#ffffff',
          border: '2px solid #2196f3',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          opacity: 1
        }}>
          <h3>Add/Remove Tags for {selectedItems.size} selected files</h3>
          
          {/* Operation selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="radio"
                value="add"
                checked={bulkOperation === 'add'}
                onChange={(e) => setBulkOperation(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              Add Tags
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                value="remove"
                checked={bulkOperation === 'remove'}
                onChange={(e) => setBulkOperation(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              Remove Tags
            </label>
          </div>

          {/* Tags input */}
          {bulkTags.map((tag, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Species name"
                value={tag.name}
                onChange={(e) => {
                  const updated = [...bulkTags];
                  updated[i].name = e.target.value;
                  setBulkTags(updated);
                }}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flex: 1 }}
              />
              <input
                type="number"
                value={tag.count}
                onChange={(e) => {
                  const updated = [...bulkTags];
                  updated[i].count = parseInt(e.target.value) || 1;
                  setBulkTags(updated);
                }}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '80px' }}
                min="1"
              />
              {bulkTags.length > 1 && (
                <button 
                  onClick={() => setBulkTags(bulkTags.filter((_, j) => j !== i))}
                  style={{
                    padding: '8px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
              onClick={() => setBulkTags([...bulkTags, { name: '', count: 1 }])}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Add Tag
            </button>
            
            <button 
              onClick={handleSubmitTags}
              disabled={isSubmitting}
              style={{
                padding: '8px 24px',
                backgroundColor: isSubmitting ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualBulkTagging;