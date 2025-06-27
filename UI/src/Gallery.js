import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css';

// Modern Media thumbnail component
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
    <div className="media-thumbnail">
      <img
        src={url}
        alt="thumbnail"
        onClick={() => onMediaClick(url)}
        onError={handleImageError}
        className="media-image"
      />
      <div className="media-overlay">
        <div className="media-type-badge">IMAGE</div>
      </div>
    </div>
  );

  const renderVideoThumbnail = () => (
    <div className="media-thumbnail">
      <div
        className="media-placeholder video-placeholder"
        onClick={() => onMediaClick(url)}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <div className="media-label">VIDEO</div>
      </div>
      <div className="media-overlay">
        <div className="media-type-badge">VIDEO</div>
      </div>
    </div>
  );

  const renderAudioThumbnail = () => (
    <div className="media-thumbnail">
      <div
        className="media-placeholder audio-placeholder"
        onClick={() => onMediaClick(url)}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#4a90e2">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <div className="media-label">AUDIO</div>
        
        {/* Audio waveform visualization */}
        <div className="audio-waveform">
          {[12, 20, 8, 16, 24, 10, 18, 14, 22, 6, 16, 12].map((height, i) => (
            <div
              key={i}
              className="waveform-bar"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
      <div className="media-overlay">
        <div className="media-type-badge">AUDIO</div>
      </div>
    </div>
  );

  const renderUnknownThumbnail = () => (
    <div className="media-thumbnail">
      <div
        className="media-placeholder unknown-placeholder"
        onClick={() => onMediaClick(url)}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#999">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        <div className="media-label">FILE</div>
      </div>
      <div className="media-overlay">
        <div className="media-type-badge">FILE</div>
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
  const [gallery, setGallery] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('Authentication token not available');
      }

      const res = await fetch('https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/show-gallery', {
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
      console.log('Gallery API response:', data);
      setGallery(data.gallery || {});
      setError('');
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const transformGalleryData = (gallery) => {
    const items = [];
    
    // Check if gallery is an array instead of object
    if (Array.isArray(gallery)) {
      gallery.forEach((item, index) => {
        // Try to detect category from file_type or URL
        let category = 'other';
        if (item.file_type) {
          if (item.file_type.startsWith('image/')) category = 'images';
          else if (item.file_type.startsWith('video/')) category = 'video';
          else if (item.file_type.startsWith('audio/')) category = 'audio';
        } else if (item.url) {
          const lowerUrl = item.url.toLowerCase();
          if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || 
              lowerUrl.includes('.png') || lowerUrl.includes('.gif') || 
              lowerUrl.includes('.webp') || lowerUrl.includes('.bmp')) {
            category = 'images';
          } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || 
                     lowerUrl.includes('.avi') || lowerUrl.includes('.mkv') || 
                     lowerUrl.includes('.webm')) {
            category = 'video';
          } else if (lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || 
                     lowerUrl.includes('.ogg') || lowerUrl.includes('.m4a')) {
            category = 'audio';
          }
        }
        
        items.push({
          url: item.url,
          fileType: item.file_type,
          tags: transformTags(item.tags),
          uploadDate: item.upload_date,
          category: category
        });
      });
    } else {
      // Handle the grouped structure from API
      const categories = ['images', 'audio', 'video', 'other'];
      
      categories.forEach(category => {
        if (gallery[category] && Array.isArray(gallery[category])) {
          gallery[category].forEach((item, index) => {
            items.push({
              url: item.url,
              fileType: item.file_type,
              tags: transformTags(item.tags),
              uploadDate: item.upload_date,
              category: category
            });
          });
        }
      });
    }
    
    return items.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  };

  const transformTags = (tagsObject) => {
    if (!tagsObject) return [];
    return Object.entries(tagsObject).map(([tag, count]) => ({
      tag,
      count: typeof count === 'number' ? count : 1
    }));
  };

  const handleMediaClick = async (mediaUrl) => {
    try {
      window.open(mediaUrl, '_blank');
    } catch (error) {
      console.error('Error opening media:', error);
    }
  };

  const allItems = transformGalleryData(gallery);

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="loading-display">
          <div className="loading-spinner"></div>
          <p>Loading your media gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-container">
        <div className="error-display">
          <h3>Error Loading Gallery</h3>
          <p>{error}</p>
          <button onClick={fetchGallery} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>🖼️ Media Gallery</h2>
        <p>Browse your uploaded bird media files</p>
      </div>

      {allItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>No files found</h3>
          <p>Your gallery is empty. Upload some media files to get started!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {allItems.map((item, index) => (
            <div key={index} className="gallery-card">
              <MediaThumbnail
                url={item.url}
                fileType={item.fileType}
                tags={item.tags}
                onMediaClick={handleMediaClick}
              />
              {item.tags.length > 0 && (
                <div className="gallery-content">
                  <div className="tags-container">
                    {item.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">
                        {tag.tag} {tag.count > 1 && `(${tag.count})`}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="tag more-tags">+{item.tags.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;