// import React, { useState } from 'react';
// import { fetchAuthSession } from 'aws-amplify/auth';

// const supportedTypes = [
//   'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//   'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
//   'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
// ];

// const Upload = () => {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState('');

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     setSelectedFile(file);
//   };

//   const handleUpload = async () => {
//     if (!selectedFile) {
//       setMessage('Please select a file.');
//       return;
//     }

//     if (!supportedTypes.includes(selectedFile.type)) {
//       setMessage('Unsupported file type.');
//       return;
//     }

//     try {
//       // 1. Get Cognito ID Token
//       const { tokens } = await fetchAuthSession();
//       const idToken = tokens?.idToken?.toString();

//       // 2. Call Upload API to get signed URL
//       const uploadRes = await fetch('https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/upload', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${idToken}`
//         },
//         body: JSON.stringify({
//           fileName: selectedFile.name,
//           fileType: selectedFile.type
//         })
//       });

//       if (uploadRes.status === 401) {
//         setMessage('Authentication failed. Please log in again.');
//         return;
//       }

//       if (uploadRes.status === 400) {
//         const error = await uploadRes.json();
//         if (error.code === 'UNSUPPORTED_FILETYPE') {
//           setMessage(`Unsupported file type. Supported: ${error.details.supported_types.join(', ')}`);
//           return;
//         }
//         if (error.code === 'MISSING_FILENAME') {
//           setMessage('Missing file name.');
//           return;
//         }
//       }

//       const { uploadUrl } = await uploadRes.json();

//       // 3. Upload to S3 via pre-signed URL
//       await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: { 'Content-Type': selectedFile.type },
//         body: selectedFile
//       });

//       setMessage('Upload successful!');
//       setSelectedFile(null);
//     } catch (error) {
//       console.error('Upload failed:', error);
//       setMessage('Upload failed. Check console for details.');
//     }
//   };

//   return (
//     <div>
//       <h2>Upload File</h2>
//       <input type="file" onChange={handleFileChange} />
//       <button onClick={handleUpload} style={{ marginLeft: '10px' }}>Upload</button>
//       {message && <p style={{ marginTop: '10px' }}>{message}</p>}
//     </div>
//   );
// };

// export default Upload;
import React, { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const supportedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
];

const Upload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
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
      // 1. Get Cognito ID Token
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      // 2. Call Upload API to get signed URL
      const uploadRes = await fetch('https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type
        })
      });

      const json = await uploadRes.json(); //  parse ONCE
      console.log("Upload API Response:", json);
      if (uploadRes.status === 401) {
        setMessage('Authentication failed. Please log in again.');
        return;
      }

      if (uploadRes.status === 400) {
        if (json.code === 'UNSUPPORTED_FILETYPE') {
          setMessage(`Unsupported file type. Supported: ${json.details.supported_types.join(', ')}`);
          return;
        }
        if (json.code === 'MISSING_FILENAME') {
          setMessage('Missing file name.');
          return;
        }
        setMessage(json.message || 'Upload request failed.');
        return;
      }

      const { uploadUrl } = json;

      if (!uploadUrl) {
        setMessage('Upload URL not returned by API.');
        return;
      }

      // 3. Upload to S3 via pre-signed URL
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile
      });

      if (!s3Res.ok) {
        throw new Error(`S3 upload failed: ${s3Res.statusText}`);
      }

      setMessage('Upload successful!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. Check console for details.');
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginLeft: '10px' }}>Upload</button>
      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
    </div>
  );
};

export default Upload;
