# 📚 Exemples d'intégration CDN

Ce dossier contient des exemples de code complets pour intégrer le CDN dans différents langages.

## 📁 Structure

```
examples/
├── README.md              ← Ce fichier
├── package.json           ← Dépendances Node.js
├── nodejs-example.js      ← Exemples Node.js/JavaScript
├── php-example.php        ← Exemples PHP/Laravel
├── python-example.py      ← Exemples Python/FastAPI/Django
└── server-example.js      ← Serveur Express complet avec UI
```

## 🚀 Démarrage rapide

### Option 1 : Serveur web interactif (Node.js)

Le moyen le plus rapide de tester le CDN !

```bash
# 1. Installer les dépendances
cd examples
npm install

# 2. Démarrer le serveur
npm start

# 3. Ouvrir dans le navigateur
http://localhost:3001
```

✨ Vous aurez une interface web complète pour uploader des images et voir les URLs générées !

---

### Option 2 : Scripts individuels

#### Node.js

```bash
# Installation
npm install

# Créer .env
echo "CDN_URL=http://localhost:8899/api" > .env
echo "CDN_API_KEY=mysecretkey" >> .env

# Exécuter
node nodejs-example.js
```

**Fonctions disponibles** :
```javascript
const { uploadFile, createToken, uploadAndGetUrl } = require('./nodejs-example');

// Workflow complet
uploadAndGetUrl('./photo.jpg', 24, 100);

// Upload seul
uploadFile('./photo.jpg', 'mon-app');

// Token seul
createToken('file-uuid', 24, 100);
```

---

#### PHP

```bash
# Installation
composer require guzzlehttp/guzzle

# Créer .env
echo "CDN_URL=http://localhost:8899/api" > .env
echo "CDN_API_KEY=mysecretkey" >> .env

# Exécuter
php php-example.php
```

**Utilisation avec Laravel** :
```php
use App\Services\CdnService;

// Dans un contrôleur
$cdn = new CdnService();
$result = $cdn->uploadAndGetUrl($request->file('image'), 48, 1000);

// Sauvegarder dans la BDD
Post::create([
    'image_url' => $result['url'],
    'cdn_file_id' => $result['file']['id']
]);
```

---

#### Python

```bash
# Installation
pip install httpx python-dotenv

# Créer .env
echo "CDN_URL=http://localhost:8899/api" > .env
echo "CDN_API_KEY=mysecretkey" >> .env

# Exécuter
python python-example.py
```

**Utilisation avec FastAPI** :
```python
from cdn_service import CDNService

cdn = CDNService()

@app.post("/upload")
async def upload(file: UploadFile):
    result = await cdn.upload_and_get_url(file, 48, 1000)
    return {"url": result['url']}
```

---

## 📖 Documentation complète

- **Guide d'intégration** : [../INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)
- **Référence API** : [../API_REFERENCE.md](../API_REFERENCE.md)
- **Quick Start** : [../QUICKSTART.md](../QUICKSTART.md)

---

## 🎯 Cas d'usage

### 1. Upload simple d'image

**Node.js** :
```javascript
const url = await uploadAndGetUrl('./photo.jpg', 24, 100);
console.log('Image disponible sur:', url);
```

**PHP** :
```php
$url = $cdn->uploadAndGetUrl('./photo.jpg', 24, 100)['url'];
echo "Image: {$url}";
```

**Python** :
```python
result = await cdn.upload_and_get_url('./photo.jpg', 24, 100)
print(f"Image: {result['url']}")
```

---

### 2. Galerie d'images (affichage multiple)

Token longue durée avec beaucoup de téléchargements :

```javascript
// Token valide 1 semaine, 10 000 vues
const token = await createToken(fileId, 168, 10000);
```

---

### 3. Téléchargement unique (document sécurisé)

Token à usage unique, expire rapidement :

```javascript
// 1 heure, 1 téléchargement
const token = await createToken(fileId, 1, 1);

// Envoyer par email
sendEmail(user.email, {
  subject: 'Votre document',
  body: `Télécharger : http://cdn.com/download/${token.token}`
});
```

---

### 4. Vidéo streaming

Token longue durée pour lecture multiple :

```javascript
const token = await createToken(videoId, 168, 50000); // 1 semaine

// HTML5 Video
<video controls>
  <source src="http://localhost:8899/download/${token.token}" type="video/mp4">
</video>
```

---

## 🔧 Configuration

Toutes les variables d'environnement disponibles :

```bash
# .env
CDN_URL=http://localhost:8899/api
CDN_API_KEY=mysecretkey
```

En production :

```bash
# .env.production
CDN_URL=https://cdn.votredomaine.com/api
CDN_API_KEY=votre_cle_secrete_production
```

---

## 🧪 Tests

### Test avec cURL

```bash
# Upload
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@test-image.jpg"

# Créer token
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "FILE_ID_ICI", "expiresInHours": 24, "maxDownloads": 100}'

# Télécharger
curl -O http://localhost:8899/download/TOKEN_ICI
```

---

## ⚠️ Sécurité

### ✅ DO (À faire)

1. **Ne JAMAIS exposer l'API Key côté client**
   ```javascript
   // ❌ MAUVAIS
   const apiKey = 'mysecretkey'; // Dans le JavaScript frontend
   
   // ✅ BON
   // L'API Key reste sur le backend
   ```

2. **Toujours passer par votre backend**
   ```
   Frontend → Votre API → CDN API
   ```

3. **Utiliser HTTPS en production**
   ```javascript
   const CDN_URL = process.env.NODE_ENV === 'production'
     ? 'https://cdn.votredomaine.com/api'
     : 'http://localhost:8899/api';
   ```

4. **Valider les fichiers avant upload**
   ```javascript
   if (file.size > 10 * 1024 * 1024) { // 10 MB
     throw new Error('Fichier trop volumineux');
   }
   ```

---

## 🆘 Problèmes courants

### ❌ Erreur : ECONNREFUSED

Le CDN n'est pas démarré.

```bash
# Démarrer le CDN
cd nginx-cdn
docker compose up -d
```

---

### ❌ Erreur 401 Unauthorized

API Key incorrecte.

```bash
# Vérifier l'API Key
docker exec cdn-api cat .env | grep API_KEY
```

---

### ❌ Erreur : Cannot find module

Dépendances non installées.

```bash
npm install
# ou
composer install
# ou
pip install -r requirements.txt
```

---

## 📞 Support

- **Logs API** : `docker logs cdn-api`
- **Dashboard Admin** : http://localhost:8899/admin-dashboard.html
- **Health Check** : http://localhost:8899/health

---

**Version** : 1.0.0  
**Dernière mise à jour** : 1 Décembre 2025
