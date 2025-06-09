import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css'; // Reuse gallery styles

// Media thumbnail component with selection checkbox for deletion
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
        border: isSelected ? '3px solid #f44336' : '1px solid #ddd',
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
        border: isSelected ? '3px solid #f44336' : '1px solid #ddd',
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
        border: isSelected ? '3px solid #f44336' : '1px solid #ddd',
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
        border: isSelected ? '3px solid #f44336' : '1px solid #ddd',
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
      {/* Selection checkbox with red theme */}
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
            cursor: 'pointer',
            accentColor: '#f44336'
          }}
        />
      </div>
      
      {/* Deletion overlay when selected */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(244, 67, 54, 0.8)">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          </svg>
        </div>
      )}
      
      {/* Thumbnail content */}
      {thumbnailContent}
    </div>
  );
};

const DeleteFiles = ({ onBack }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchTag, setSearchTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteFiles = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one file to delete');
      return;
    }

    // Confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedItems.size} file(s)? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const urlArray = Array.from(selectedItems);

      const response = await fetch(`${apiBase}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: urlArray
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Delete request failed');
      }

      // Success - refresh the gallery and clear selections
      await fetchAllMedia();
      setSelectedItems(new Set());
      
      alert(`Successfully deleted ${urlArray.length} files`);

    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
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
        <h2 style={{ margin: 0, color: '#f44336' }}>Delete Files</h2>
      </div>

      {/* Warning message */}
      <div style={{
        backgroundColor: '#fff3e0',
        border: '1px solid #ff9800',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '20px'
      }}>
        <strong>Warning:</strong> Deleted files cannot be recovered. Please select carefully.
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
            backgroundColor: selectedItems.size === filteredItems.length ? '#ff9800' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
        </button>
        
        <span style={{ color: '#666' }}>
          {selectedItems.size} of {filteredItems.length} selected for deletion
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

      {/* Delete interface */}
      {selectedItems.size > 0 && (
        <div style={{
          position: 'sticky',
          bottom: '20px',
          backgroundColor: '#ffffff',
          border: '2px solid #f44336',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          opacity: 1
        }}>
          <h3 style={{ color: '#f44336', margin: '0 0 16px 0' }}>
             Delete {selectedItems.size} selected files
          </h3>
          
          <p style={{ 
            color: '#d32f2f', 
            fontSize: '14px', 
            marginBottom: '16px',
            fontWeight: 'bold'
          }}>
             Warning: This action cannot be undone. All selected files and their thumbnails will be permanently deleted.
          </p>

          {/* Delete button */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setSelectedItems(new Set())}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel Selection
            </button>
            
            <button 
              onClick={handleDeleteFiles}
              disabled={isDeleting}
              style={{
                padding: '10px 24px',
                backgroundColor: isDeleting ? '#ccc' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedItems.size} Files`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteFiles;