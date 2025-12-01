# 🚀 Quick Start - Intégration CDN

## Installation rapide (5 minutes)

### Prérequis
- Docker & Docker Compose
- API Key CDN (fournie par votre admin)

### 1️⃣ Configuration

Créez un fichier `.env` dans votre projet :

```bash
CDN_URL=http://localhost:8899/api
CDN_API_KEY=mysecretkey
```

### 2️⃣ Installation des dépendances

**Node.js** :
```bash
npm install axios form-data
```

**PHP** :
```bash
composer require guzzlehttp/guzzle
```

**Python** :
```bash
pip install httpx python-dotenv
```

---

## 🎯 Exemple minimal

### Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const CDN_URL = 'http://localhost:8899/api';
const API_KEY = 'mysecretkey';

const cdnClient = axios.create({
  baseURL: CDN_URL,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// Upload + Token en 1 fonction
async function uploadImage(filePath) {
  // 1. Upload
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  const uploadRes = await cdnClient.post('/files/upload', formData, {
    headers: formData.getHeaders()
  });
  
  const fileId = uploadRes.data.data.id;
  
  // 2. Token
  const tokenRes = await cdnClient.post('/tokens', {
    fileId,
    expiresInHours: 24,
    maxDownloads: 100
  });
  
  // 3. URL publique
  const url = `http://localhost:8899${tokenRes.data.data.downloadUrl}`;
  
  console.log('URL:', url);
  return url;
}

// Utilisation
uploadImage('./photo.jpg');
```

### PHP

```php
<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;

$client = new Client([
    'base_uri' => 'http://localhost:8899/api',
    'headers' => ['Authorization' => 'Bearer mysecretkey']
]);

// Upload + Token
function uploadImage($filePath) {
    global $client;
    
    // 1. Upload
    $response = $client->post('/files/upload', [
        'multipart' => [
            ['name' => 'file', 'contents' => fopen($filePath, 'r')]
        ]
    ]);
    
    $fileId = json_decode($response->getBody(), true)['data']['id'];
    
    // 2. Token
    $response = $client->post('/tokens', [
        'json' => [
            'fileId' => $fileId,
            'expiresInHours' => 24,
            'maxDownloads' => 100
        ]
    ]);
    
    $downloadUrl = json_decode($response->getBody(), true)['data']['downloadUrl'];
    $url = "http://localhost:8899{$downloadUrl}";
    
    echo "URL: {$url}\n";
    return $url;
}

uploadImage('./photo.jpg');
```

### Python

```python
import httpx
import asyncio

CDN_URL = 'http://localhost:8899/api'
API_KEY = 'mysecretkey'

async def upload_image(file_path):
    headers = {'Authorization': f'Bearer {API_KEY}'}
    
    async with httpx.AsyncClient() as client:
        # 1. Upload
        with open(file_path, 'rb') as f:
            upload_res = await client.post(
                f'{CDN_URL}/files/upload',
                headers=headers,
                files={'file': f}
            )
        
        file_id = upload_res.json()['data']['id']
        
        # 2. Token
        token_res = await client.post(
            f'{CDN_URL}/tokens',
            headers=headers,
            json={
                'fileId': file_id,
                'expiresInHours': 24,
                'maxDownloads': 100
            }
        )
        
        download_url = token_res.json()['data']['downloadUrl']
        url = f'http://localhost:8899{download_url}'
        
        print(f'URL: {url}')
        return url

# Utilisation
asyncio.run(upload_image('./photo.jpg'))
```

---

## 🌐 Utilisation frontend

**⚠️ Important** : Ne jamais utiliser l'API Key côté client !

### Workflow recommandé

```
Frontend ──(1)──> Votre Backend ──(2)──> CDN API
   │                    │
   └──────(3)───────────┘
   
(1) Upload via FormData
(2) Votre backend appelle le CDN avec API Key
(3) Votre backend retourne l'URL publique
```

### HTML/JavaScript

```html
<form id="uploadForm">
  <input type="file" id="fileInput" accept="image/*">
  <button type="submit">Upload</button>
</form>

<img id="preview" style="max-width: 500px;">

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('image', document.getElementById('fileInput').files[0]);
  
  // Appel à VOTRE API (pas directement au CDN)
  const response = await fetch('https://mon-site.com/api/upload-image', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  
  // Afficher l'image
  document.getElementById('preview').src = data.url;
});
</script>
```

### Votre backend (Express)

```javascript
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'temp/' });

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  const cdnUrl = await uploadImage(req.file.path); // Fonction vue au-dessus
  
  fs.unlinkSync(req.file.path); // Nettoyer
  
  res.json({ url: cdnUrl });
});
```

---

## 📝 Cas d'usage courants

### Image affichée plusieurs fois

```javascript
// Token avec plus de téléchargements
const token = await createToken(fileId, 24, 1000); // 24h, 1000 vues
```

### Téléchargement unique (document sensible)

```javascript
// Token à usage unique
const token = await createToken(fileId, 1, 1); // 1h, 1 téléchargement
```

### Vidéo streaming

```javascript
const token = await createToken(videoId, 168, 10000); // 1 semaine, 10k lectures
```

```html
<video controls>
  <source src="http://localhost:8899/download/{token}" type="video/mp4">
</video>
```

---

## 🧪 Tester avec cURL

```bash
# 1. Upload
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"

# Copier le "id" de la réponse

# 2. Créer token
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "COLLER_ICI", "expiresInHours": 24, "maxDownloads": 1}'

# Copier le "token" de la réponse

# 3. Télécharger
curl -O http://localhost:8899/download/COLLER_TOKEN_ICI
```

---

## ⚡ Prochaines étapes

1. ✅ Testez l'upload avec cURL
2. 📖 Consultez [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) pour des exemples complets
3. 📚 Voir [API_REFERENCE.md](./API_REFERENCE.md) pour tous les endpoints
4. 💻 Utilisez les fichiers dans `examples/` pour votre langage

---

## 🆘 Problèmes courants

### Erreur 401 Unauthorized
➡️ Vérifiez que l'API Key est correcte et dans le header `Authorization`

### Erreur 413 Payload Too Large
➡️ Fichier > 100 MB. Compressez ou divisez le fichier.

### Erreur 415 Unsupported Media Type
➡️ Extension de fichier non autorisée. Voir la liste dans [API_REFERENCE.md](./API_REFERENCE.md)

### Token ne fonctionne plus (404)
➡️ Le token est expiré, révoqué ou a atteint sa limite de téléchargements. Créez-en un nouveau.

---

**Besoin d'aide ?** Consultez les logs : `docker logs cdn-api`
