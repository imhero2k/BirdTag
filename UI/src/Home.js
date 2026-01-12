import React from 'react';
import './Home.css';

const Home = ({ onNavigate }) => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="bird-icon">🦅</span>
              BirdTag
            </h1>
            <p className="hero-subtitle">
              Advanced AI-powered bird recognition and conservation platform
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-primary"
                onClick={() => onNavigate('upload')}
              >
                📸 Upload Media
              </button>
              <button 
                className="btn-secondary"
                onClick={() => onNavigate('gallery')}
              >
                🖼️ Browse Gallery
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-birds">
              <div className="bird bird-1">🦜</div>
              <div className="bird bird-2">🦆</div>
              <div className="bird bird-3">🦉</div>
              <div className="bird bird-4">🦚</div>
            </div>
            <div className="tech-elements">
              <div className="tech-element tech-1">🤖</div>
              <div className="tech-element tech-2">🔬</div>
              <div className="tech-element tech-3">📊</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Platform Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Recognition</h3>
            <p>State-of-the-art machine learning algorithms for precise bird species identification</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Advanced Search</h3>
            <p>Powerful search capabilities by species, tags, and visual characteristics</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Seamless Upload</h3>
            <p>Intuitive interface for uploading images, videos, and audio files</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Conservation Data</h3>
            <p>Contribute to scientific research and bird population monitoring</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">1000+</div>
            <div className="stat-label">Species Database</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99%</div>
            <div className="stat-label">Recognition Accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Platform Availability</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Start Your Bird Research Journey</h2>
          <p>Join researchers and enthusiasts worldwide in documenting avian biodiversity</p>
          <button 
            className="btn-primary btn-large"
            onClick={() => onNavigate('upload')}
          >
            Begin Uploading 🚀
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home; 