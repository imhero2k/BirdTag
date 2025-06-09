import React, { useState, useEffect } from 'react';
import './Search.css';

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
      className="media-thumbnail media-thumbnail-image"
      style={{ height: width * 0.75 }}
      onClick={() => onMediaClick(url)}
      onError={handleImageError}
    />
  );

  const renderVideoThumbnail = () => {
    // Try to get the original video URL for thumbnail generation
    const originalUrl = url.replace('/thumbnails/', '/');
    
    return (
      <div
        className="media-placeholder media-placeholder-video"
        style={{ width: width, height: width * 0.75 }}
        onClick={() => onMediaClick(originalUrl)}
      >
        {/* Video icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <div className="media-label media-label-video">
          VIDEO
        </div>
        
        {/* Try to show actual video thumbnail if available */}
        <video
          className="video-overlay"
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
        className="media-placeholder media-placeholder-audio"
        style={{ width: width, height: width * 0.75 }}
        onClick={() => onMediaClick(originalUrl)}
      >
        {/* Audio waveform icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#4a90e2">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <div className="media-label media-label-audio">
          AUDIO
        </div>
        
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
    );
  };

  const renderUnknownThumbnail = () => (
    <div
      className="media-placeholder media-placeholder-unknown"
      style={{ width: width, height: width * 0.75 }}
      onClick={() => onMediaClick(url)}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#999">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      <div className="media-label media-label-unknown">
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
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h3>
            {showOnlyImages 
              ? 'Select an Image Thumbnail for Reverse Lookup' 
              : 'Select a Thumbnail for Reverse Lookup'
            }
          </h3>
          <button 
            onClick={onClose}
            className="btn btn-danger"
          >
            Close
          </button>
        </div>

        {/* Search */}
        <div className="modal-search">
          <input
            type="text"
            placeholder="Filter by bird species..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
          />
          {showOnlyImages && (
            <div className="modal-info">
              Showing images only (reverse lookup works with image thumbnails)
              <br />
              Found {filteredItems.length} image{filteredItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-display">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-display">
            Loading gallery...
          </div>
        )}

        {/* Thumbnails grid */}
        <div className="thumbnails-grid">
          {filteredItems.map((item, index) => (
            <div 
              key={item.file_id || index}
              className="thumbnail-item"
              onClick={() => handleThumbnailClick(item.url)}
            >
              {/* Simple thumbnail */}
              <img
                src={item.url}
                alt="thumbnail"
                className="thumbnail-image"
                onError={(e) => {
                  // If image fails, show a placeholder
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              
              {/* Fallback placeholder */}
              <div className="thumbnail-fallback">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#999">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                <span className="media-label media-label-unknown">
                  {item.file_type || 'FILE'}
                </span>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="thumbnail-tags">
                  {item.tags.slice(0, 2).join(', ')}
                  {item.tags.length > 2 && '...'}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && !loading && (
          <p className="no-results">
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
    <div className="search-container">
      <h2 className="search-main-title">BirdTag Queries</h2>

      {/* Error Display */}
      {error && (
        <div className="error-display">
          {error}
        </div>
      )}

      {/* Tag + Count Search */}
      <section className="search-section">
        <h4>1. Tag + Count Search</h4>
        {tags.map((t, i) => (
          <div key={i} className="tag-input-row">
            <input
              placeholder="Tag (e.g., crow)"
              value={t.tag}
              onChange={(e) => handleTagChange(i, 'tag', e.target.value)}
              className="tag-input"
            />
            <input
              type="number"
              value={t.count}
              onChange={(e) => handleTagChange(i, 'count', e.target.value)}
              className="count-input"
              min="1"
            />
            {tags.length > 1 && (
              <button onClick={() => removeTagField(i)} className="btn btn-secondary btn-small">
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={addTagField} className="btn btn-secondary">+ Add Tag</button>
        <button onClick={runTagCountQuery} className="btn btn-primary btn-add" disabled={loading}>
          Search
        </button>
      </section>

      {/* Multi-Species */}
      <section className="search-section">
        <h4>2. Search by Bird Species</h4>
        {speciesList.map((s, i) => (
          <div key={i} className="tag-input-row">
            <input
              value={s}
              placeholder={`Species ${i + 1}`}
              onChange={(e) => {
                const updated = [...speciesList];
                updated[i] = e.target.value.toLowerCase();
                setSpeciesList(updated);
              }}
              className="species-input"
            />
            {speciesList.length > 1 && (
              <button 
                onClick={() => setSpeciesList(speciesList.filter((_, index) => index !== i))}
                className="btn btn-secondary btn-small"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setSpeciesList([...speciesList, ''])} className="btn btn-secondary">
          + Add Species
        </button>
        <button onClick={runSpeciesQuery} className="btn btn-primary btn-add" disabled={loading}>
          Search
        </button>
      </section>

      {/* Enhanced Reverse Lookup */}
      <section className="search-section">
        <h4>3. Reverse Lookup from Thumbnail URL</h4>
        <p>
          Find the original full-size image from any image URL.
        </p>
        
        <div className="url-input-row">
          <input
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            placeholder="Paste any image URL or select from gallery"
            className="url-input"
          />
          
          <button 
            onClick={() => setShowThumbnailSelector(true)}
            className="btn btn-success"
          >
            Select from Gallery
          </button>
        </div>
        
        {/* Show converted URL if it was modified */}
        {thumbUrl && thumbUrl.includes('/media/images/') && (
          <div className="converted-url-display">
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
          className="btn btn-primary"
        >
          Find Full Image
        </button>
      </section>

      {/* Thumbnail Selector Modal */}
      {showThumbnailSelector && (
        <ThumbnailSelector
          onSelectThumbnail={handleSelectThumbnail}
          onClose={() => setShowThumbnailSelector(false)}
          showOnlyImages={true}
        />
      )}

      {/* File Match */}
      <section className="search-section">
        <h4>4. Upload File for Similar Tag Match</h4>
        <p className="italic">
           Your file is analyzed temporarily and not saved to your account
        </p>
        
        <input 
          type="file" 
          onChange={(e) => setQueryFile(e.target.files[0])}
          accept="image/*,video/*,audio/*"
          disabled={loading}
          className="file-input"
        />
        
        <button 
          onClick={runFileQuery}
          disabled={loading || !queryFile}
          className="btn btn-primary btn-add"
        >
          {loading ? 'Processing...' : 'Find Similar Birds'}
        </button>
        
        {/* Show upload status */}
        {fileUploadStatus && (
          <p className={`upload-status ${loading ? 'loading' : 'success'}`}>
            {fileUploadStatus}
          </p>
        )}
        
        {/* File info */}
        {queryFile && (
          <p className="file-info">
            Selected: {queryFile.name} ({(queryFile.size / 1024 / 1024).toFixed(1)} MB)
            {queryFile.type.startsWith('video/') && ' - Videos may take 20-30 seconds to process'}
          </p>
        )}
      </section>

      {/* Delete */}
      <section className="search-section">
        <h4>5. Delete Files</h4>
        <p>
          Select multiple media files from your gallery and delete them permanently.
        </p>
        
        <button 
          onClick={onNavigateToDeleteFiles}
          className="btn btn-danger btn-large"
        >
          Open Delete Files Gallery
        </button>
      </section>

      {/* Manual Bulk Tagging - Updated to navigation */}
      <section className="search-section">
        <h4>6. Manual Bulk Tagging</h4>
        <p>
          Select multiple media files from your gallery and add or remove tags in bulk.
        </p>
        
        <button 
          onClick={onNavigateToBulkTagging}
          className="btn btn-success btn-large"
        >
          Open Bulk Tagging Gallery
        </button>
      </section>

      {/* Enhanced Results Display */}
      <section className="results-section">
        {loading && (
          <div className="loading-display">
            Loading...
          </div>
        )}
        
        {results.length > 0 && (
          <div>
            <h4>Results ({results.length} found)</h4>
            <div className="results-grid">
              {results.map((mediaUrl, i) => (
                <div key={i} className="result-item">
                  <MediaThumbnail
                    url={mediaUrl}
                    index={i}
                    onMediaClick={handleMediaClick}
                    width={150}
                  />
                  <div className="result-index">
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