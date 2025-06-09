import React, { useState } from 'react';
import Upload from './Upload';
import Gallery from './Gallery';
import Search from './Search';
import ManualBulkTagging from './ManualBulkTagging';
import DeleteFiles from './DeleteFiles';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import Notification from './Notification';
import { Authenticator } from '@aws-amplify/ui-react';

function App({ signOut, user }) {
  const [page, setPage] = useState('upload');

  // Navigation function for bulk tagging
  const handleNavigateToBulkTagging = () => {
    setPage('bulk-tagging');
  };

  // Navigation function for delete files
  const handleNavigateToDeleteFiles = () => {
    setPage('delete-files');
  };

  // Navigation function to go back to search
  const handleBackToSearch = () => {
    setPage('search');
  };

  const renderPage = () => {
    switch (page) {
      case 'upload':
        return <Upload />;
      case 'gallery':
        return <Gallery />;
      case 'search':
        return <Search 
          onNavigateToBulkTagging={handleNavigateToBulkTagging}
          onNavigateToDeleteFiles={handleNavigateToDeleteFiles}
        />;
      case 'bulk-tagging':
        return <ManualBulkTagging onBack={handleBackToSearch} />;
      case 'delete-files':
        return <DeleteFiles onBack={handleBackToSearch} />;
      case 'Notification':
        return <Notification/>;
      default:
        return <Upload />;
    }
  };

  const firstName = user?.attributes?.given_name || '';
  const lastName = user?.attributes?.family_name || '';

  return (
    <div>
      <header style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '10px'
      }}>
        <div>
          <button onClick={() => setPage('upload')}>Upload</button>
          <button onClick={() => setPage('gallery')}>Gallery</button>
          <button onClick={() => setPage('search')}>Search</button>
          <button onClick={() => setPage('Notification')}>Notification</button>
        </div>
        <div>
          <span style={{ marginRight: '10px' }}>
            Hello, {firstName} {lastName}
          </span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      </header>
      <hr />
      {renderPage()}
    </div>
  );
}

// Add custom sign-up form fields
const formFields = {
  signUp: {
    given_name: {
      label: 'First Name',
      placeholder: 'Enter your first name',
      isRequired: true,
      order: 1,
    },
    family_name: {
      label: 'Last Name',
      placeholder: 'Enter your last name',
      isRequired: true,
      order: 2,
    },
    email: {
      label: 'Email',
      isRequired: true,
      order: 3,
    },
    password: {
      label: 'Password',
      isRequired: true,
      order: 4,
    },
    confirm_password: {
      label: 'Confirm Password',
      isRequired: true,
      order: 5,
    },
  },
};

// Export with Authenticator
export default withAuthenticator(App, {
  ignUpAttributes: ['given_name', 'family_name'],
  loginMechanisms: ['email'],
  formFields,
  initialAuthState: 'signIn',
});