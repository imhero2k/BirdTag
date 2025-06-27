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
    
    // Process all file types
    ['images', 'audio', 'video', 'other'].forEach(fileType => {
      if (gallery[fileType] && Array.isArray(gallery[fileType])) {
        gallery[fileType].forEach(item => {
          // If showOnlyImages is true, only include image files
          if (showOnlyImages) {
            const fileTypeLower = item.file_type?.toLowerCase() || '';
            if (!fileTypeLower.startsWith('image/')) {
              return; // Skip non-image files
            }
          }
          
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

  const handleThumbnailClick = (url) => {
    onSelectThumbnail(url);
    onClose();
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Image from Gallery</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <div className="modal-search">
          <input
            type="text"
            placeholder="Search by bird species..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
          />
        </div>
        
        <div className="modal-info">
          {filteredItems.length} images found
        </div>
        
        {loading ? (
          <div className="loading-display">Loading gallery...</div>
        ) : error ? (
          <div className="error-display">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="no-results">
            {searchTag ? 'No images match your search.' : 'No images found in gallery.'}
          </div>
        ) : (
          <div className="thumbnails-grid">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className="thumbnail-item"
                onClick={() => handleThumbnailClick(item.url)}
              >
                <img
                  src={item.url}
                  alt={`thumbnail-${index}`}
                  className="thumbnail-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="thumbnail-fallback">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#999">
                    <path d="M21,19V5c0,-1.1 -0.9,-2 -2,-2H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2zM8.5,13.5l2.5,3.01L14.5,12l4.5,6H5l3.5,-4.5z"/>
                  </svg>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="thumbnail-tags">
                    {item.tags.slice(0, 2).join(', ')}
                    {item.tags.length > 2 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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
          temporary: true  // This ensures the file goes to temp/ folder
        })
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload request failed: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.uploadUrl) {
        throw new Error('No upload URL received');
      }

      // Step 2: Upload file to S3
      setFileUploadStatus('Uploading file...');
      const uploadResult = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': queryFile.type,
        },
        body: queryFile
      });

      if (!uploadResult.ok) {
        throw new Error('File upload failed');
      }

      // Step 3: Search by file using the correct endpoint
      setFileUploadStatus('Analyzing file...');
      const searchResponse = await fetch(`${apiBase}/search/by-file-tag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          s3Key: uploadData.s3Key
        })
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Search failed: ${searchResponse.status}: ${errorText}`);
      }

      const searchData = await searchResponse.json();
      setResults(searchData.links || []);
      setFileUploadStatus('Analysis complete!');
    } catch (err) {
      console.error('File query error:', err);
      setError(err.message);
      setFileUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectThumbnail = (thumbnailUrl) => {
    setShowThumbnailSelector(false);
    setThumbUrl(thumbnailUrl);
    // Automatically run the reverse lookup with thumbnail URL
    sendGet(`${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(thumbnailUrl)}`);
  };

  const handleSelectResult = (mediaUrl) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(mediaUrl)) {
      newSelected.delete(mediaUrl);
    } else {
      newSelected.add(mediaUrl);
    }
    setSelectedResults(newSelected);
  };

  const handleSelectAllResults = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results));
    }
  };

  const handleDeleteSelectedResults = async () => {
    if (selectedResults.size === 0) {
      setError('Please select at least one file to delete');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedResults.size} file(s)? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const urlArray = Array.from(selectedResults);

      const response = await fetch(`${apiBase}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          urls: urlArray
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Delete request failed');
      }

      // Remove deleted files from results
      const remainingResults = results.filter(url => !selectedResults.has(url));
      setResults(remainingResults);
      setSelectedResults(new Set());
      
      alert(`Successfully deleted ${urlArray.length} files`);

    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h2>🔍 Advanced Search</h2>
        <p>Find bird media using multiple search methods</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-display">
          {error}
        </div>
      )}

      <div className="search-grid">
        {/* Tag + Count Search */}
        <div className="search-card">
          <div className="card-header">
            <h3>1. Tag + Count Search</h3>
            <p>Search by bird species and count</p>
          </div>
          <div className="card-content">
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
            <div className="button-group">
              <button onClick={addTagField} className="btn btn-secondary">+ Add Tag</button>
              <button onClick={runTagCountQuery} className="btn btn-primary" disabled={loading}>
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Species */}
        <div className="search-card">
          <div className="card-header">
            <h3>2. Search by Bird Species</h3>
            <p>Find media by specific bird species</p>
          </div>
          <div className="card-content">
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
            <div className="button-group">
              <button onClick={() => setSpeciesList([...speciesList, ''])} className="btn btn-secondary">
                + Add Species
              </button>
              <button onClick={runSpeciesQuery} className="btn btn-primary" disabled={loading}>
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Reverse Lookup */}
        <div className="search-card">
          <div className="card-header">
            <h3>3. Reverse Lookup</h3>
            <p>Find original image from thumbnail URL</p>
          </div>
          <div className="card-content">
            <div className="url-input-row">
              <input
                value={thumbUrl}
                onChange={(e) => setThumbUrl(e.target.value)}
                placeholder="Paste image URL or select from gallery"
                className="url-input"
              />
              <button 
                onClick={() => setShowThumbnailSelector(true)}
                className="btn btn-success"
              >
                Select from Gallery
              </button>
            </div>
            
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
                let cleanUrl = thumbUrl.split('?')[0];
                
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
          </div>
        </div>

        {/* File Match */}
        <div className="search-card">
          <div className="card-header">
            <h3>4. Upload File for Similar Match</h3>
            <p>Find similar birds by uploading a file</p>
          </div>
          <div className="card-content">
            <div className="file-input-container">
              <input 
                type="file" 
                onChange={(e) => setQueryFile(e.target.files[0])}
                accept="image/*,video/*,audio/*"
                disabled={loading}
                className="file-input-hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-input-label">
                {queryFile ? (
                  <div className="file-selected">
                    <span className="file-name">{queryFile.name}</span>
                    <span className="file-size">({(queryFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    {queryFile.type.startsWith('video/') && (
                      <span className="file-note"> - Videos may take 20-30 seconds to process</span>
                    )}
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,20H4C2.89,20 2,19.1 2,18V6C2,4.89 2.89,4 4,4H10L12,6H19A2,2 0 0,1 21,8H21L4,8V18L6.14,10H23.21L20.93,18.5C20.7,19.37 19.92,20 19,20Z"/>
                    </svg>
                    <span>Click to select a file</span>
                    <small>Supports images, videos, and audio files</small>
                  </div>
                )}
              </label>
            </div>
            
            <button 
              onClick={runFileQuery}
              disabled={loading || !queryFile}
              className="btn btn-primary"
            >
              {loading ? 'Processing...' : 'Find Similar Birds'}
            </button>
            
            {fileUploadStatus && (
              <p className={`upload-status ${loading ? 'loading' : 'success'}`}>
                {fileUploadStatus}
              </p>
            )}
          </div>
        </div>

        {/* Management Tools */}
        <div className="search-card management-card">
          <div className="card-header">
            <h3>5. Management Tools</h3>
            <p>Bulk operations and file management</p>
          </div>
          <div className="card-content">
            <div className="management-buttons">
              <button 
                onClick={onNavigateToDeleteFiles}
                className="btn btn-danger"
              >
                🗑️ Delete Files
              </button>
              <button 
                onClick={onNavigateToBulkTagging}
                className="btn btn-success"
              >
                🏷️ Bulk Tagging
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Selector Modal */}
      {showThumbnailSelector && (
        <ThumbnailSelector
          onSelectThumbnail={handleSelectThumbnail}
          onClose={() => setShowThumbnailSelector(false)}
          showOnlyImages={true}
        />
      )}

      {/* Enhanced Results Display */}
      {loading && (
        <div className="loading-display">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>Results ({results.length} found)</h3>
            <div className="results-actions">
              <button 
                onClick={handleSelectAllResults}
                className="btn btn-secondary btn-small"
              >
                {selectedResults.size === results.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedResults.size > 0 && (
                <button 
                  onClick={handleDeleteSelectedResults}
                  disabled={isDeleting}
                  className="btn btn-danger btn-small"
                >
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedResults.size})`}
                </button>
              )}
            </div>
          </div>
          <div className="results-grid">
            {results.map((mediaUrl, i) => (
              <div 
                key={i} 
                className={`result-item ${selectedResults.has(mediaUrl) ? 'selected' : ''}`}
              >
                <div className="result-selection">
                  <input
                    type="checkbox"
                    checked={selectedResults.has(mediaUrl)}
                    onChange={() => handleSelectResult(mediaUrl)}
                    className="result-checkbox"
                  />
                </div>
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
    </div>
  );
};

export default Search;