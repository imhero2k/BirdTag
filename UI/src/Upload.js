import React, { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import './Upload.css';

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
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setProgress(0);
    setMessage('');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setProgress(0);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file to upload.');
      return;
    }

    if (!supportedTypes.includes(selectedFile.type)) {
      setMessage('Unsupported file type. Please upload images, videos, or audio files.');
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

      setMessage('Upload successful! Your file has been processed.');
      setSelectedFile(null);
      setProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>📤 Upload Media</h2>
        <p>Upload images, videos, or audio files for bird recognition and analysis</p>
      </div>

      <div className="upload-area">
        <div 
          className={`drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div className="drop-zone-content">
              <div className="upload-icon">📁</div>
              <h3>Drag & Drop your file here</h3>
              <p>or</p>
              <label className="file-input-label">
                Choose File
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  accept={supportedTypes.join(',')}
                  style={{ display: 'none' }}
                />
              </label>
              <div className="supported-formats">
                <p>Supported formats:</p>
                <div className="format-tags">
                  <span>Images: JPG, PNG, GIF, WebP</span>
                  <span>Videos: MP4, MOV, AVI</span>
                  <span>Audio: MP3, WAV, OGG, M4A</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="file-info">
              <div className="file-icon">{getFileIcon(selectedFile.type)}</div>
              <div className="file-details">
                <h4>{selectedFile.name}</h4>
                <p>{formatFileSize(selectedFile.size)} • {selectedFile.type}</p>
              </div>
              <button 
                className="remove-file-btn"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="upload-actions">
            <button 
              className="upload-btn"
              onClick={handleUpload} 
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span className="spinner"></span>
                  Uploading...
                </>
              ) : (
                'Upload File'
              )}
            </button>
          </div>
        )}

        {progress > 0 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
