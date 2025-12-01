# 📚 Guide de Référence API - Système CDN

## 🔗 URL de base
```
Production : https://cdn.votredomaine.com/api
Development : http://localhost:8899/api
```

---

## 🔐 Authentification

### API Key (Backend uniquement)

Toutes les requêtes sauf `/download/{token}` nécessitent une API Key.

**Header requis** :
```http
Authorization: Bearer VOTRE_API_KEY
```

**Obtenir votre API Key** :
- Définie dans `.env` : `API_KEY=mysecretkey`
- ⚠️ **Ne JAMAIS exposer côté client !**

---

## 📋 Endpoints

### 1. Upload de fichier

```http
POST /api/files/upload
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data
```

**Body** (multipart/form-data) :
| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `file` | File | Oui | Fichier binaire à uploader |
| `uploadedBy` | String | Non | Identifiant de votre application |

**Réponse** (201 Created) :
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid-v4",
    "originalName": "photo.jpg",
    "storedName": "1733014567890-abc123.jpg",
    "mimeType": "image/jpeg",
    "size": 245678,
    "checksum": "sha256:...",
    "uploadedBy": "mon-site",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Codes d'erreur** :
| Code | Description |
|------|-------------|
| 400 | Aucun fichier fourni |
| 413 | Fichier trop volumineux (> 100 MB) |
| 415 | Type de fichier non autorisé |
| 401 | API Key invalide ou manquante |
| 500 | Erreur serveur |

**Exemple cURL** :
```bash
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg" \
  -F "uploadedBy=mon-site"
```

---

### 2. Créer un token d'accès

```http
POST /api/tokens
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Body** (JSON) :
```json
{
  "fileId": "uuid-v4",
  "expiresInHours": 24,
  "maxDownloads": 1
}
```

| Champ | Type | Requis | Valeurs | Description |
|-------|------|--------|---------|-------------|
| `fileId` | UUID | Oui | - | ID du fichier uploadé |
| `expiresInHours` | Number | Oui | 1-8760 | Durée de validité (1h à 1 an) |
| `maxDownloads` | Number | Non | 1-999999 | Nombre max de téléchargements (défaut: 1) |

**Réponse** (201 Created) :
```json
{
  "success": true,
  "message": "Token created successfully",
  "data": {
    "id": "uuid-v4",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "fileId": "uuid-v4",
    "expiresAt": "2025-12-02T10:30:00.000Z",
    "maxDownloads": 1,
    "downloadCount": 0,
    "downloadUrl": "/download/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Codes d'erreur** :
| Code | Description |
|------|-------------|
| 400 | Paramètres invalides |
| 404 | Fichier non trouvé |
| 401 | API Key invalide |

**Exemple cURL** :
```bash
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "8017ec23-b299-4995-8c67-e4a25e1d5be0",
    "expiresInHours": 24,
    "maxDownloads": 100
  }'
```

---

### 3. Télécharger un fichier (Public)

```http
GET /download/{token}
```

**Headers** : Aucun (endpoint public)

**Paramètres** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `token` | String | Token de 32 caractères |

**Réponse** (200 OK) :
- **Content-Type** : Type MIME du fichier
- **Content-Disposition** : `inline; filename="photo.jpg"`
- **Content-Length** : Taille en octets
- **X-Token-Downloads** : `1/100` (actuel/max)
- **X-Token-Expires** : Date d'expiration

**Codes d'erreur** :
| Code | Description |
|------|-------------|
| 404 | Token invalide, expiré ou révoqué |
| 410 | Fichier supprimé |
| 429 | Limite de téléchargements atteinte |

**Exemple cURL** :
```bash
curl -O http://localhost:8899/download/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Exemple HTML** :
```html
<!-- Image -->
<img src="http://localhost:8899/download/{token}" alt="Photo">

<!-- Vidéo -->
<video controls>
  <source src="http://localhost:8899/download/{token}" type="video/mp4">
</video>

<!-- Lien de téléchargement -->
<a href="http://localhost:8899/download/{token}" download>
  Télécharger le fichier
</a>
```

---

### 4. Lister les fichiers

```http
GET /api/files
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
```

**Query Parameters** :
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | Number | 1 | Numéro de page |
| `limit` | Number | 20 | Résultats par page (1-100) |
| `search` | String | - | Recherche par nom |
| `sortBy` | String | createdAt | Champ de tri |
| `sortOrder` | String | desc | `asc` ou `desc` |

**Réponse** (200 OK) :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "originalName": "photo.jpg",
      "storedName": "...",
      "mimeType": "image/jpeg",
      "size": 245678,
      "uploadedBy": "mon-site",
      "createdAt": "2025-12-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Exemple cURL** :
```bash
curl -X GET "http://localhost:8899/api/files?page=1&limit=10&search=photo" \
  -H "Authorization: Bearer mysecretkey"
```

---

### 5. Supprimer un fichier

```http
DELETE /api/files/{fileId}
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
```

**Paramètres** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `fileId` | UUID | ID du fichier à supprimer |

**Réponse** (200 OK) :
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "id": "uuid-v4",
    "originalName": "photo.jpg"
  }
}
```

⚠️ **Attention** : Supprime aussi tous les tokens associés !

**Codes d'erreur** :
| Code | Description |
|------|-------------|
| 404 | Fichier non trouvé |
| 401 | API Key invalide |

**Exemple cURL** :
```bash
curl -X DELETE http://localhost:8899/api/files/8017ec23-b299-4995-8c67-e4a25e1d5be0 \
  -H "Authorization: Bearer mysecretkey"
```

---

### 6. Lister les tokens

```http
GET /api/tokens
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
```

**Query Parameters** :
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | Number | 1 | Numéro de page |
| `limit` | Number | 20 | Résultats par page |
| `fileId` | UUID | - | Filtrer par fichier |
| `active` | Boolean | - | Seulement les tokens actifs |

**Réponse** (200 OK) :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "token": "a1b2c3...",
      "fileId": "uuid-v4",
      "expiresAt": "2025-12-02T10:30:00.000Z",
      "maxDownloads": 100,
      "downloadCount": 5,
      "isRevoked": false,
      "createdAt": "2025-12-01T10:30:00.000Z"
    }
  ],
  "pagination": {...}
}
```

**Exemple cURL** :
```bash
curl -X GET "http://localhost:8899/api/tokens?active=true" \
  -H "Authorization: Bearer mysecretkey"
```

---

### 7. Révoquer un token

```http
DELETE /api/tokens/{tokenId}
```

**Headers** :
```http
Authorization: Bearer {API_KEY}
```

**Paramètres** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `tokenId` | UUID | ID du token à révoquer |

**Réponse** (200 OK) :
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

**Codes d'erreur** :
| Code | Description |
|------|-------------|
| 404 | Token non trouvé |
| 401 | API Key invalide |

**Exemple cURL** :
```bash
curl -X DELETE http://localhost:8899/api/tokens/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer mysecretkey"
```

---

### 8. Vérifier la santé de l'API

```http
GET /health
```

**Headers** : Aucun

**Réponse** (200 OK) :
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

**Exemple cURL** :
```bash
curl http://localhost:8899/health
```

---

## 📊 Rate Limiting

L'API applique un rate limiting pour éviter les abus :

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/api/files/upload` | 100 requêtes | 15 minutes |
| `/api/tokens` | 200 requêtes | 15 minutes |
| `/api/files` (GET) | 300 requêtes | 15 minutes |
| `/download/{token}` | Pas de limite globale* | - |

*Le téléchargement est limité par `maxDownloads` par token

**Headers de réponse** :
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1733015400000
```

**Erreur 429 (Too Many Requests)** :
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

---

## 🔒 Sécurité

### Extensions de fichiers autorisées

```
Images    : .jpg, .jpeg, .png, .gif, .webp, .svg
Documents : .pdf, .txt, .doc, .docx
Archives  : .zip, .rar, .7z
Médias    : .mp4, .mp3, .wav, .webm
Web       : .json, .css, .html, .js
```

### Taille maximale

- **100 MB** par fichier (configurable via `MAX_FILE_SIZE`)

### Headers de sécurité

Toutes les réponses incluent :
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## ⚠️ Codes d'erreur

| Code | Signification | Description |
|------|--------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Paramètres invalides |
| 401 | Unauthorized | API Key manquante ou invalide |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource non trouvée |
| 410 | Gone | Ressource supprimée définitivement |
| 413 | Payload Too Large | Fichier trop volumineux |
| 415 | Unsupported Media Type | Type de fichier non autorisé |
| 429 | Too Many Requests | Rate limit atteint |
| 500 | Internal Server Error | Erreur serveur |

**Format d'erreur** :
```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

---

## 📖 Exemples de workflows

### Workflow 1 : Upload simple

```bash
# 1. Upload du fichier
RESPONSE=$(curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg" \
  -s)

FILE_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "File ID: $FILE_ID"

# 2. Créer un token
TOKEN_RESPONSE=$(curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\": \"$FILE_ID\", \"expiresInHours\": 24, \"maxDownloads\": 1}" \
  -s)

DOWNLOAD_URL=$(echo $TOKEN_RESPONSE | jq -r '.data.downloadUrl')
echo "URL: http://localhost:8899$DOWNLOAD_URL"
```

### Workflow 2 : Galerie d'images

```bash
# Token longue durée pour affichage répété
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-uuid",
    "expiresInHours": 168,
    "maxDownloads": 10000
  }'
```

### Workflow 3 : Téléchargement unique

```bash
# Token à usage unique, expire en 1h
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-uuid",
    "expiresInHours": 1,
    "maxDownloads": 1
  }'
```

---

## 🔗 Ressources

- **Dashboard Admin** : http://localhost:8899/admin-dashboard.html
- **Guide d'intégration** : [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Exemples de code** : Dossier `examples/`

---

**Version** : 1.0.0  
**Date** : 1 Décembre 2025
