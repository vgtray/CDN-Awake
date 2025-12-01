# 🔗 Guide d'Intégration CDN - Site Externe

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [API Reference](#api-reference)
4. [Exemples d'implémentation](#exemples-dimplémentation)
5. [Cas d'usage courants](#cas-dusage-courants)
6. [Sécurité et bonnes pratiques](#sécurité-et-bonnes-pratiques)

---

## Vue d'ensemble

### Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Votre Site     │         │   CDN API       │         │   PostgreSQL    │
│  (Frontend/     │ ◄─────► │  (Node.js)      │ ◄─────► │   Database      │
│   Backend)      │   HTTPS │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Workflow de base

1. **Upload** : Votre site envoie un fichier au CDN
2. **Stockage** : CDN stocke le fichier et retourne un `fileId`
3. **Token** : Vous créez un token d'accès temporaire pour ce fichier
4. **Affichage** : Vous utilisez le lien tokenisé dans votre HTML
5. **Expiration** : Le token expire automatiquement après usage/délai

---

## Authentification

### API Key (pour votre backend)

Toutes les requêtes d'upload et de gestion nécessitent une **API Key**.

```http
Authorization: Bearer VOTRE_API_KEY
```

**Obtenir votre API Key** :
- Définie dans le fichier `.env` du CDN : `API_KEY=mysecretkey`
- ⚠️ **NE JAMAIS exposer cette clé côté client !**

---

## API Reference

### Base URL
```
http://localhost:8899/api
```

### Endpoints disponibles

#### 1. 📤 Upload de fichier

**Endpoint** : `POST /api/files/upload`

**Headers** :
```http
Authorization: Bearer VOTRE_API_KEY
Content-Type: multipart/form-data
```

**Body** (multipart/form-data) :
```
file: [binary file data]
uploadedBy: "mon-site.com" (optionnel)
```

**Réponse** (201 Created) :
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "8017ec23-b299-4995-8c67-e4a25e1d5be0",
    "originalName": "photo.jpg",
    "storedName": "1733014567890-abc123.jpg",
    "mimeType": "image/jpeg",
    "size": 245678,
    "checksum": "sha256:abc123...",
    "uploadedBy": "mon-site.com",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Limites** :
- Taille max : 100 MB (configurable via `MAX_FILE_SIZE`)
- Extensions autorisées : `.jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.mp4,.mp3,.txt,.json,.css,.html`

---

#### 2. 🔑 Créer un token d'accès

**Endpoint** : `POST /api/tokens`

**Headers** :
```http
Authorization: Bearer VOTRE_API_KEY
Content-Type: application/json
```

**Body** :
```json
{
  "fileId": "8017ec23-b299-4995-8c67-e4a25e1d5be0",
  "expiresInHours": 24,
  "maxDownloads": 1
}
```

**Paramètres** :
- `fileId` (UUID, requis) : ID du fichier uploadé
- `expiresInHours` (number, requis) : Durée de validité en heures (1-8760)
- `maxDownloads` (number, optionnel) : Nombre max de téléchargements (défaut: 1)

**Réponse** (201 Created) :
```json
{
  "success": true,
  "message": "Token created successfully",
  "data": {
    "id": "token-uuid",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "fileId": "8017ec23-b299-4995-8c67-e4a25e1d5be0",
    "expiresAt": "2025-12-02T10:30:00.000Z",
    "maxDownloads": 1,
    "downloadCount": 0,
    "downloadUrl": "/download/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

---

#### 3. 📥 Télécharger un fichier (Public - sans API Key)

**Endpoint** : `GET /download/{token}`

**Headers** : Aucun requis

**Exemple** :
```
http://localhost:8899/download/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Réponse** :
- **200 OK** : Fichier téléchargé (binaire)
- **404 Not Found** : Token invalide, expiré ou révoqué
- **429 Too Many Requests** : Nombre max de téléchargements atteint

**Headers de réponse** :
```http
Content-Type: image/jpeg
Content-Disposition: inline; filename="photo.jpg"
Content-Length: 245678
X-Token-Downloads: 1/1
X-Token-Expires: 2025-12-02T10:30:00.000Z
```

---

#### 4. 📋 Lister les fichiers

**Endpoint** : `GET /api/files`

**Headers** :
```http
Authorization: Bearer VOTRE_API_KEY
```

**Query Parameters** :
```
?page=1&limit=20&search=photo&sortBy=createdAt&sortOrder=desc
```

**Réponse** (200 OK) :
```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 245678,
      "uploadedBy": "mon-site.com",
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

---

#### 5. 🗑️ Supprimer un fichier

**Endpoint** : `DELETE /api/files/{fileId}`

**Headers** :
```http
Authorization: Bearer VOTRE_API_KEY
```

**Réponse** (200 OK) :
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "id": "file-uuid",
    "originalName": "photo.jpg"
  }
}
```

⚠️ **Attention** : Supprime aussi tous les tokens associés !

---

#### 6. ❌ Révoquer un token

**Endpoint** : `DELETE /api/tokens/{tokenId}`

**Headers** :
```http
Authorization: Bearer VOTRE_API_KEY
```

**Réponse** (200 OK) :
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

---

## Exemples d'implémentation

### 🔹 Node.js / Express

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const CDN_URL = 'http://localhost:8899/api';
const API_KEY = 'mysecretkey';

// Configuration axios
const cdnClient = axios.create({
  baseURL: CDN_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

// 1. Upload d'un fichier
async function uploadFile(filePath, uploadedBy = 'mon-site') {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('uploadedBy', uploadedBy);

  try {
    const response = await cdnClient.post('/files/upload', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('✅ Fichier uploadé:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur upload:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Créer un token d'accès
async function createToken(fileId, expiresInHours = 24, maxDownloads = 1) {
  try {
    const response = await cdnClient.post('/tokens', {
      fileId,
      expiresInHours,
      maxDownloads
    });
    
    console.log('✅ Token créé:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur création token:', error.response?.data || error.message);
    throw error;
  }
}

// 3. Workflow complet : Upload + Token
async function uploadAndGetToken(filePath) {
  // Upload
  const file = await uploadFile(filePath, 'mon-application');
  
  // Créer token
  const token = await createToken(file.id, 24, 100); // 24h, 100 téléchargements
  
  // URL publique
  const publicUrl = `http://localhost:8899${token.downloadUrl}`;
  
  console.log('🔗 URL publique:', publicUrl);
  
  return {
    file,
    token,
    publicUrl
  };
}

// 4. Utilisation
(async () => {
  const result = await uploadAndGetToken('./photo.jpg');
  
  // Vous pouvez maintenant utiliser result.publicUrl dans votre HTML
  console.log(`<img src="${result.publicUrl}" alt="Photo">`);
})();
```

---

### 🔹 PHP / Laravel

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\UploadedFile;

class CdnService
{
    private $baseUrl = 'http://localhost:8899/api';
    private $apiKey = 'mysecretkey';

    /**
     * Upload un fichier vers le CDN
     */
    public function uploadFile(UploadedFile $file, string $uploadedBy = 'mon-site')
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}"
        ])->attach(
            'file', 
            file_get_contents($file->getRealPath()),
            $file->getClientOriginalName()
        )->post("{$this->baseUrl}/files/upload", [
            'uploadedBy' => $uploadedBy
        ]);

        if ($response->successful()) {
            return $response->json()['data'];
        }

        throw new \Exception('Upload failed: ' . $response->body());
    }

    /**
     * Créer un token d'accès
     */
    public function createToken(string $fileId, int $expiresInHours = 24, int $maxDownloads = 1)
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}"
        ])->post("{$this->baseUrl}/tokens", [
            'fileId' => $fileId,
            'expiresInHours' => $expiresInHours,
            'maxDownloads' => $maxDownloads
        ]);

        if ($response->successful()) {
            return $response->json()['data'];
        }

        throw new \Exception('Token creation failed: ' . $response->body());
    }

    /**
     * Workflow complet
     */
    public function uploadAndGetUrl(UploadedFile $file, int $expiresInHours = 24)
    {
        // Upload
        $fileData = $this->uploadFile($file);
        
        // Créer token
        $token = $this->createToken($fileData['id'], $expiresInHours, 100);
        
        // Construire URL
        $publicUrl = "http://localhost:8899{$token['downloadUrl']}";
        
        return [
            'file' => $fileData,
            'token' => $token,
            'url' => $publicUrl
        ];
    }
}

// Utilisation dans un contrôleur
public function store(Request $request)
{
    $request->validate([
        'image' => 'required|image|max:10240'
    ]);

    $cdnService = new CdnService();
    $result = $cdnService->uploadAndGetUrl($request->file('image'), 48); // 48 heures

    // Sauvegarder dans votre BDD
    $post = Post::create([
        'title' => $request->title,
        'image_url' => $result['url'],
        'cdn_file_id' => $result['file']['id'],
        'cdn_token_id' => $result['token']['id']
    ]);

    return response()->json($post);
}
```

---

### 🔹 Python / FastAPI

```python
import httpx
import os
from fastapi import UploadFile

class CDNService:
    def __init__(self):
        self.base_url = "http://localhost:8899/api"
        self.api_key = "mysecretkey"
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
    
    async def upload_file(self, file: UploadFile, uploaded_by: str = "mon-site"):
        """Upload un fichier vers le CDN"""
        files = {"file": (file.filename, file.file, file.content_type)}
        data = {"uploadedBy": uploaded_by}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/files/upload",
                headers=self.headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            return response.json()["data"]
    
    async def create_token(self, file_id: str, expires_in_hours: int = 24, max_downloads: int = 1):
        """Créer un token d'accès"""
        payload = {
            "fileId": file_id,
            "expiresInHours": expires_in_hours,
            "maxDownloads": max_downloads
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/tokens",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()["data"]
    
    async def upload_and_get_url(self, file: UploadFile, expires_in_hours: int = 24):
        """Workflow complet"""
        # Upload
        file_data = await self.upload_file(file)
        
        # Créer token
        token_data = await self.create_token(file_data["id"], expires_in_hours, 100)
        
        # URL publique
        public_url = f"http://localhost:8899{token_data['downloadUrl']}"
        
        return {
            "file": file_data,
            "token": token_data,
            "url": public_url
        }

# Utilisation dans une route FastAPI
from fastapi import FastAPI, File, UploadFile

app = FastAPI()
cdn = CDNService()

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    result = await cdn.upload_and_get_url(file, expires_in_hours=48)
    
    return {
        "message": "Image uploaded successfully",
        "url": result["url"],
        "file_id": result["file"]["id"]
    }
```

---

### 🔹 JavaScript / Frontend (via votre API)

**⚠️ Important** : Ne jamais exposer l'API Key côté client !

Votre frontend doit passer par **votre backend** :

```javascript
// Frontend (React/Vue/Vanilla JS)
async function uploadImageViaBackend(file) {
  const formData = new FormData();
  formData.append('image', file);

  // Appel à VOTRE API (pas directement au CDN)
  const response = await fetch('https://mon-site.com/api/upload-image', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${userToken}` // Token de VOTRE site
    }
  });

  const data = await response.json();
  
  // data.url contient l'URL du CDN
  return data.url;
}

// Utilisation
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fileInput = document.getElementById('fileInput');
  const cdnUrl = await uploadImageViaBackend(fileInput.files[0]);
  
  // Afficher l'image
  document.getElementById('preview').src = cdnUrl;
  
  console.log('Image disponible sur:', cdnUrl);
});
```

**HTML** :
```html
<form id="uploadForm">
  <input type="file" id="fileInput" accept="image/*">
  <button type="submit">Upload</button>
</form>

<img id="preview" alt="Preview" style="max-width: 500px;">
```

---

## Cas d'usage courants

### 1️⃣ Galerie d'images (affichage multiple)

**Problème** : Une image affichée plusieurs fois consomme le token rapidement.

**Solution** : Utiliser `maxDownloads` élevé et renouveler périodiquement.

```javascript
// Backend : Créer token pour affichage répété
const token = await createToken(fileId, 24, 1000); // 24h, 1000 vues
```

**Alternative** : Proxy côté serveur

```javascript
// Votre backend sert l'image en passant par le CDN
app.get('/images/:id', async (req, res) => {
  const file = await db.getFile(req.params.id);
  const cdnUrl = `http://localhost:8899/download/${file.token}`;
  
  // Télécharger depuis le CDN
  const cdnResponse = await axios.get(cdnUrl, { responseType: 'stream' });
  
  // Renvoyer à l'utilisateur
  cdnResponse.data.pipe(res);
});
```

---

### 2️⃣ Téléchargement unique (fichiers sensibles)

```javascript
// Token à usage unique, expire en 1 heure
const token = await createToken(fileId, 1, 1);

// Envoyer par email
sendEmail(user.email, {
  subject: 'Votre document',
  body: `Téléchargez votre document ici : http://cdn.example.com/download/${token.token}`
});
```

---

### 3️⃣ Vidéo streaming (lecture multiple)

```javascript
// Token longue durée, nombreux accès
const token = await createToken(videoFileId, 168, 10000); // 1 semaine, 10k lectures

// HTML5 Video
<video controls>
  <source src="http://localhost:8899/download/${token.token}" type="video/mp4">
</video>
```

---

### 4️⃣ Avatar utilisateur (permanent)

**Option 1** : Token très longue durée
```javascript
const token = await createToken(avatarFileId, 8760, 100000); // 1 an, 100k vues
```

**Option 2** : Renouveler automatiquement
```javascript
// Cron job quotidien pour renouveler les tokens d'avatars
cron.schedule('0 0 * * *', async () => {
  const expiringSoon = await getTokensExpiringSoon(24); // Expire dans 24h
  
  for (const oldToken of expiringSoon) {
    await revokeToken(oldToken.id);
    const newToken = await createToken(oldToken.fileId, 30, 10000);
    await updateUserAvatar(oldToken.userId, newToken.token);
  }
});
```

---

## Sécurité et bonnes pratiques

### ✅ DO (À faire)

1. **Toujours utiliser HTTPS en production**
   ```javascript
   const CDN_URL = process.env.NODE_ENV === 'production' 
     ? 'https://cdn.votredomaine.com/api'
     : 'http://localhost:8899/api';
   ```

2. **Stocker l'API Key dans les variables d'environnement**
   ```bash
   # .env
   CDN_API_KEY=your_super_secret_key_here
   CDN_URL=https://cdn.votredomaine.com
   ```

3. **Valider les fichiers avant upload**
   ```javascript
   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
   const maxSize = 5 * 1024 * 1024; // 5 MB
   
   if (!allowedTypes.includes(file.mimetype)) {
     throw new Error('Type de fichier non autorisé');
   }
   
   if (file.size > maxSize) {
     throw new Error('Fichier trop volumineux');
   }
   ```

4. **Gérer les erreurs proprement**
   ```javascript
   try {
     const file = await uploadFile(filePath);
   } catch (error) {
     if (error.response?.status === 413) {
       console.error('Fichier trop volumineux');
     } else if (error.response?.status === 401) {
       console.error('API Key invalide');
     } else {
       console.error('Erreur inconnue:', error.message);
     }
   }
   ```

5. **Nettoyer les fichiers inutilisés**
   ```javascript
   // Supprimer les vieux fichiers non utilisés
   const oldFiles = await listFiles({ 
     olderThan: '30d',
     noActiveTokens: true 
   });
   
   for (const file of oldFiles) {
     await deleteFile(file.id);
   }
   ```

---

### ❌ DON'T (À éviter)

1. **Ne JAMAIS exposer l'API Key côté client**
   ```javascript
   // ❌ MAUVAIS
   const apiKey = 'mysecretkey'; // Dans le JavaScript frontend
   
   // ✅ BON
   // Utiliser votre propre API backend qui appelle le CDN
   ```

2. **Ne pas stocker les tokens en dur dans la BDD**
   ```javascript
   // ❌ MAUVAIS
   const url = `http://cdn.com/download/${hardcodedToken}`;
   
   // ✅ BON
   // Stocker fileId et régénérer le token à la demande
   ```

3. **Ne pas utiliser le même token pour plusieurs utilisateurs**
   ```javascript
   // ❌ MAUVAIS
   const sharedToken = await createToken(fileId, 720, 999999);
   
   // ✅ BON
   // 1 token par utilisateur ou session
   ```

4. **Ne pas ignorer les limites de rate limiting**
   ```javascript
   // ✅ BON : Implémenter un retry avec backoff
   async function uploadWithRetry(file, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await uploadFile(file);
       } catch (error) {
         if (error.response?.status === 429 && i < maxRetries - 1) {
           await sleep(Math.pow(2, i) * 1000); // Exponential backoff
           continue;
         }
         throw error;
       }
     }
   }
   ```

---

## 🔗 Liens utiles

- **Dashboard Admin** : http://localhost:8899/admin-dashboard.html
- **API Health Check** : http://localhost:8899/health
- **API Documentation** : http://localhost:8899/api

---

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs : `docker logs cdn-api`
2. Vérifiez les logs d'accès via le dashboard admin
3. Testez l'API avec Postman/cURL

---

**Créé le** : 1 Décembre 2025  
**Version** : 1.0.0
