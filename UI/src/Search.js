import React, { useState } from 'react';

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

// Enhanced Search component with proper media handling
const Search = () => {
  const [tags, setTags] = useState([{ tag: '', count: 1 }]);
  const [speciesList, setSpeciesList] = useState(['']);
  const [thumbUrl, setThumbUrl] = useState('');
  const [queryFile, setQueryFile] = useState(null);
  const [deleteUrls, setDeleteUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkOperation, setBulkOperation] = useState(1);
  const [bulkTags, setBulkTags] = useState([{ name: '', count: 1 }]);
  const [fileUploadStatus, setFileUploadStatus] = useState('');

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

      {/* Reverse Lookup */}
      <section style={{ marginBottom: '30px' }}>
        <h4>3. Reverse Lookup from Thumbnail URL</h4>
        <input
          value={thumbUrl}
          onChange={(e) => setThumbUrl(e.target.value)}
          placeholder="Paste thumbnail S3 URL"
          style={{ width: '100%', padding: '4px', marginBottom: '8px' }}
        />
        <button onClick={() => {
          if (!thumbUrl.trim()) {
            setError('Please enter a thumbnail URL');
            return;
          }
          sendGet(`${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(thumbUrl)}`);
        }} disabled={loading}>Find Full Image</button>
      </section>

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
        <textarea
          placeholder="Comma-separated S3 URLs"
          value={deleteUrls}
          onChange={(e) => setDeleteUrls(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '4px', marginBottom: '8px' }}
        />
        <button onClick={() => {
          if (!deleteUrls.trim()) {
            setError('Please enter URLs to delete');
            return;
          }
          const urls = deleteUrls.split(',').map(u => u.trim()).filter(u => u);
          if (urls.length === 0) {
            setError('No valid URLs found');
            return;
          }
          sendPost(`${apiBase}/delete`, { url: urls });
        }} disabled={loading}>Delete</button>
      </section>

      {/* Manual Bulk Tagging */}
      <section style={{ marginBottom: '30px' }}>
        <h4>6. Manual Bulk Tagging</h4>

        <textarea
          value={bulkUrls}
          onChange={(e) => setBulkUrls(e.target.value)}
          placeholder="Enter comma-separated S3 URLs"
          rows={3}
          style={{ width: '100%', padding: '4px', marginBottom: '8px' }}
        />

        <div style={{ margin: '8px 0' }}>
          <label>
            <input 
              type="radio" 
              value={1} 
              checked={bulkOperation === 1} 
              onChange={() => setBulkOperation(1)} 
            />
            Add Tags
          </label>
          <label style={{ marginLeft: 10 }}>
            <input 
              type="radio" 
              value={0} 
              checked={bulkOperation === 0} 
              onChange={() => setBulkOperation(0)} 
            />
            Remove Tags
          </label>
        </div>

        {bulkTags.map((t, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Species name"
              value={t.name}
              onChange={(e) => {
                const updated = [...bulkTags];
                updated[i].name = e.target.value;
                setBulkTags(updated);
              }}
              style={{ marginRight: 8, padding: '4px' }}
            />
            <input
              type="number"
              value={t.count}
              onChange={(e) => {
                const updated = [...bulkTags];
                updated[i].count = parseInt(e.target.value) || 1;
                setBulkTags(updated);
              }}
              style={{ width: 80, padding: '4px' }}
              min="1"
            />
            {bulkTags.length > 1 && (
              <button onClick={() => setBulkTags(bulkTags.filter((_, j) => j !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}

        <button onClick={() => setBulkTags([...bulkTags, { name: '', count: 1 }])}>
          + Add Tag
        </button>
        <button onClick={async () => {
          const urlArray = bulkUrls
            .split(',')
            .map(u => u.trim())
            .filter(u => u.startsWith('http') || u.startsWith('s3://'));

          const tagArray = bulkTags
            .filter(t => /^[a-zA-Z]+$/.test(t.name) && t.count > 0)
            .map(t => `${t.name.trim()},${t.count}`);

          if (!urlArray.length || !tagArray.length || (bulkOperation !== 0 && bulkOperation !== 1)) {
            setError('Invalid input: Check URLs, tags, and operation.');
            return;
          }

          try {
            setLoading(true);
            const { fetchAuthSession } = await import('@aws-amplify/auth');
            const { tokens } = await fetchAuthSession();
            const token = tokens?.idToken?.toString();

            const response = await fetch(`${apiBase}/manual-bulk-tagging`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                url: urlArray,
                operation: bulkOperation,
                tags: tagArray,
              }),
            });

            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Request failed');
            setResults((json.modified_files || []).map(f => f.url));

            console.log('Bulk tagging success:', json);
            setError(''); // Clear any previous errors
          } catch (err) {
            console.error('Bulk tagging error:', err);
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }} style={{ marginLeft: 10 }} disabled={loading}>
          Submit
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