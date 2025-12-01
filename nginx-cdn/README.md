# CDN API Sécurisé avec Interface d'Administration - Node.js + PostgreSQL

API REST sécurisée pour un système de CDN (Content Delivery Network) avec gestion de fichiers, tokens d'accès temporaires, logs d'accès complets et **interface d'administration web complète**.

## 🚀 Fonctionnalités

### API & Backend
- ✅ **Upload de fichiers sécurisé** avec validation (taille, nom, MIME type)
- ✅ **Tokens d'accès temporaires** et uniques par fichier
- ✅ **Téléchargement sécurisé** avec validation de token
- ✅ **Base de données PostgreSQL** relationnelle
- ✅ **Nettoyage automatique** des tokens expirés
- ✅ **Logs d'accès détaillés** (IP, User-Agent, statut)
- ✅ **Authentification par API Key** (Bearer token)
- ✅ **Rate limiting** et sécurité renforcée
- ✅ **Docker + docker-compose** prêt pour le déploiement
- ✅ **Tests automatisés** complets

### Interface d'Administration 🆕
- ✅ **Dashboard complet** avec statistiques en temps réel
- ✅ **Gestion des fichiers** : Lister, rechercher, voir détails, supprimer
- ✅ **Gestion des tokens** : Créer, révoquer, copier liens
- ✅ **Visualisation des logs** : Accès et activités admin
- ✅ **Gestion des utilisateurs** : Créer/modifier/supprimer admins (superadmin only)
- ✅ **Authentification JWT** avec sessions sécurisées
- ✅ **Interface moderne et responsive**
- ✅ **Rôles et permissions** : Admin vs Super Admin

## 📁 Structure du Projet

```
nginx-cdn/
├── docker-compose.yml              # Orchestration des 3 services
├── .env                            # Variables d'environnement
├── .env.example                    # Exemple de configuration
├── create-admin.ps1                # 🆕 Script pour créer le premier admin
├── index.html                      # Page d'accueil (avec lien admin)
├── admin-login.html                # 🆕 Page de connexion admin
├── admin-dashboard.html            # 🆕 Dashboard d'administration
├── admin-utils.js                  # 🆕 Utilitaires JavaScript
├── admin-dashboard.js              # 🆕 Logique du dashboard
├── ADMIN_SETUP_GUIDE.md            # 🆕 Guide setup admin
├── ADMIN_INTERFACE_GUIDE.md        # 🆕 Guide interface admin
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── jest.config.js
│   ├── src/
│   │   ├── index.js                # Point d'entrée
│   │   ├── config/
│   │   │   └── database.js         # Connexion PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js             # Authentification API Key
│   │   │   ├── adminAuth.js        # 🆕 Authentification JWT admin
│   │   │   ├── rateLimit.js        # Rate limiting
│   │   │   └── validation.js       # Validation fichiers
│   │   ├── routes/
│   │   │   ├── files.js            # CRUD fichiers
│   │   │   ├── tokens.js           # Gestion tokens
│   │   │   ├── download.js         # Téléchargement sécurisé
│   │   │   ├── auth.js             # 🆕 Routes authentification admin
│   │   │   └── admin.js            # 🆕 Routes administration
│   │   ├── models/
│   │   │   ├── File.js
│   │   │   ├── Token.js
│   │   │   ├── AccessLog.js
│   │   │   └── AdminUser.js        # 🆕 Modèle utilisateur admin
│   │   ├── services/
│   │   │   └── cleanup.js          # Nettoyage tokens expirés
│   │   └── utils/
│   │       └── logger.js
│   └── tests/
│       └── api.test.js
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── 404.html
│   └── 50x.html
├── database/
│   └── init.sql                    # Schema PostgreSQL (avec tables admin)
└── uploads/                        # Fichiers uploadés (volume Docker)
```

## 🏃 Démarrage Rapide

### Prérequis
- Docker et Docker Compose installés
- Git
- PowerShell (pour le script de création d'admin)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd nginx-cdn

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres (IMPORTANT: changez API_KEY et JWT_SECRET)

# Démarrer les services
docker-compose up -d

# Vérifier le statut
docker-compose ps

# Voir les logs
docker-compose logs -f
```

### Vérification

```bash
# Health check
curl http://localhost:8899/health

# API info
curl http://localhost:8899/api
```

### 🔐 Créer le Premier Administrateur

**Option 1 : Via Script PowerShell (Recommandé)**

```powershell
./create-admin.ps1
```

Le script vous guidera pas à pas pour créer votre premier admin.

**Option 2 : Via API**

```bash
curl -X POST http://localhost:8899/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "VotreMotDePasseSecurise123!",
    "setupKey": "VOTRE_API_KEY"
  }'
```

**Option 3 : Voir le guide complet**

Consultez `ADMIN_SETUP_GUIDE.md` pour toutes les options détaillées.

### 🎯 Accéder à l'Interface Admin

1. Ouvrez votre navigateur : http://localhost:8899/admin-login.html
2. Connectez-vous avec vos identifiants
3. Explorez le dashboard !

Ou cliquez sur le bouton **"🔐 Admin Panel"** sur la page d'accueil.

**Guide complet** : Voir `ADMIN_INTERFACE_GUIDE.md`

## 📡 Endpoints API

### Authentification
Toutes les routes `/api/*` nécessitent une API Key via:
- Header `Authorization: Bearer <API_KEY>`
- Header `X-API-Key: <API_KEY>`

### Fichiers

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/files` | Lister tous les fichiers |
| GET | `/api/files/stats` | Statistiques globales |
| GET | `/api/files/:id` | Détails d'un fichier |
| GET | `/api/files/:id/logs` | Logs d'accès d'un fichier |
| POST | `/api/files/upload` | Upload un fichier |
| DELETE | `/api/files/:id` | Supprimer un fichier |

### Tokens

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tokens` | Lister tous les tokens |
| GET | `/api/tokens/:id` | Détails d'un token |
| POST | `/api/tokens` | Créer un token |
| POST | `/api/tokens/validate` | Valider un token |
| DELETE | `/api/tokens/:id` | Révoquer un token |

### Téléchargement (Public)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/download/:token` | Télécharger via token |
| HEAD | `/download/:token` | Vérifier disponibilité |

## 📝 Exemples d'utilisation

### Upload d'un fichier

```bash
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@/path/to/image.jpg"
```

Réponse:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "originalName": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "checksum": "abc123...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Créer un token de téléchargement

```bash
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "123e4567-e89b-12d3-a456-426614174000",
    "expiresInHours": 24,
    "maxDownloads": 5
  }'
```

Réponse:
```json
{
  "success": true,
  "message": "Token created successfully",
  "data": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "token": "a1b2c3d4e5f6...",
    "fileId": "123e4567-e89b-12d3-a456-426614174000",
    "fileName": "image.jpg",
    "expiresAt": "2024-01-16T10:30:00.000Z",
    "maxDownloads": 5,
    "downloadUrl": "/download/a1b2c3d4e5f6..."
  }
}
```

### Télécharger un fichier (public)

```bash
# Pas besoin d'API key!
curl -O http://localhost:8899/download/a1b2c3d4e5f6...
```

### Obtenir les statistiques

```bash
curl http://localhost:8899/api/files/stats \
  -H "Authorization: Bearer mysecretkey"
```

## ⚙️ Configuration

### Variables d'environnement

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 3000 | Port de l'API |
| `API_KEY` | - | Clé d'API (obligatoire) |
| `POSTGRES_HOST` | postgres | Hôte PostgreSQL |
| `POSTGRES_PORT` | 5432 | Port PostgreSQL |
| `POSTGRES_DB` | cdn_db | Nom de la base |
| `POSTGRES_USER` | cdn_user | Utilisateur |
| `POSTGRES_PASSWORD` | - | Mot de passe |
| `MAX_FILE_SIZE` | 104857600 | Taille max (100MB) |
| `TOKEN_EXPIRY_HOURS` | 24 | Durée de vie des tokens |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Fenêtre rate limit (15min) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requêtes par fenêtre |
| `NGINX_PORT` | 8899 | Port Nginx exposé |

## 🧪 Tests

```bash
# Entrer dans le container API
docker-compose exec api sh

# Lancer les tests
npm test

# Avec couverture
npm test -- --coverage
```

## 🔒 Sécurité

- **Authentification**: Bearer token ou X-API-Key
- **Rate Limiting**: Protection contre les abus
- **Validation**: Fichiers validés (extension, MIME, taille)
- **Tokens temporaires**: Expiration et limite de téléchargements
- **Logs complets**: Traçabilité des accès
- **Headers sécurité**: X-Frame-Options, X-Content-Type-Options, etc.
- **Comparaison sécurisée**: Protection timing attacks

## 🗄️ Base de données

### Tables

- **files**: Métadonnées des fichiers
- **access_tokens**: Tokens d'accès temporaires
- **access_logs**: Logs d'accès détaillés
- **api_keys**: Gestion des clés API (extension)

### Vues

- **active_tokens_view**: Tokens actifs avec infos fichier
- **access_stats_view**: Statistiques d'accès par fichier

## 📊 Monitoring

### Health Checks

```bash
# API
curl http://localhost:8899/health

# Nginx
curl http://localhost:8899/nginx-health
```

### Logs

```bash
# Tous les logs
docker-compose logs -f

# API seulement
docker-compose logs -f api

# Nginx seulement
docker-compose logs -f nginx
```

## 🛠️ Développement

```bash
# Mode développement (avec hot-reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Reconstruire après modifications
docker-compose build --no-cache

# Reset complet
docker-compose down -v
docker-compose up -d --build
```

## 📜 Licence

MIT
