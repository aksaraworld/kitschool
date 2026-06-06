# Aksara School Management with Aksara Framework

This project has been migrated to use the **Aksara Framework** - a comprehensive framework for building multi-tenant SaaS applications.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- MongoDB (local or Atlas)

### Setup Steps

1. **Build Aksara Framework Packages**
   ```powershell
   # Windows
   .\build-packages.ps1
   
   # Linux/Mac
   chmod +x build-packages.sh
   ./build-packages.sh
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure Environment**
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
   - Update MongoDB URI and JWT secret

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

## 📦 What's New

### Aksara Framework Integration

The system now uses the following Aksara Framework packages:

- **@aksara/api** - API client with caching and error handling
- **@aksara/core** - Core utilities and types
- **@aksara/context** - React context utilities
- **@aksara/hooks** - Custom React hooks
- **@aksara/ui** - Reusable UI components
- **@aksara/formatters** - Formatting utilities

### Key Improvements

1. **Better API Client**
   - Built-in response caching
   - Automatic error handling
   - Type-safe API calls
   - JWT authentication integration

2. **Improved Developer Experience**
   - Consistent API patterns
   - Better TypeScript support
   - Framework-based architecture

3. **Performance**
   - API response caching
   - Optimized request handling

## 📁 Project Structure

```
.
├── packages/              # Aksara Framework packages
│   ├── api/             # API client
│   ├── core/            # Core utilities
│   ├── context/         # Context providers
│   ├── hooks/           # React hooks
│   ├── ui/              # UI components
│   └── formatters/      # Formatting utilities
├── frontend/            # Next.js frontend
├── backend/             # Express.js backend
└── build-packages.ps1   # Build script
```

## 🔧 Development

### Building Packages

When you make changes to Aksara packages, rebuild them:

```bash
npm run build:packages
```

Or build individual packages:
```bash
cd packages/[package-name]
npx tsc
```

### API Client Usage

```typescript
import api from '@/lib/aksara-api';

// GET request
const users = await api.get<User[]>('/users');

// POST request
await api.post('/users', userData);

// With query parameters
const results = await api.get('/search', { 
  params: { q: 'search term' } 
});

// Cached request
const cached = await api.getCached('/static-data');
```

## 📚 Documentation

- [SETUP_AKSARA.md](./SETUP_AKSARA.md) - Detailed setup guide
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Migration summary
- [AKSARA_MIGRATION.md](./AKSARA_MIGRATION.md) - Detailed migration guide
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Original project documentation

## 🐛 Troubleshooting

See [SETUP_AKSARA.md](./SETUP_AKSARA.md) for troubleshooting guide.

## 📝 Notes

- The backend (Express.js) remains unchanged
- All existing API endpoints continue to work
- The old `lib/api.ts` (axios-based) is no longer used
- JWT authentication is fully integrated
- School context headers are automatically included

## 🔗 Links

- [Aksara Framework Repository](https://github.com/aksaraworld/aksara-framework)
- [Original Project Summary](./PROJECT_SUMMARY.md)

## 📄 License

ISC License
