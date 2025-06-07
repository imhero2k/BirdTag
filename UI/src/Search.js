

// import React, { useState } from 'react';
// import { fetchAuthSession } from '@aws-amplify/auth';

// const Search = () => {
//   const [tags, setTags] = useState([{ tag: '', count: 1 }]);
//   const [species, setSpecies] = useState('');
//   const [thumbUrl, setThumbUrl] = useState('');
//   const [queryFile, setQueryFile] = useState(null);
//   const [deleteUrls, setDeleteUrls] = useState('');
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

//   const handleTagChange = (index, field, value) => {
//     const newTags = [...tags];
//     newTags[index][field] = field === 'count' ? parseInt(value) : value.toLowerCase();
//     setTags(newTags);
//   };

//   const addTagField = () => setTags([...tags, { tag: '', count: 1 }]);
//   const removeTagField = (index) => setTags(tags.filter((_, i) => i !== index));

  
//   const sendPost = async (url, payload, isFile = false) => {
//   setLoading(true);
//   setError('');
//   setResults([]);

//   try {
//     const { tokens } = await fetchAuthSession();
//     const token = tokens?.idToken?.toString();

//     const headers = {
//       'Authorization': token,
//       ...(isFile ? {} : { 'Content-Type': 'application/json' })
//     };

//     const response = await fetch(url, {
//       method: 'POST',
//       headers,
//       body: isFile ? payload : JSON.stringify(payload)
//     });

//     if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
//     const data = await response.json();
//     setResults(data.links || []);
//   } catch (err) {
//     setError(err.message);
//   } finally {
//     setLoading(false);
//   }
// };


//   const sendGet = async (url) => {
//   setLoading(true);
//   setError('');
//   setResults([]);

//   try {
//     const { tokens } = await fetchAuthSession();
//     const token = tokens?.idToken?.toString();

//     const response = await fetch(url, {
//       method: 'GET',
//       headers: { 'Authorization': token }
//     });

//     if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
//     const data = await response.json();
//     setResults(data.links || []);
//   } catch (err) {
//     setError(err.message);
//   } finally {
//     setLoading(false);
//   }
// };


//   const runTagCountQuery = () => {
//     const query = Object.fromEntries(tags.map(({ tag, count }) => [tag, count]));
//     sendPost(`${apiBase}/search/by-tags`, query);
//   };

//   const runSpeciesQuery = () => {
//     sendGet(`${apiBase}/search/by-species-no-count?species=${species}`);
//   };

//   const runThumbLookup = () => {
//     sendGet(`${apiBase}/search/by-thumbnail-url?url=${encodeURIComponent(thumbUrl)}`);
//   };

//   const runFileQuery = () => {
//     const form = new FormData();
//     form.append('file', queryFile);
//     sendPost(`${apiBase}/search/by-file`, form, true);
//   };

//   const runDeleteFiles = () => {
//     const urls = deleteUrls.split(',').map(u => u.trim());
//     sendPost(`${apiBase}/delete`, { url: urls });
//   };

//   return (
//     <div style={{ padding: 20, maxWidth: '900px', margin: 'auto' }}>
//       <h2>BirdTag Query Panel</h2>

//       <section>
//         <h4>1. Tag + Count Search</h4>
//         {tags.map((t, i) => (
//           <div key={i}>
//             <input
//               placeholder="Tag (e.g., crow)"
//               value={t.tag}
//               onChange={(e) => handleTagChange(i, 'tag', e.target.value)}
//               style={{ marginRight: 8 }}
//             />
//             <input
//               type="number"
//               value={t.count}
//               onChange={(e) => handleTagChange(i, 'count', e.target.value)}
//               style={{ marginRight: 8 }}
//             />
//             {tags.length > 1 && <button onClick={() => removeTagField(i)}>Remove</button>}
//           </div>
//         ))}
//         <button onClick={addTagField}>+ Add Tag</button>
//         <button onClick={runTagCountQuery} style={{ marginLeft: 10 }}>Search</button>
//       </section>

//       <section>
//         <h4>2. Search by Bird Species</h4>
//         <input
//           value={species}
//           onChange={(e) => setSpecies(e.target.value)}
//           placeholder="Enter species (e.g., eagle)"
//         />
//         <button onClick={runSpeciesQuery} style={{ marginLeft: 10 }}>Search</button>
//       </section>

//       <section>
//         <h4>3. Reverse Lookup from Thumbnail URL</h4>
//         <input
//           value={thumbUrl}
//           onChange={(e) => setThumbUrl(e.target.value)}
//           placeholder="Paste thumbnail S3 URL"
//           style={{ width: '100%' }}
//         />
//         <button onClick={runThumbLookup}>Find Full Image</button>
//       </section>

//       <section>
//         <h4>4. Upload File for Similar Tag Match</h4>
//         <input type="file" onChange={(e) => setQueryFile(e.target.files[0])} />
//         <button onClick={runFileQuery}>Query</button>
//       </section>

//       <section>
//         <h4>5. Delete Files</h4>
//         <textarea
//           placeholder="Comma-separated S3 URLs"
//           value={deleteUrls}
//           onChange={(e) => setDeleteUrls(e.target.value)}
//           rows={3}
//           style={{ width: '100%' }}
//         />
//         <button onClick={runDeleteFiles}>Delete</button>
//       </section>

//       <section style={{ marginTop: 30 }}>
//         {loading && <p>Loading...</p>}
//         {error && <p style={{ color: 'red' }}>{error}</p>}
//         {results.length > 0 && (
//           <div>
//             <h4>Results</h4>
//             <div style={{ display: 'flex', flexWrap: 'wrap' }}>
//               {results.map((url, i) => (
//                 <div key={i} style={{ margin: 10 }}>
//                   {url.endsWith('.png') || url.endsWith('.jpg') ? (
//                     <img src={url} alt={`result-${i}`} width="150" />
//                   ) : (
//                     <a href={url} target="_blank" rel="noreferrer">Download {i + 1}</a>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </section>
//     </div>
//   );
// };

// export default Search;

import React, { useState } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

const Search = () => {
  const [tags, setTags] = useState([{ tag: '', count: 1 }]);
  const [speciesList, setSpeciesList] = useState(['']);
  const [thumbUrl, setThumbUrl] = useState('');
  const [queryFile, setQueryFile] = useState(null);
  const [deleteUrls, setDeleteUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBase = 'https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev';

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
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const headers = {
        'Authorization': token,
        ...(isFile ? {} : { 'Content-Type': 'application/json' })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: isFile ? payload : JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
      const data = await response.json();
      setResults(data.links || []);
    } catch (err) {
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
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': token }
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
      const data = await response.json();
      setResults(data.links || []);
    } catch (err) {
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
    if (speciesList.length === 0) return;

    const queryParams = speciesList
      .map((s, i) => `species${speciesList.length > 1 ? i + 1 : ''}=${encodeURIComponent(s)}`)
      .join('&');

    const fullUrl = `${apiBase}/search/by-species-no-count?${queryParams}`;
    sendGet(fullUrl);
  };

  const runThumbLookup = () => {
    sendGet(`${apiBase}/search/by-thumbnail-url?thumbnail_url=${encodeURIComponent(thumbUrl)}`);
  };

  const runFileQuery = () => {
    const form = new FormData();
    form.append('file', queryFile);
    sendPost(`${apiBase}/search/by-file`, form, true);
  };

  const runDeleteFiles = () => {
    const urls = deleteUrls.split(',').map(u => u.trim());
    sendPost(`${apiBase}/delete`, { url: urls });
  };

  return (
    <div style={{ padding: 20, maxWidth: '900px', margin: 'auto' }}>
      <h2>BirdTag Query Panel</h2>

      {/* Tag + Count */}
      <section>
        <h4>1. Tag + Count Search</h4>
        {tags.map((t, i) => (
          <div key={i}>
            <input
              placeholder="Tag (e.g., crow)"
              value={t.tag}
              onChange={(e) => handleTagChange(i, 'tag', e.target.value)}
              style={{ marginRight: 8 }}
            />
            <input
              type="number"
              value={t.count}
              onChange={(e) => handleTagChange(i, 'count', e.target.value)}
              style={{ marginRight: 8 }}
            />
            {tags.length > 1 && <button onClick={() => removeTagField(i)}>Remove</button>}
          </div>
        ))}
        <button onClick={addTagField}>+ Add Tag</button>
        <button onClick={runTagCountQuery} style={{ marginLeft: 10 }}>Search</button>
      </section>

      {/* Multi-Species */}
      <section>
        <h4>2. Search by Bird Species</h4>
        {speciesList.map((s, i) => (
          <div key={i}>
            <input
              value={s}
              placeholder={`Species ${i + 1}`}
              onChange={(e) => {
                const updated = [...speciesList];
                updated[i] = e.target.value.toLowerCase();
                setSpeciesList(updated);
              }}
              style={{ marginRight: '8px' }}
            />
            {speciesList.length > 1 && (
              <button onClick={() => setSpeciesList(speciesList.filter((_, index) => index !== i))}>Remove</button>
            )}
          </div>
        ))}
        <button onClick={() => setSpeciesList([...speciesList, ''])}>+ Add Species</button>
        <button onClick={runSpeciesQuery} style={{ marginLeft: 10 }}>Search</button>
      </section>

      {/* Reverse Lookup */}
      <section>
        <h4>3. Reverse Lookup from Thumbnail URL</h4>
        <input
          value={thumbUrl}
          onChange={(e) => setThumbUrl(e.target.value)}
          placeholder="Paste thumbnail S3 URL"
          style={{ width: '100%' }}
        />
        <button onClick={runThumbLookup}>Find Full Image</button>
      </section>

      {/* File Match */}
      <section>
        <h4>4. Upload File for Similar Tag Match</h4>
        <input type="file" onChange={(e) => setQueryFile(e.target.files[0])} />
        <button onClick={runFileQuery}>Query</button>
      </section>

      {/* Delete */}
      <section>
        <h4>5. Delete Files</h4>
        <textarea
          placeholder="Comma-separated S3 URLs"
          value={deleteUrls}
          onChange={(e) => setDeleteUrls(e.target.value)}
          rows={3}
          style={{ width: '100%' }}
        />
        <button onClick={runDeleteFiles}>Delete</button>
      </section>

      {/* Results */}
      <section style={{ marginTop: 30 }}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {results.length > 0 && (
          <div>
            <h4>Results</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {results.map((url, i) => (
                <div key={i} style={{ margin: 10 }}>
                  {url.endsWith('.png') || url.endsWith('.jpg') ? (
                    <img src={url} alt={`result-${i}`} width="150" />
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer">Download {i + 1}</a>
                  )}
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
