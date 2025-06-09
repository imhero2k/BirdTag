import React, { useState, useEffect } from 'react';

// Media thumbnail component that handles images, videos, and audio
const MediaThumbnail = ({ url, index, onMediaClick, width = 150 }) => {
  const [imageError, setImageError] = useState(false);
  const [mediaType, setMediaType] = useState(null);

  // Detect media type from URL or file extension
  const detectMediaType = (url) => {
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    // Image formats
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || 
        lowerUrl.includes('.png') || lowerUrl.includes('.gif') || 
        lowerUrl.includes('.webp') || lowerUrl.includes('.bmp')) {
      return 'image';
    }
    
    // Video formats
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || 
        lowerUrl.includes('.avi') || lowerUrl.includes('.mkv') || 
        lowerUrl.includes('.webm') || lowerUrl.includes('.quicktime')) {
      return 'video';
    }
    
    // Audio formats
    if (lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || 
        lowerUrl.includes('.ogg') || lowerUrl.includes('.m4a') || 
        lowerUrl.includes('.flac') || lowerUrl.includes('.aac')) {
      return 'audio';
    }
    
    return 'unknown';
  };

  const currentMediaType = mediaType || detectMediaType(url);

  const handleImageError = () => {
    setImageError(true);
    // Try to detect media type if image fails to load
    const detectedType = detectMediaType(url);
    setMediaType(detectedType);
  };

  const renderImageThumbnail = () => (
    <img
      src={url}
      alt={`thumbnail-${index}`}
      width={width}
      style={{
        cursor: 'pointer',
        border: '1px solid #ccc',
        borderRadius: '4px',
        transition: 'transform 0.2s',
        objectFit: 'cover',
        height: width * 0.75 // 4:3 aspect ratio
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      onError={handleImageError}
    />
  );

  const renderVideoThumbnail = () => {
    // Try to get the original video URL for thumbnail generation
    const originalUrl = url.replace('/thumbnails/', '/');
    
    return (
      <div
        style={{
          width: width,
          height: width * 0.75,
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
          backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
        onClick={() => onMediaClick(originalUrl)}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        {/* Video icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '4px',
          fontWeight: 'bold'
        }}>
          VIDEO
        </div>
        
        {/* Try to show actual video thumbnail if available */}
        <video
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
            opacity: 0.8
          }}
          muted
          preload="metadata"
          onLoadedMetadata={(e) => {
            // Set current time to 1 second to get a frame
            e.target.currentTime = 1;
          }}
        >
          <source src={originalUrl} />
        </video>
      </div>
    );
  };

  const renderAudioThumbnail = () => {
    const originalUrl = url.replace('/thumbnails/', '/');
    
    return (
      <div
        style={{
          width: width,
          height: width * 0.75,
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          backgroundColor: '#f0f8ff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onClick={() => onMediaClick(originalUrl)}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        {/* Audio waveform icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#4a90e2">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <div style={{
          fontSize: '12px',
          color: '#4a90e2',
          marginTop: '4px',
          fontWeight: 'bold'
        }}>
          AUDIO
        </div>
        
        {/* Audio waveform visualization */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
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
  };

  const renderUnknownThumbnail = () => (
    <div
      style={{
        width: width,
        height: width * 0.75,
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s'
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#999">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      <div style={{
        fontSize: '12px',
        color: '#999',
        marginTop: '4px',
        fontWeight: 'bold'
      }}>
        FILE
      </div>
    </div>
  );

  // Render based on media type
  if (!imageError && (currentMediaType === 'image' || currentMediaType === 'unknown')) {
    return renderImageThumbnail();
  } else if (currentMediaType === 'video') {
    return renderVideoThumbnail();
  } else if (currentMediaType === 'audio') {
    return renderAudioThumbnail();
  } else {
    return renderUnknownThumbnail();
  }
};


// Fixed Mini Gallery for thumbnail selection with better image filtering
const ThumbnailSelector = ({ onSelectThumbnail, onClose, showOnlyImages = false }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTag, setSearchTag] = useState('');

  const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
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
        throw new Error(`Fetch failed: ${res.status}`);
      }

      const data = await res.json();
      const allItems = transformGalleryData(data.gallery || {}, showOnlyImages);
      setMediaItems(allItems);
      setError('');
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load gallery.');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Better image filtering logic
  const transformGalleryData = (gallery, showOnlyImages = false) => {
    const allItems = [];
    
    // Process all categories to find items
    ['images', 'audio', 'video', 'other'].forEach(fileType => {
      if (gallery[fileType] && Array.isArray(gallery[fileType])) {
        gallery[fileType].forEach(item => {
          const tagsArray = transformTags(item.tags || {});
          
          const transformedItem = {
            url: item.url,
            file_type: item.file_type,
            file_id: item.file_id,
            tags: tagsArray,
            tagsObject: item.tags || {}
          };
          
          // If showOnlyImages is true, filter by actual file type instead of category
          if (showOnlyImages) {
            const fileTypeStr = (item.file_type || '').toLowerCase();
            const urlStr = (item.url || '').toLowerCase();
            
            // Check if it's actually an image by file type or URL
            const isImage = fileTypeStr.startsWith('image/') || 
                           urlStr.includes('.jpg') || urlStr.includes('.jpeg') || 
                           urlStr.includes('.png') || urlStr.includes('.gif') || 
                           urlStr.includes('.webp') || urlStr.includes('.bmp') ||
                           urlStr.includes('/thumbnails/'); // Thumbnails are usually images
            
            if (isImage) {
              allItems.push(transformedItem);
            }
          } else {
            // Include all items if not filtering for images only
            allItems.push(transformedItem);
          }
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

  const handleThumbnailClick = (url) => {
    onSelectThumbnail(url);
    onClose();
  };

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '900px',
        maxHeight: '80vh',
        width: '100%',
        overflow: 'auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #eee',
          paddingBottom: '10px'
        }}>
          <h3 style={{ margin: 0 }}>
            {showOnlyImages 
              ? 'Select an Image Thumbnail for Reverse Lookup' 
              : 'Select a Thumbnail for Reverse Lookup'
            }
          </h3>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Filter by bird species..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            style={{
              padding: '8px',
              width: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          {showOnlyImages && (
            <div style={{
              fontSize: '0.85em',
              color: '#666',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              📸 Showing images only (reverse lookup works with image thumbnails)
              <br />
              Found {filteredItems.length} image{filteredItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: 'red', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ color: '#1976d2', marginBottom: '20px' }}>
            Loading gallery...
          </div>
        )}

        {/* Thumbnails grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '15px',
          maxHeight: '50vh',
          overflow: 'auto'
        }}>
          {filteredItems.map((item, index) => (
            <div 
              key={item.file_id || index}
              style={{
                border: '2px solid #ddd',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: '#fafafa'
              }}
              onClick={() => handleThumbnailClick(item.url)}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2196f3';
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.backgroundColor = '#fafafa';
              }}
            >
              {/* Simple thumbnail */}
              <img
                src={item.url}
                alt="thumbnail"
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
                onError={(e) => {
                  // If image fails, show a placeholder
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              
              {/* Fallback placeholder */}
              <div style={{
                display: 'none',
                width: '100%',
                height: '120px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#999">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                <span style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {item.file_type || 'FILE'}
                </span>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#666'
                }}>
                  {item.tags.slice(0, 2).join(', ')}
                  {item.tags.length > 2 && '...'}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#666' }}>
            {showOnlyImages 
              ? 'No matching images found. Images might be categorized differently in the system.'
              : 'No matching files found.'
            }
          </p>
        )}
      </div>
    </div>
  );
};

// Enhanced Search component with navigation to bulk tagging and delete files
const Search = ({ onNavigateToBulkTagging, onNavigateToDeleteFiles }) => {
  const [tags, setTags] = useState([{ tag: '', count: 1 }]);
  const [speciesList, setSpeciesList] = useState(['']);
  const [thumbUrl, setThumbUrl] = useState('');
  const [queryFile, setQueryFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileUploadStatus, setFileUploadStatus] = useState('');
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);

  const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

  // Enhanced media click handler
  const handleMediaClick = async (mediaUrl) => {
    try {
      setLoading(true);
      setError('');
      
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      if (!token) {
        throw new Error('Authentication token not available');
      }

      console.log('Opening media:', mediaUrl);

      // If it's already a full URL, open it directly
      if (mediaUrl.includes('/thumbnails/')) {
        // Try to get the original file URL
        try {
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
            if (data.original_url) {
              window.open(data.original_url, '_blank');
              return;
            }
          }
        } catch (err) {
          console.error('API lookup failed, trying fallback:', err);
        }
        
        // Fallback: construct original URL
        const originalUrl = mediaUrl.replace('/thumbnails/', '/');
        window.open(originalUrl, '_blank');
      } else {
        // It's already the original URL
        window.open(mediaUrl, '_blank');
      }
    } catch (err) {
      console.error('Media click failed:', err);
      setError(`Error opening media: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = (index, field, value) => {
    const newTags = [...tags];
    newTags[index][field] = field === 'count' ? parseInt(value) : value.toLowerCase();
    setTags(newTags);
  };

  const addTagField = () => setTags([...tags, { tag: '', count: 1 }]);
  const removeTagField = (index) => setTags(tags.filter((_, i) => i !== index));

  const sendPost = async (url, payload, isFile = false) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        ...(isFile ? {} : { 'Content-Type': 'application/json' })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: isFile ? payload : JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data.links || []);
    } catch (err) {
      console.error('sendPost error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendGet = async (url) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data.links || []);
    } catch (err) {
      console.error('sendGet error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runTagCountQuery = () => {
    const query = Object.fromEntries(tags.map(({ tag, count }) => [tag, count]));
    sendPost(`${apiBase}/search/by-tags`, query);
  };

  const runSpeciesQuery = () => {
    if (speciesList.length === 0 || speciesList.every(s => !s.trim())) {
      setError('Please enter at least one species name');
      return;
    }

    const queryParams = speciesList
      .filter(s => s.trim())
      .map((s, i) => `species${speciesList.length > 1 ? i + 1 : ''}=${encodeURIComponent(s)}`)
      .join('&');

    const fullUrl = `${apiBase}/search/by-species-no-count?${queryParams}`;
    sendGet(fullUrl);
  };

  const runFileQuery = async () => {
    if (!queryFile) {
      setError('Please select a file first');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setFileUploadStatus('Getting upload URL...');
    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();
      // Step 1: Get temporary upload URL
      setFileUploadStatus('Getting upload URL...');
      const uploadResponse = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: queryFile.name,
          fileType: queryFile.type,
          temporary: true  // IMPORTANT: This makes it temporary
        })
      });
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }
      const uploadData = await uploadResponse.json();
      console.log('Upload response data:', uploadData);
      
      // Verify we have the required field for search
      if (!uploadData.s3Key) {
        throw new Error('Upload response missing s3Key');
      }
      
      // Step 2: Upload file to S3
      setFileUploadStatus('Uploading file for analysis...');
      const s3Response = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': queryFile.type },
        body: queryFile
      });
      if (!s3Response.ok) {
        throw new Error('Failed to upload file');
      }
      
      // Step 3: Search for matching files
      setFileUploadStatus('Detecting birds and finding matches... (this may take up to 30 seconds)');
      
      // The /search/by-file-tag endpoint only expects s3Key
      const searchPayload = { s3Key: uploadData.s3Key };
      
      console.log('Search payload:', searchPayload);
      
      const searchResponse = await fetch(`${apiBase}/search/by-file-tag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchPayload)
      });
      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(errorData.error || 'Search failed');
      }
      const results = await searchResponse.json();
      // Step 4: Show results
      setResults(results.links || []);
      const birdTypes = Object.keys(results.detected_tags || {}).join(', ');
      setFileUploadStatus(`Found ${results.match_count || 0} files with similar birds: ${birdTypes}`);
    } catch (err) {
      setError(err.message);
      setFileUploadStatus('');
    } finally {
      setLoading(false);
    }
  };


  const handleSelectThumbnail = (url) => {
    // Strip query parameters from presigned URLs
    const cleanUrl = url.split('?')[0];
    
    // UPDATED: Handle cross-bucket conversion
    let thumbnailUrl = cleanUrl;
    if (cleanUrl.includes('/media/images/')) {
      // Extract filename from original URL
      const filename = cleanUrl.split('/').pop();
      // Create thumbnail URL in different bucket
      thumbnailUrl = `https://thumbnailbucket134.s3.amazonaws.com/thumbnails/${filename}`;
    }
    
    setThumbUrl(thumbnailUrl);
    // Automatically run the reverse lookup with thumbnail URL
    sendGet(`${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(thumbnailUrl)}`);
  };

  return (
    <div style={{ padding: 20, maxWidth: '900px', margin: 'auto' }}>
      <h2>BirdTag Query Panel</h2>

      {/* Error Display */}
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #ffcdd2'
        }}>
          {error}
        </div>
      )}

      {/* Tag + Count Search */}
      <section style={{ marginBottom: '30px' }}>
        <h4>1. Tag + Count Search</h4>
        {tags.map((t, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <input
              placeholder="Tag (e.g., crow)"
              value={t.tag}
              onChange={(e) => handleTagChange(i, 'tag', e.target.value)}
              style={{ marginRight: 8, padding: '4px' }}
            />
            <input
              type="number"
              value={t.count}
              onChange={(e) => handleTagChange(i, 'count', e.target.value)}
              style={{ marginRight: 8, padding: '4px', width: '60px' }}
              min="1"
            />
            {tags.length > 1 && <button onClick={() => removeTagField(i)}>Remove</button>}
          </div>
        ))}
        <button onClick={addTagField}>+ Add Tag</button>
        <button onClick={runTagCountQuery} style={{ marginLeft: 10 }} disabled={loading}>
          Search
        </button>
      </section>

      {/* Multi-Species */}
      <section style={{ marginBottom: '30px' }}>
        <h4>2. Search by Bird Species</h4>
        {speciesList.map((s, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <input
              value={s}
              placeholder={`Species ${i + 1}`}
              onChange={(e) => {
                const updated = [...speciesList];
                updated[i] = e.target.value.toLowerCase();
                setSpeciesList(updated);
              }}
              style={{ marginRight: '8px', padding: '4px' }}
            />
            {speciesList.length > 1 && (
              <button onClick={() => setSpeciesList(speciesList.filter((_, index) => index !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setSpeciesList([...speciesList, ''])}>+ Add Species</button>
        <button onClick={runSpeciesQuery} style={{ marginLeft: 10 }} disabled={loading}>
          Search
        </button>
      </section>

      {/* Enhanced Reverse Lookup */}
      <section style={{ marginBottom: '30px' }}>
        <h4>3. Reverse Lookup from Thumbnail URL</h4>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
          Find the original full-size image from any image URL.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            placeholder="Paste any image URL or select from gallery"
            style={{ 
              flex: 1, 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px' 
            }}
          />
          
          <button 
            onClick={() => setShowThumbnailSelector(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Select from Gallery
          </button>
        </div>
        
        {/* Show converted URL if it was modified */}
        {thumbUrl && thumbUrl.includes('/media/images/') && (
          <div style={{
            fontSize: '0.8em',
            color: '#666',
            marginBottom: '8px',
            padding: '6px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            Will search using thumbnail URL: {thumbUrl.replace('/media/images/', '/media/thumbnails/')}
          </div>
        )}
        
        <button 
          onClick={() => {
            if (!thumbUrl.trim()) {
              setError('Please enter a thumbnail URL or select from gallery');
              return;
            }
            // Strip query parameters from presigned URLs
            let cleanUrl = thumbUrl.split('?')[0];
            
            // Convert original image URL to thumbnail URL if needed
            if (cleanUrl.includes('/media/images/')) {
              const filename = cleanUrl.split('/').pop();
              cleanUrl = `https://thumbnailbucket134.s3.amazonaws.com/thumbnails/${filename}`;
            }
            
            sendGet(`${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(cleanUrl)}`);
          }} 
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Find Full Image
        </button>
      </section>

      {/* Thumbnail Selector Modal */}
      {showThumbnailSelector && (
        <ThumbnailSelector
          onSelectThumbnail={handleSelectThumbnail}
          onClose={() => setShowThumbnailSelector(false)}
        />
      )}

      {/* File Match */}
      <section style={{ marginBottom: '30px' }}>
        <h4>4. Upload File for Similar Tag Match</h4>
        <p style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic' }}>
           Your file is analyzed temporarily and not saved to your account
        </p>
        
        <input 
          type="file" 
          onChange={(e) => setQueryFile(e.target.files[0])}
          accept="image/*,video/*,audio/*"
          disabled={loading}
          style={{ marginBottom: '8px' }}
        />
        
        <button 
          onClick={runFileQuery}
          disabled={loading || !queryFile}
          style={{ marginLeft: 10 }}
        >
          {loading ? 'Processing...' : 'Find Similar Birds'}
        </button>
        
        {/* Show upload status */}
        {fileUploadStatus && (
          <p style={{ 
            marginTop: 10, 
            padding: 8, 
            backgroundColor: loading ? '#e3f2fd' : '#e8f5e8',
            borderRadius: 4,
            fontSize: '0.9em'
          }}>
            {fileUploadStatus}
          </p>
        )}
        
        {/* File info */}
        {queryFile && (
          <p style={{ fontSize: '0.8em', color: '#666', marginTop: 5 }}>
            Selected: {queryFile.name} ({(queryFile.size / 1024 / 1024).toFixed(1)} MB)
            {queryFile.type.startsWith('video/') && ' - Videos may take 20-30 seconds to process'}
          </p>
        )}
      </section>

      {/* Delete */}
      <section style={{ marginBottom: '30px' }}>
        <h4>5. Delete Files</h4>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
          Select multiple media files from your gallery and delete them permanently.
        </p>
        
        <button 
          onClick={onNavigateToDeleteFiles}
          style={{
            padding: '12px 24px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#d32f2f'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#f44336'}
        >
          Open Delete Files Gallery
        </button>
      </section>

      {/* Manual Bulk Tagging - Updated to navigation */}
      <section style={{ marginBottom: '30px' }}>
        <h4>6. Manual Bulk Tagging</h4>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
          Select multiple media files from your gallery and add or remove tags in bulk.
        </p>
        
        <button 
          onClick={onNavigateToBulkTagging}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#4caf50'}
        >
          Open Bulk Tagging Gallery
        </button>
      </section>

      {/* Enhanced Results Display */}
      <section style={{ marginTop: 30 }}>
        {loading && (
          <div style={{ 
            color: '#1976d2', 
            backgroundColor: '#e3f2fd', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '20px'
          }}>
            Loading...
          </div>
        )}
        
        {results.length > 0 && (
          <div>
            <h4>Results ({results.length} found)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              {results.map((mediaUrl, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <MediaThumbnail
                    url={mediaUrl}
                    index={i}
                    onMediaClick={handleMediaClick}
                    width={150}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '12px',
                    borderRadius: '3px'
                  }}>
                    #{i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Search;