## ⚠️ SECURITY SETUP REQUIRED

**IMPORTANT**: This project requires API keys and credentials that are not included in the repository for security reasons.

### Required Setup:

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure API Keys:**
   - **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Pinecone API Key**: Get from [Pinecone Console](https://app.pinecone.io/)
   - **Google Cloud Service Account**: Create at [Google Cloud Console](https://console.cloud.google.com/)

3. **Google Cloud Setup:**
   - Create a service account with appropriate permissions
   - Download the JSON key file
   - Place it at `credentials/serviceAccount.json`

### Environment Variables:
```env
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
GOOGLE_APPLICATION_CREDENTIALS=credentials/serviceAccount.json
```

### 🔒 Security Notes:
- Never commit `.env` files or credential files
- Use environment variables in production
- Rotate API keys regularly
- Review permissions on service accounts

---
