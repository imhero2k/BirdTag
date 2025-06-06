import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

//  Fully configure Amplify including explicit Storage config for v6+
Amplify.configure({
  ...awsExports,
  Storage: {
    AWSS3: {
      bucket: 'mbb-media-bucket-134', //  your real bucket name
      region: 'us-east-1',            //  your real bucket region
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
