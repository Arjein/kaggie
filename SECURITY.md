# 🔒 Security Policy

## Overview
Kaggie is designed with security and privacy as core principles. This document outlines our security practices and how users can safely use the extension.

## 🔐 User Data & Privacy

### API Keys
- **User-Controlled**: All API keys (OpenAI, Tavily) are provided and managed by users
- **Local Storage**: Keys are stored locally in Chrome's secure storage
- **No Transmission**: Your API keys are never sent to our servers
- **Encrypted Storage**: Chrome handles encryption of stored credentials

### Conversation Data
- **Local First**: All conversations stored locally in your browser
- **User Control**: You can clear/delete your data anytime via settings
- **No Analytics**: We don't collect or analyze your conversations

## 🛡️ Security Features

### Chrome Extension Security
- **Manifest V3**: Uses latest Chrome extension security standards
- **Minimal Permissions**: Only requests necessary permissions
- **Content Security Policy**: Prevents code injection attacks
- **Host Restrictions**: Limited to specific domains only

### API Security
- **HTTPS Only**: All communications use secure HTTPS
- **No Credentials Storage**: Backend doesn't store user credentials
- **Rate Limiting**: Built-in protection against abuse

## 🚨 Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email: [Your Security Email]
3. Include detailed description and steps to reproduce
4. Allow reasonable time for response and fix

## 🔧 Self-Hosting & Development

### For Developers
If you want to run Kaggie locally or contribute:

1. **Environment Setup**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your own API keys
   nano .env
   ```

2. **Secure Practices**:
   - Never commit API keys or credentials
   - Use environment variables for sensitive data
   - Follow principle of least privilege

### Required API Keys
Users need to provide their own:
- **OpenAI API Key**: For AI chat functionality
- **Tavily API Key**: For web search (optional)

Get your keys:
- OpenAI: https://platform.openai.com/api-keys
- Tavily: https://tavily.com/

## 📖 Best Practices for Users

1. **API Key Security**:
   - Keep your API keys private
   - Don't share screenshots showing keys
   - Regenerate keys if compromised
   - Monitor API usage on provider dashboards

2. **Browser Security**:
   - Keep Chrome updated
   - Use secure, updated operating system
   - Consider using dedicated browser profile

3. **Data Management**:
   - Regularly clear conversation history if needed
   - Review extension permissions periodically
   - Use Chrome's sync with trusted devices only

## 🔄 Updates & Maintenance

- Security updates are prioritized
- Extension auto-updates through Chrome Web Store
- Monitor GitHub releases for security announcements
- Report issues through proper channels

## ⚖️ Compliance

This extension is designed to comply with:
- Chrome Web Store Developer Policies
- General privacy best practices
- User data protection principles

---

**Remember**: Your security and privacy are in your hands. We provide the tools, you control the data.
