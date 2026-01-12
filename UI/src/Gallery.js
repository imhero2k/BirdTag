import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css';

// =======================
// MediaThumbnail component
// =======================
const MediaThumbnail = ({ url, fileType, onMediaClick }) => {
  const [imageError, setImageError] = useState(false);
  const [mediaType, setMediaType] = useState(null);

  const detectMediaType = (u, ft) => {
    if (ft) {
      if (ft.startsWith('image/')) return 'image';
      if (ft.startsWith('video/')) return 'video';
      if (ft.startsWith('audio/')) return 'audio';
    }

    if (!u) return 'unknown';
    const lowerUrl = u.toLowerCase().split('?')[0]; // strip presigned query

    if (
      lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') ||
      lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') ||
      lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.bmp')
    ) return 'image';

    if (
      lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') ||
      lowerUrl.endsWith('.avi') || lowerUrl.endsWith('.mkv') ||
      lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.quicktime')
    ) return 'video';

    if (
      lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') ||
      lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.m4a') ||
      lowerUrl.endsWith('.flac') || lowerUrl.endsWith('.aac')
    ) return 'audio';

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
        transition: 'transform 0.2s ease',
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => (e.target.style.transform = 'scale(1.02)')}
      onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
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
        backgroundImage:
          'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%)',
        backgroundSize: '20px 20px',
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => (e.target.style.transform = 'scale(1.02)')}
      onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
        <path d="M8 5v14l11-7z" />
      </svg>
      <div style={{ fontSize: '14px', color: '#666', marginTop: '8px', fontWeight: 'bold' }}>
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
        transition: 'transform 0.2s ease',
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => (e.target.style.transform = 'scale(1.02)')}
      onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#4a90e2">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
      <div style={{ fontSize: '14px', color: '#4a90e2', marginTop: '8px', fontWeight: 'bold' }}>
        AUDIO
      </div>

      <div style={{ position: 'absolute', bottom: '15px', display: 'flex', alignItems: 'end', gap: '2px' }}>
        {[12, 20, 8, 16, 24, 10, 18, 14, 22, 6, 16, 12].map((h, i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${h}px`,
              backgroundColor: '#4a90e2',
              borderRadius: '1px',
              opacity: 0.7,
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
        transition: 'transform 0.2s ease',
      }}
      onClick={() => onMediaClick(url)}
      onMouseOver={(e) => (e.target.style.transform = 'scale(1.02)')}
      onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#999">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
      <div style={{ fontSize: '14px', color: '#999', marginTop: '8px', fontWeight: 'bold' }}>
        FILE
      </div>
    </div>
  );

  if (!imageError && (currentMediaType === 'image' || currentMediaType === 'unknown')) {
    return renderImageThumbnail();
  }
  if (currentMediaType === 'video') return renderVideoThumbnail();
  if (currentMediaType === 'audio') return renderAudioThumbnail();
  return renderUnknownThumbnail();
};

// ==============
// Gallery page
// ==============
const Gallery = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [searchTag, setSearchTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const apiBase = 'https://mhdrjwkbg4.execute-api.ap-southeast-2.amazonaws.com/dev';

  const stripQuery = (u) => (u ? u.split('?')[0] : '');

  // ✅ Robust dedupe:
  // prefer file_id (stable), else s3_key (stable), else URL without query string
  const dedupeItems = (items) => {
    const seen = new Set();
    const out = [];

    for (const item of items) {
      const key = item.file_id || item.s3_key || stripQuery(item.url);
      if (!key) continue;
      if (seen.has(key)) continue;

      seen.add(key);
      out.push(item);
    }
    return out;
  };

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const { tokens } = await fetchAuthSession();
        const idToken = tokens?.idToken?.toString();
        if (!idToken) throw new Error('Authentication token not available');

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
        const uniqueItems = dedupeItems(allItems);

        setMediaItems(uniqueItems);
        // If backend count includes duplicates, you can show uniqueItems.length instead:
        setTotalCount(data.total_count || uniqueItems.length);
        setError('');
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Failed to load media files.');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transformGalleryData = (gallery) => {
    const allItems = [];

    ['images', 'audio', 'video', 'other'].forEach((fileType) => {
      if (gallery[fileType] && Array.isArray(gallery[fileType])) {
        gallery[fileType].forEach((item) => {
          const tagsArray = transformTags(item.tags || {});
          allItems.push({
            url: item.url,
            file_type: item.file_type,
            file_id: item.file_id,
            upload_date: item.upload_date,
            tags: tagsArray,
            tagsObject: item.tags || {},
            // If you add s3_key in Lambda response, it will be used by dedupe:
            s3_key: item.s3_key,
          });
        });
      }
    });

    return allItems;
  };

  const transformTags = (tagsObject) => {
    if (!tagsObject || typeof tagsObject !== 'object') return [];
    return Object.entries(tagsObject).map(([species, count]) =>
      count > 1 ? `${species} (${count})` : species
    );
  };

  const handleMediaClick = async (mediaUrl) => {
    try {
      setLoading(true);
      setError('');

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
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
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
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = searchTag
    ? mediaItems.filter((item) => {
        const searchLower = searchTag.toLowerCase();

        const matchesDisplayTags = item.tags?.some((tag) =>
          tag.toLowerCase().includes(searchLower)
        );

        const matchesOriginalTags = Object.keys(item.tagsObject || {}).some((species) =>
          species.toLowerCase().includes(searchLower)
        );

        return matchesDisplayTags || matchesOriginalTags;
      })
    : mediaItems;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gallery</h2>

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
            fontSize: '14px',
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            color: '#1976d2',
            backgroundColor: '#e3f2fd',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          Loading gallery...
        </div>
      )}

      {error && (
        <div
          style={{
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #d32f2f',
          }}
        >
          {error}
        </div>
      )}

      <div className="gallery-grid">
        {filteredItems.length === 0 && !loading ? (
          <p>No matching files found.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.file_id || item.s3_key || index} className="gallery-tile">
              <MediaThumbnail
                url={item.url}
                fileType={item.file_type}
                onMediaClick={handleMediaClick}
              />

              {item.tags && item.tags.length > 0 && (
                <ul>
                  {item.tags.map((tag, i) => (
                    <li key={i}>{tag}</li>
                  ))}
                </ul>
              )}

              {item.upload_date && (
                <div className="upload-date">
                  {new Date(item.upload_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {mediaItems.length > 0 && (
        <div className="file-count">
          Showing {filteredItems.length} of {totalCount} files
        </div>
      )}
    </div>
  );
};

export default Gallery;
