import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css';

// Media thumbnail component (copied from Search.js with enhancements)
const MediaThumbnail = ({ url, fileType, tags, onMediaClick, width = 200 }) => {
  const [imageError, setImageError] = useState(false);
  const [mediaType, setMediaType] = useState(null);

  // Detect media type from file_type or URL
  const detectMediaType = (url, fileType) => {
    // First try to use the file_type from API response
    if (fileType) {
      if (fileType.startsWith('image/')) return 'image';
      if (fileType.startsWith('video/')) return 'video';  
      if (fileType.startsWith('audio/')) return 'audio';
    }
    
    // Fallback to URL detection
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
        height: 200,
        objectFit: 'cover',
        cursor: 'pointer',
        border: '1px solid #ddd',
        borderRadius: '4px',
        transition: 'transform 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      onError={handleImageError}
    />
  );

  const renderVideoThumbnail = () => (
    <div
      style={{
        width: '100%',
        height: 200,
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease',
        backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%)',
        backgroundSize: '20px 20px'
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
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
        height: 200,
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#f0f8ff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
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
      
      {/* Audio waveform visualization */}
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
        height: 200,
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease'
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
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

const Gallery = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [searchTag, setSearchTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

  useEffect(() => {
    const fetchMedia = async () => {
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

        // Transform the grouped gallery data into flat array
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

    fetchMedia();
  }, []);

  // Transform the grouped gallery response into format for display
  const transformGalleryData = (gallery) => {
    const allItems = [];
    
    // Process all file types
    ['images', 'audio', 'video', 'other'].forEach(fileType => {
      if (gallery[fileType] && Array.isArray(gallery[fileType])) {
        gallery[fileType].forEach(item => {
          // Transform tags from object format {crow: 2, pigeon: 1} to array format ["crow (2)", "pigeon (1)"]
          const tagsArray = transformTags(item.tags || {});
          
          allItems.push({
            url: item.url,
            file_type: item.file_type,
            file_id: item.file_id,
            upload_date: item.upload_date,
            tags: tagsArray,
            tagsObject: item.tags || {} // Keep original for filtering
          });
        });
      }
    });
    
    return allItems;
  };

  // Convert tags object to array format for display
  const transformTags = (tagsObject) => {
    if (!tagsObject || typeof tagsObject !== 'object') {
      return [];
    }
    
    return Object.entries(tagsObject).map(([species, count]) => {
      return count > 1 ? `${species} (${count})` : species;
    });
  };

  // Enhanced media click handler (copied from Search.js)
  const handleMediaClick = async (mediaUrl) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Opening media:', mediaUrl);

      // For images that are thumbnails, try to get original
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

  // Filter items based on search tag
  const filteredItems = searchTag
    ? mediaItems.filter((item) => {
        // Search in both the display tags and original tags object
        const searchLower = searchTag.toLowerCase();
        
        // Check display tags
        const matchesDisplayTags = item.tags?.some(tag =>
          tag.toLowerCase().includes(searchLower)
        );
        
        // Check original tags object keys
        const matchesOriginalTags = Object.keys(item.tagsObject || {}).some(species =>
          species.toLowerCase().includes(searchLower)
        );
        
        return matchesDisplayTags || matchesOriginalTags;
      })
    : mediaItems;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gallery</h2>

      {/* Search input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter by bird species..."
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="search-input"
          style={{
            padding: '12px',
            width: '300px',
            border: '2px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

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

      {/* Error state */}
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

      {/* Gallery grid */}
      <div className="gallery-grid">
        {filteredItems.length === 0 && !loading ? (
          <p>No matching files found.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.file_id || index} className="gallery-tile">
              {/* Media thumbnail */}
              <MediaThumbnail
                url={item.url}
                fileType={item.file_type}
                tags={item.tags}
                onMediaClick={handleMediaClick}
              />
              
              {/* Tags display */}
              {item.tags && item.tags.length > 0 && (
                <ul>
                  {item.tags.map((tag, i) => (
                    <li key={i}>{tag}</li>
                  ))}
                </ul>
              )}
              
              {/* Upload date */}
              {item.upload_date && (
                <div className="upload-date">
                  {new Date(item.upload_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* File count */}
      {mediaItems.length > 0 && (
        <div className="file-count">
          Showing {filteredItems.length} of {totalCount} files
        </div>
      )}
    </div>
  );
};

export default Gallery;