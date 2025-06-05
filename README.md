# 🤖 Kaggie - AI-Powered Kaggle Competition Assistant

<div align="center">
  <img src="chrome-extension/public/kaggie-128.png" alt="Kaggie Logo" width="128" height="128">
  
  **Your intelligent companion for Kaggle competitions**
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](chrome-extension/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/)
  [![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](backend/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](chrome-extension/)
</div>

## ✨ Features

### 🎯 **Competition Intelligence**
- **Auto-Detection**: Automatically detects and categorizes Kaggle competitions (Active, Rolling, Past)
- **Smart Context**: Provides competition-specific insights and recommendations
- **Favorites System**: Star and organize your favorite competitions

### 🧠 **AI-Powered Chat**
- **GPT-4o Integration**: Advanced conversational AI with competition context
- **Web Search**: Enhanced with Tavily for real-time information retrieval
- **RAG Search**: Vector-based search through competition data and discussions
- **Conversation Memory**: Persistent chat history across sessions

### 🔧 **Developer Experience**
- **Modern UI**: Beautiful, responsive interface with Framer Motion animations
- **Chrome Integration**: Seamless side panel experience
- **Live Backend**: Always-on API deployed on Render.com
- **Type Safety**: Full TypeScript implementation

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.12+
- **Chrome Browser**
- **API Keys** (OpenAI, Tavily, optional Google Cloud)

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/kaggie.git
cd kaggie

# Setup environment
cp .env.example .env
# Edit .env with your API keys (see Security Setup below)
```

### 2. Chrome Extension
```bash
cd chrome-extension
npm install
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select chrome-extension/dist folder
```

### 3. Backend (Optional - for RAG features)
```bash
cd backend
pip install -r requirements.txt

# Local development
python api.py
# Production: Already deployed at https://kaggie-api.onrender.com
```

## 🔐 Security Setup

> **⚠️ CRITICAL**: This project requires API keys that are not included for security reasons.

### Required API Keys

#### 1. OpenAI API Key
- Visit [OpenAI Platform](https://platform.openai.com/api-keys)
- Create new API key
- Add to `.env`: `OPENAI_API_KEY=sk-proj-...`

#### 2. Tavily API Key  
- Visit [Tavily](https://tavily.com/)
- Sign up and get API key
- Add to `.env`: `TAVILY_API_KEY=tvly-...`

#### 3. Google Cloud (Optional - for advanced features)
- Create project at [Google Cloud Console](https://console.cloud.google.com/)
- Create service account with appropriate permissions
- Download JSON key file → place at `credentials/serviceAccount.json`

### Environment Configuration
```env
# Required
OPENAI_API_KEY=sk-proj-your-key-here
TAVILY_API_KEY=tvly-your-key-here

# Optional
GOOGLE_APPLICATION_CREDENTIALS=credentials/serviceAccount.json
PINECONE_API_KEY=pcsk-your-key-here

# Application
ENVIRONMENT=development
PORT=10000
```

## 🏗️ Architecture

### Chrome Extension
```
chrome-extension/
├── src/
│   ├── components/         # React components
│   │   ├── navbar.tsx     # Main navigation (900+ lines)
│   │   ├── chatArea.tsx   # Chat interface
│   │   ├── options.tsx    # Settings page
│   │   └── ToastProvider.tsx # Notification system
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Core services
│   └── types/             # TypeScript definitions
├── public/
│   ├── manifest.json      # Chrome extension config
│   ├── service-worker.js  # Background processing
│   └── content-script.js  # Page interaction
└── dist/                  # Built extension
```

### Backend API
```
backend/
├── api.py                 # FastAPI main application
├── services/              # Core services
│   ├── vector_store.py   # Pinecone integration
│   └── database.py       # Firestore integration
├── tools/                 # LangChain tools
│   ├── rag_tool.py       # RAG search implementation
│   └── web_search_tool.py # Tavily web search
└── config/               # Configuration management
```

## 🛠️ Development

### Chrome Extension Development
```bash
cd chrome-extension

# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Backend Development
```bash
cd backend

# Local development server
python api.py

# Install dependencies
pip install -r requirements.txt

# Environment setup
source setup_local.sh  # On macOS/Linux
```

### Key Development Patterns

#### **State Management**
- Global configuration service with persistent storage
- React hooks for chat state and API key management
- Chrome storage APIs for data persistence

#### **AI Integration**
- LangChain framework with OpenAI GPT-4o-mini
- Optional web search enhancement with Tavily
- Vector search through Pinecone for RAG functionality

#### **UI/UX Patterns**
- Toast notifications instead of browser alerts
- Confirm dialogs with proper animations
- Loading states and skeleton screens
- Responsive design with adaptive text scaling

## 🚢 Deployment

### Backend (Render.com)
The backend is automatically deployed to Render.com with:
- **Free Tier Management**: GitHub Actions keep-alive system (5-13 min intervals)
- **Environment Variables**: Configured in Render dashboard
- **Auto-Deploy**: Connected to main branch

### Chrome Extension (Chrome Web Store)
Prepared for Chrome Web Store submission:
- All required permissions declared
- Secure API key management
- Content Security Policy compliant
- Responsive design for all screen sizes

## 📊 Technical Decisions

### **Why These Technologies?**
- **React + TypeScript**: Type safety and modern development experience
- **Framer Motion**: Smooth, professional animations
- **Chrome Extension Manifest V3**: Future-proof and secure
- **FastAPI**: High-performance Python API with automatic docs
- **LangChain**: Flexible AI application framework
- **Render.com**: Simple, free deployment for MVP

### **Architecture Highlights**
- **Service Worker**: Background processing for competition detection
- **Side Panel API**: Modern Chrome extension UX
- **Vector Search**: Efficient similarity search through competition data
- **Thread Mapping**: Conversation persistence across sessions

## 🔍 Code Quality

### **Security Measures**
- ✅ No hardcoded API keys in repository
- ✅ Environment variable management
- ✅ Secure credential storage
- ✅ Git ignore for sensitive files

### **UI/UX Improvements**
- ✅ Professional toast notifications
- ✅ Animated confirm dialogs  
- ✅ Loading states and error handling
- ✅ Responsive design patterns

### **Production Readiness**
- ✅ TypeScript for type safety
- ✅ Error boundaries and logging
- ✅ Chrome extension best practices
- ✅ API documentation (FastAPI auto-docs)

## 🎯 Portfolio Highlights

This project demonstrates:

1. **Full-Stack Development**: Chrome extension frontend + FastAPI backend
2. **AI Integration**: GPT-4, RAG search, web search tools
3. **Modern React**: Hooks, TypeScript, animations, state management
4. **Chrome Extension Expertise**: Manifest V3, service workers, content scripts
5. **Cloud Deployment**: Render.com with automated keep-alive
6. **Security Best Practices**: Proper credential management and environment setup
7. **UI/UX Design**: Professional notifications, responsive design, accessibility

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure security best practices
5. Submit a pull request

---

<div align="center">
  <strong>Built with ❤️ for the Kaggle community</strong>
</div>
