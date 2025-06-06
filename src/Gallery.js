import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Gallery.css'; // optional, if you want to style the grid

const Gallery = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [searchTag, setSearchTag] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const idToken = tokens?.idToken?.toString();

        const res = await fetch(
          'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/list-files',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Fetch failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        setMediaItems(data.results || []);
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Failed to load media files.');
      }
    };

    fetchMedia();
  }, []);

  const filteredItems = searchTag
    ? mediaItems.filter((item) =>
        item.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTag.toLowerCase())
        )
      )
    : mediaItems;

  const renderMedia = (item) => {
    const ext = item.url?.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <img src={item.url} alt="media" style={{ width: '100%' }} />;
    }

    if (['mp4', 'webm', 'mov'].includes(ext)) {
      return <video src={item.url} controls style={{ width: '100%' }} />;
    }

    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return <audio src={item.url} controls style={{ width: '100%' }} />;
    }

    return <a href={item.url}>Download File</a>;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gallery</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter by tag..."
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          style={{ padding: '8px', width: '300px' }}
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="gallery-grid">
        {filteredItems.length === 0 ? (
          <p>No matching files found.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={index} className="gallery-tile">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt="Thumbnail"
                  style={{ width: '100%', marginBottom: '10px' }}
                />
              )}
              {renderMedia(item)}
              {item.tags && (
                <ul>
                  {item.tags.map((tag, i) => (
                    <li key={i}>{tag}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Gallery;
