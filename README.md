# 🦅 BirdTag: Where Birds Meet Bytes

> *"Because even our feathered friends deserve their 15 minutes of cloud fame"*

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-green?style=for-the-badge&logo=python)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

## 🌐 Live Demo

**🚀 Try BirdTag Now:** [https://main.d3lfkm32f4kpkz.amplifyapp.com/](https://main.d3lfkm32f4kpkz.amplifyapp.com/)


## 🎯 What's This All About?

BirdTag is a **serverless media storage system** that's basically like Instagram for birds, but smarter. Built for the Monash Birdy Buddies (MBB) - a group of researchers who are absolutely obsessed with our avian overlords. 

Think of it as a **cloud-powered bird detective** that:
- 🕵️ **Automatically identifies birds** in your photos, videos, and audio recordings
- 🏷️ **Tags everything intelligently** (no more "bird_photo_2024_final_final_v2.jpg")
- 🔍 **Lets you search like a pro** ("Show me all photos with at least 3 crows and 1 pigeon")
- ☁️ **Keeps everything safe in the cloud** (because hard drives are so 2010)

## 🏗️ Architecture: The Bird's Eye View

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   API Gateway   │    │   S3 Bucket     │
│   (Frontend)    │◄──►│   (REST APIs)   │◄──►│   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Lambda        │    │   DynamoDB      │
                       │   Functions     │    │   (Database)    │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Cognito       │
                       │   (Auth)        │
                       └─────────────────┘
```

## 🚀 Features That'll Make You Chirp with Joy

### 🎨 **Smart Media Processing**
- **Image Detection**: Upload a photo, get instant bird species identification
- **Audio Analysis**: Record bird songs, get species detection with confidence scores
- **Video Processing**: Because birds in motion are the best birds
- **Thumbnail Generation**: Automatic resizing and compression (because nobody likes slow loading)

### 🔍 **Advanced Search Capabilities**
- **Tag-based Search**: `{"crow": 3, "pigeon": 1}` - Find files with exactly 3 crows AND 1 pigeon
- **Species Search**: Just want all crow photos? We got you covered
- **URL-based Search**: Find full-size images from thumbnail URLs
- **File-based Search**: Upload a file, find all similar tagged content

### 🏷️ **Manual Tag Management**
- **Bulk Tagging**: Add/remove tags from multiple files at once
- **Tag Operations**: Add or remove tags with simple JSON requests
- **Flexible Tagging**: Because sometimes the AI misses that sneaky sparrow

### 🔐 **Security & Authentication**
- **AWS Cognito Integration**: Secure user authentication
- **IAM Role Management**: Fine-grained access control
- **Protected Endpoints**: Because we don't want random people uploading cat photos

### 📧 **Smart Notifications**
- **Tag-based Alerts**: Get notified when new content with your favorite birds is added
- **Email Notifications**: Via AWS SNS (Simple Notification Service)

## 🛠️ Tech Stack: The Nerd Stuff

### Frontend
- **React 19.1.0** - Because we like our UIs modern and fast
- **AWS Amplify** - For seamless AWS integration
- **Tailwind CSS** - For that beautiful, responsive design
- **Axios** - For making HTTP requests like a pro

### Backend
- **AWS Lambda** - Serverless functions that scale automatically
- **API Gateway** - RESTful APIs that don't break the bank
- **DynamoDB** - NoSQL database for lightning-fast queries
- **S3** - Object storage that never sleeps

### AI/ML Components
- **PyTorch** - For image-based bird detection
- **TensorFlow** - For audio-based species identification
- **BirdNET** - Specialized library for bird audio analysis
- **OpenCV** - For image processing and thumbnail generation

### Infrastructure
- **AWS Cognito** - User authentication and management
- **IAM** - Identity and access management
- **SNS** - Push notifications and email alerts

## 🚀 Getting Started: From Zero to Bird Hero

### Prerequisites
- AWS Account (with appropriate permissions)
- Node.js 18+ and npm
- Python 3.9+
- A love for birds (optional but highly recommended)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/imhero2k/BirdTag.git
   cd BirdTag
   ```

2. **Frontend Setup**
   ```bash
   cd UI
   npm install
   npm start
   ```

3. **Backend Setup**
   ```bash
   # For Visual Prediction
   cd VisualPrediction
   pip install -r requirements.txt
   
   # For Audio Prediction
   cd audioPrediction
   pip install -r requirements.txt
   ```

4. **AWS Configuration**
   - Set up AWS credentials
   - Deploy Lambda functions
   - Configure S3 buckets
   - Set up DynamoDB tables
   - Configure Cognito User Pool

### Environment Variables
Create a `.env` file in the UI directory:
```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOLS_ID=your-user-pool-id
REACT_APP_USER_POOLS_WEB_CLIENT_ID=your-client-id
REACT_APP_IDENTITY_POOL_ID=your-identity-pool-id
```

## 📖 API Documentation: The Technical Deep Dive

### Upload Endpoints
- `POST /upload` - Upload media files to S3
- `POST /bulk-upload` - Upload multiple files at once

### Search Endpoints
- `GET /search?tag1=crow&count1=3` - Search by tags with counts
- `GET /search/species?species=crow` - Search by species only
- `POST /search/by-url` - Search by thumbnail URL
- `POST /search/by-file` - Search by uploading a file

### Tag Management
- `POST /tags/manual` - Add/remove tags manually
- `DELETE /files` - Delete files and their metadata

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

## 🧪 Testing: Because We're Not Animals

### Unit Tests
```bash
# Frontend tests
cd UI
npm test

# Backend tests
cd VisualPrediction
python -m pytest tests/
```

### Integration Tests
```bash
# Test the full pipeline
python test_integration.py
```

### Manual Testing
1. Upload a bird photo
2. Verify automatic tagging
3. Search for the uploaded content
4. Test manual tag operations
5. Verify thumbnail generation

## 🐛 Known Issues: The Ugly Truth

- **Large Video Files**: Processing videos longer than 5 minutes might timeout
- **Rare Bird Species**: AI models might not recognize extremely rare species
- **Audio Quality**: Poor audio recordings might affect detection accuracy
- **Browser Compatibility**: IE11 users, we're sorry (but not really)

### Code Style
- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write meaningful commit messages
- Add tests for new features

## 🎯 Roadmap: What's Next?

- [ ] **Mobile App** - Because phones are better for bird photography
- [ ] **Real-time Detection** - Live bird identification during video calls
- [ ] **Bird Behavior Analysis** - Track migration patterns and behaviors
- [ ] **Community Features** - Share sightings with other bird enthusiasts
- [ ] **AR Integration** - Point your phone at a bird, get instant info

---

**Made with ❤️ and ☕ by the Monash Birdy Buddies Team**

*"In a world full of cats, be a bird watcher"* 🦅
