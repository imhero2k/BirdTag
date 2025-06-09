

import React, { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const supportedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
];

// Utility: SHA-256 hash of file contents
const getFileHash = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const Upload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setProgress(0);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file.');
      return;
    }

    if (!supportedTypes.includes(selectedFile.type)) {
      setMessage('Unsupported file type.');
      return;
    }

    try {
      setIsUploading(true);

      // 1. Compute hashed file name
      const fileHash = await getFileHash(selectedFile);
      const ext = selectedFile.name.split('.').pop();
      const hashedFileName = `${fileHash}.${ext}`;
      console.log("Hashed file name:", hashedFileName);

      // 2. Get Cognito token
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      // 3. Get presigned upload URL
      const uploadRes = await fetch('https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fileName: hashedFileName,
          fileType: selectedFile.type
        })
      });

      const json = await uploadRes.json();
      if (uploadRes.status !== 200 || !json.uploadUrl) {
        setMessage(json.message || 'Upload request failed.');
        return;
      }

      // 4. Upload to S3 with progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', json.uploadUrl, true);
        xhr.setRequestHeader('Content-Type', selectedFile.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('S3 upload failed due to a network error.'));
        xhr.send(selectedFile);
      });

      setMessage('Upload successful!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={isUploading} style={{ marginLeft: '10px' }}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>

      {progress > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#4caf50' : '#2196f3',
              transition: 'width 0.2s ease-in-out'
            }} />
          </div>
          <p>{progress}%</p>
        </div>
      )}

      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
    </div>
  );
};

export default Upload;
