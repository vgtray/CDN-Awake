# CDN Awake

A modern, self-hosted CDN with file management, token-based access control, and a Next.js admin dashboard.

## Features

- 📁 **File Management** - Upload, organize, and serve files
- 🔐 **Token-based Access** - Secure temporary download links
- 👥 **Multi-user Admin** - Role-based administration
- 📊 **Analytics Dashboard** - Real-time stats and monitoring
- 🚀 **High Performance** - Nginx reverse proxy with caching
- 🐳 **Docker Ready** - Single command deployment

## Quick Start

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

## Project Structure

```
cdn/
├── docker-compose.yml    # Main orchestration
├── .env.example          # Configuration template
├── cdn-dashboard/        # Next.js admin panel
│   └── src/
└── services/
    ├── api/              # Node.js REST API
    ├── nginx/            # Reverse proxy
    └── postgres/         # Database
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | - |
| `API_KEY` | API authentication key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `ADMIN_SETUP_KEY` | Initial admin creation key | - |
| `NGINX_PORT` | Exposed port | 8899 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin authentication |
| GET | `/api/files` | List all files |
| POST | `/api/files/upload` | Upload file |
| POST | `/api/tokens` | Create download token |
| GET | `/download/:token` | Download with token |

## License

MIT
