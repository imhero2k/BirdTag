import React, { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function BirdNotificationSignup() {
  const [email, setEmail] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [customSpecies, setCustomSpecies] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const predefinedSpecies = [
    'Crow', 'Kingfisher', 'Myna', 'Eagle', 'Sparrow', 'Robin', 
    'Cardinal', 'Blue Jay', 'Owl', 'Hawk', 'Parrot', 'Dove'
  ];

  const handleSpeciesToggle = (species) => {
    setSelectedSpecies(prev => 
      prev.includes(species) 
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  const handleAddCustomSpecies = () => {
    if (customSpecies.trim() && !selectedSpecies.includes(customSpecies.trim())) {
      setSelectedSpecies(prev => [...prev, customSpecies.trim()]);
      setCustomSpecies('');
    }
  };

  const removeSpecies = (species) => {
    setSelectedSpecies(prev => prev.filter(s => s !== species));
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (selectedSpecies.length === 0) {
      setError('Please select at least one bird species');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Get Cognito ID Token
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      // Prepare data in DynamoDB format
      const dynamoData = {
        Email: email,
        Species: selectedSpecies.map(species => ({ S: species }))
      };
      
      console.log('Data to be stored in DynamoDB:', dynamoData);
      
      // Call your API endpoint
      const response = await fetch('https://5myucif3s8.execute-api.us-east-1.amazonaws.com/dev/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(dynamoData)
      });

      const result = await response.json();
      
      if (response.status === 200) {
        setSubmitted(true);
      } else {
        setError(result.message || 'Failed to save notification preferences. Please try again.');
      }
    } catch (err) {
      console.error('Subscription failed:', err);
      setError('Failed to save notification preferences. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setEmail('');
    setSelectedSpecies([]);
    setError('');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600"></span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
          <p className="text-gray-600 mb-6">
            You'll receive email notifications when any of your selected bird species are uploaded.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Species:</strong> {selectedSpecies.join(', ')}
            </p>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Another Subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center">
              <span className="text-2xl text-white mr-3"></span>
              <div>
                <h1 className="text-2xl font-bold text-white">Subscribe to Notifications</h1>
                <p className="text-indigo-100">Get notified when your favorite birds are spotted</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Bird Species
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {predefinedSpecies.map((species) => (
                  <button
                    key={species}
                    type="button"
                    onClick={() => handleSpeciesToggle(species)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSpecies.includes(species)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {species}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSpecies}
                  onChange={(e) => setCustomSpecies(e.target.value)}
                  placeholder="Add custom species"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSpecies())}
                />
                <button
                  type="button"
                  onClick={handleAddCustomSpecies}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>
            </div>

            {selectedSpecies.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Species ({selectedSpecies.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedSpecies.map((species) => (
                    <span
                      key={species}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                    >
                      {species}
                      <button
                        type="button"
                        onClick={() => removeSpecies(species)}
                        className="ml-2 h-4 w-4 text-indigo-600 hover:text-indigo-800"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Setting Up Notifications...' : 'Subscribe to Notifications'}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How it works</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p> Select the bird species you're interested in</p>
            <p> Enter your email address</p>
            <p> Receive notifications whenever someone uploads photos of your selected species</p>
            <p> You can update your preferences anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
}