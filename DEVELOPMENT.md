# 🛠️ Development Workflow

## Quick Start Commands

```bash
# Initial setup
git clone https://github.com/yourusername/kaggie.git
cd kaggie
cp .env.example .env
# Edit .env with your API keys

# Chrome Extension Development
cd chrome-extension
npm install
npm run dev        # Development with hot reload
npm run build      # Production build
npm run preview    # Preview built extension

# Backend Development (Optional)
cd ../backend
pip install -r requirements.txt
python api.py      # Local development server
```

## Chrome Extension Development

### File Structure
```
chrome-extension/
├── src/
│   ├── components/           # React components
│   │   ├── ToastProvider.tsx # ✨ NEW: Professional notifications
│   │   ├── ConfirmDialog.tsx # ✨ NEW: Modern confirm dialogs
│   │   ├── ErrorBoundary.tsx # ✨ NEW: Error handling
│   │   ├── navbar.tsx        # Main navigation (900+ lines)
│   │   ├── chatArea.tsx      # Chat interface
│   │   ├── textArea.tsx      # Message input
│   │   └── options.tsx       # Settings page
│   ├── hooks/               # React hooks
│   │   ├── useChat.ts       # Chat state management
│   │   └── useApiKeys.ts    # API key validation
│   ├── services/            # Core services
│   │   ├── kaggieAgentService.ts    # AI agent integration
│   │   ├── storageService.ts        # Chrome storage wrapper
│   │   ├── backgroundService.ts     # Background processing
│   │   └── threadMappingService.ts  # Conversation persistence
│   └── types/               # TypeScript definitions
└── public/
    ├── manifest.json        # Extension configuration
    ├── service-worker.js    # Background script
    └── content-script.js    # Page interaction
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `chrome-extension/dist` folder

3. **Development Loop**
   - Make changes to source files
   - Vite will automatically rebuild
   - Refresh extension in Chrome to see changes

4. **Testing**
   - Test on actual Kaggle pages
   - Verify API key management
   - Test chat functionality
   - Check error handling

## Backend Development

### Local Setup
```bash
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
export TAVILY_API_KEY="your-key"
python api.py
```

### API Endpoints
- `GET /health` - Health check
- `POST /search` - RAG search through competition data
- `GET /competitions` - List active competitions
- `POST /chat` - AI chat with context

## Code Quality Standards

### TypeScript Best Practices
- ✅ Strict type checking enabled
- ✅ No `any` types used
- ✅ Proper interface definitions
- ✅ Type-only imports for types

### React Best Practices
- ✅ Functional components with hooks
- ✅ Custom hooks for reusable logic
- ✅ Error boundaries for robustness
- ✅ Proper state management

### Security Standards
- ✅ No hardcoded credentials
- ✅ Environment variable management
- ✅ Secure Chrome storage usage
- ✅ Content Security Policy compliance

## Performance Optimizations

### Bundle Size Management
```bash
# Analyze bundle size
npm run build
# Check dist/assets/ for large chunks

# Current optimizations:
# - Dynamic imports for heavy dependencies
# - Tree shaking enabled
# - Code splitting by route
```

### Extension Performance
- Service worker optimization
- Minimal content script footprint
- Efficient storage usage
- Debounced API calls

## Debugging Tips

### Chrome Extension Debugging
1. **Background Script**: Chrome DevTools → Extensions → Kaggie → service worker
2. **Content Script**: Regular DevTools on Kaggle pages
3. **Popup/Options**: Right-click extension → Inspect

### Common Issues
- **API Keys**: Check Chrome storage and console errors
- **Permissions**: Verify manifest.json permissions
- **CORS**: Ensure backend allows extension origin
- **CSP**: Check for Content Security Policy violations

## Contributing Guidelines

### Before Making Changes
1. Check existing issues and PRs
2. Create feature branch from main
3. Follow naming convention: `feature/description`

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Write descriptive commit messages
- Add JSDoc comments for complex functions

### Pull Request Process
1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers
4. Squash commits before merge

## Release Process

### Version Management
1. Update version in `manifest.json`
2. Update version in `package.json`
3. Create git tag: `git tag v1.0.0`
4. Push tags: `git push --tags`

### Build for Release
```bash
npm run build
cd dist
zip -r ../kaggie-v1.0.0.zip *
```

### Chrome Web Store Update
1. Upload new zip file
2. Update store description if needed
3. Submit for review
4. Monitor for approval

---

**Happy coding! 🚀**
