# CDN Awake

A modern, self-hosted CDN with file management, token-based access control, and a Next.js admin dashboard.

## ✨ Features

### Core
- 📁 **File Management** - Upload, organize, and serve files with drag & drop
- 🔐 **Token-based Access** - Secure temporary download links
- 👥 **Multi-user Admin** - Role-based administration (Super Admin, Admin, Viewer)
- 📊 **Analytics Dashboard** - Real-time stats and monitoring

### Performance & Security
- 🚀 **High Performance** - Nginx reverse proxy with compression & caching
- 🛡️ **Rate Limiting** - Configurable per-endpoint rate limits
- 📝 **Audit Logging** - Complete activity tracking with exports
- ⚡ **Response Caching** - In-memory cache with TTL

### Dashboard Features
- 🔔 **Toast Notifications** - Real-time feedback with activity history
- 📡 **Connection Status** - Live connection indicator with auto-refresh
- 📈 **System Monitoring** - CPU, memory, and cache stats
- 📤 **Data Export** - CSV/JSON export for logs and analytics

### Developer Experience
- 🐳 **Docker Ready** - Single command deployment
- 📚 **Full API Documentation** - REST API with examples
- 🔌 **Integration Examples** - Node.js, Python, PHP samples

## 🚀 Quick Start

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your values

# Start all services
docker compose up -d

# Create your first admin
curl -X POST http://localhost:8899/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "YourSecurePassword123",
    "setupKey": "your_setup_key_from_env"
  }'
```

Access the dashboard at **http://localhost:8899**

## 📁 Project Structure

```
cdn/
├── docker-compose.yml        # Main orchestration
├── .env.example              # Configuration template
├── DOCUMENTATION_INDEX.md    # Full documentation index
│
├── cdn-dashboard/            # Next.js admin panel
│   └── src/
│       ├── app/              # Pages (dashboard, files, logs, etc.)
│       ├── components/       # UI components
│       ├── lib/              # API, auth, notifications, realtime
│       └── types/            # TypeScript definitions
│
└── nginx-cdn/                # Services
    ├── api/                  # Node.js REST API
    │   └── src/
    │       ├── middleware/   # Auth, rate limit, cache, validation
    │       ├── models/       # Sequelize models
    │       ├── routes/       # API routes
    │       └── services/     # Background services
    ├── nginx/                # Reverse proxy config
    ├── postgres/             # Database initialization
    └── examples/             # Integration examples
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | - |
| `API_KEY` | API authentication key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `ADMIN_SETUP_KEY` | Initial admin creation key | - |
| `NGINX_PORT` | Exposed port | 8899 |

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/setup` | Initial admin setup |
| POST | `/api/admin/login` | Admin authentication |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List all files |
| POST | `/api/files/upload` | Upload file (multipart) |
| DELETE | `/api/files/:id` | Delete file |
| GET | `/download/:token` | Download with token |

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens` | List tokens |
| POST | `/api/tokens` | Create download token |
| DELETE | `/api/tokens/:id` | Revoke token |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats (cached) |
| GET | `/api/admin/users` | List admin users |
| GET | `/api/admin/logs` | Access logs with filters |
| GET | `/api/admin/logs/export` | Export logs (CSV/JSON) |
| GET | `/api/admin/system` | System stats (memory, CPU) |
| GET | `/api/admin/cache` | Cache statistics |
| DELETE | `/api/admin/cache` | Clear cache |

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Nginx                              │
│              (Reverse Proxy + Static Files)              │
│                      Port 8899                           │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ Dashboard │  │    API    │  │  Static   │
│ (Next.js) │  │ (Node.js) │  │  Files    │
│  :3000    │  │  :3001    │  │           │
└───────────┘  └─────┬─────┘  └───────────┘
                     │
                     ▼
              ┌───────────┐
              │ PostgreSQL │
              │   :5432    │
              └───────────┘
```

## 📊 Performance

- **Compression**: Gzip compression for responses > 1KB
- **Caching**: In-memory cache with configurable TTL (30s default for dashboard)
- **Rate Limiting**: 100 req/15min for uploads, 5 req/min for exports
- **Connection Pooling**: Sequelize connection pool for database

## 📚 Documentation

See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for complete documentation:
- API Reference
- Integration Guide
- Admin Setup Guide
- Quick Start Guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT
