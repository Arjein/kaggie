#!/bin/bash
# Local development setup for Kaggler backend

echo "🚀 Setting up Kaggler Backend for Local Development"
echo "================================================="

# Check if we're in the backend directory
if [ ! -f "api.py" ]; then
    echo "❌ Please run this script from the backend directory"
    echo "   cd backend && ./setup_local.sh"
    exit 1
fi

# Create .env file for local development
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file for local development..."
    cat > .env << 'EOF'
# Kaggler Backend Local Development Environment
# Copy this file and update with your actual credentials

# Google Cloud / Firestore (optional for basic API testing)
# GOOGLE_APPLICATION_CREDENTIALS=../credentials/serviceAccount.json
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# AI Services (required for full functionality)
# PINECONE_API_KEY=your_pinecone_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# Development settings
ENVIRONMENT=development
LOG_LEVEL=debug
PORT=8000
EOF
    echo "✅ Created .env file - please update with your credentials"
else
    echo "✅ .env file already exists"
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python -m venv .venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate || {
    echo "❌ Failed to activate virtual environment"
    exit 1
}

# Install dependencies
echo "📦 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Add python-dotenv if not in requirements
pip show python-dotenv > /dev/null 2>&1 || {
    echo "📦 Installing python-dotenv for .env support..."
    pip install python-dotenv
}

echo ""
echo "🎉 Local development setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your API credentials"
echo "2. Start the development server:"
echo "   source .venv/bin/activate"
echo "   python -m uvicorn api:app --reload --port 8000"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:8000/health"
echo "   open http://localhost:8000/docs"
echo ""
echo "💡 Tips:"
echo "- The API will work without Google Cloud credentials (limited functionality)"
echo "- Add your API keys to .env for full functionality"
echo "- Use /docs endpoint to test API interactively"
