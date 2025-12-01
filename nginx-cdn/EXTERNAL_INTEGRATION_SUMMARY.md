# 📖 Guide d'Intégration Externe - CDN System

## 🎯 Vue d'ensemble

Ce guide contient **tout ce dont vous avez besoin** pour intégrer votre site externe avec le CDN.

---

## 📚 Documentation disponible

### 1. **QUICKSTART.md** - Démarrage rapide (5 min)
Pour commencer immédiatement avec des exemples minimaux.

**Contenu** :
- Installation rapide
- Exemples minimaux (Node.js, PHP, Python)
- Utilisation frontend
- Tests avec cURL

👉 **Commencez par ici si vous voulez tester rapidement !**

---

### 2. **INTEGRATION_GUIDE.md** - Guide complet d'intégration
Documentation détaillée avec exemples complets.

**Contenu** :
- Architecture système
- Workflow détaillé
- Référence API complète
- Exemples d'implémentation (Node.js, PHP, Python)
- Cas d'usage courants (galerie, téléchargement unique, streaming)
- Sécurité et bonnes pratiques

👉 **Consultez ce guide pour une intégration complète !**

---

### 3. **API_REFERENCE.md** - Référence API
Documentation technique de tous les endpoints.

**Contenu** :
- Tous les endpoints avec paramètres détaillés
- Codes d'erreur
- Rate limiting
- Sécurité
- Exemples cURL
- Workflows complets

👉 **Référence technique pour développeurs !**

---

### 4. **examples/** - Code prêt à l'emploi
Exemples fonctionnels dans différents langages.

**Fichiers** :
- `nodejs-example.js` - Node.js/JavaScript
- `php-example.php` - PHP/Laravel
- `python-example.py` - Python/FastAPI/Django
- `server-example.js` - Serveur Express avec UI
- `README.md` - Guide d'utilisation des exemples

👉 **Copiez-collez et adaptez à votre projet !**

---

## 🚀 Par où commencer ?

### Scénario 1 : Je veux tester rapidement
```bash
cd examples
npm install
npm start
# Ouvrir http://localhost:3001
```

➡️ Vous aurez une interface web pour tester l'upload !

---

### Scénario 2 : Je veux intégrer dans mon backend Node.js

1. Lire **QUICKSTART.md** (section Node.js)
2. Copier le code minimal
3. Installer : `npm install axios form-data`
4. Tester avec votre fichier

**Code minimal** :
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const cdnClient = axios.create({
  baseURL: 'http://localhost:8899/api',
  headers: { 'Authorization': 'Bearer mysecretkey' }
});

async function uploadImage(filePath) {
  // Upload
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  const uploadRes = await cdnClient.post('/files/upload', formData, {
    headers: formData.getHeaders()
  });
  
  // Token
  const tokenRes = await cdnClient.post('/tokens', {
    fileId: uploadRes.data.data.id,
    expiresInHours: 24,
    maxDownloads: 100
  });
  
  return `http://localhost:8899${tokenRes.data.data.downloadUrl}`;
}
```

---

### Scénario 3 : Je veux intégrer dans mon backend PHP

1. Lire **QUICKSTART.md** (section PHP)
2. Copier `examples/php-example.php`
3. Installer : `composer require guzzlehttp/guzzle`
4. Utiliser la classe `CdnService`

---

### Scénario 4 : Je veux intégrer dans mon backend Python

1. Lire **QUICKSTART.md** (section Python)
2. Copier `examples/python-example.py`
3. Installer : `pip install httpx python-dotenv`
4. Utiliser la classe `CDNService`

---

### Scénario 5 : Je veux voir tous les endpoints disponibles

➡️ Consultez **API_REFERENCE.md**

Endpoints principaux :
- `POST /api/files/upload` - Upload fichier
- `POST /api/tokens` - Créer token
- `GET /download/{token}` - Télécharger (public)
- `DELETE /api/files/{id}` - Supprimer fichier
- `GET /api/files` - Lister fichiers

---

### Scénario 6 : Je veux comprendre l'architecture complète

➡️ Consultez **INTEGRATION_GUIDE.md** (section Architecture)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Votre Site     │         │   CDN API       │         │   PostgreSQL    │
│  (Frontend/     │ ◄─────► │  (Node.js)      │ ◄─────► │   Database      │
│   Backend)      │   HTTPS │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## 🔐 Sécurité - Points importants

### ✅ À FAIRE

1. **Garder l'API Key secrète**
   ```bash
   # Dans .env (jamais dans le code)
   CDN_API_KEY=mysecretkey
   ```

2. **Ne JAMAIS exposer l'API Key côté client**
   ```
   Frontend → Votre Backend → CDN API
            (avec auth)    (avec API Key)
   ```

3. **Utiliser HTTPS en production**
   ```javascript
   const CDN_URL = 'https://cdn.votredomaine.com/api';
   ```

4. **Valider les fichiers**
   - Vérifier le type (MIME type)
   - Limiter la taille (< 10 MB recommandé pour les images)
   - Scanner les virus en production

---

## 📋 Workflow standard

### Workflow 1 : Upload d'une image pour affichage

```javascript
// 1. Votre frontend envoie l'image à votre backend
POST https://mon-site.com/api/upload-image
Body: FormData { image: File }

// 2. Votre backend upload au CDN
POST http://localhost:8899/api/files/upload
Headers: Authorization: Bearer mysecretkey
Body: FormData { file: File }

// 3. Votre backend crée un token
POST http://localhost:8899/api/tokens
Body: { fileId: "...", expiresInHours: 24, maxDownloads: 1000 }

// 4. Votre backend retourne l'URL au frontend
Response: { url: "http://localhost:8899/download/token123..." }

// 5. Le frontend affiche l'image
<img src="http://localhost:8899/download/token123...">
```

---

## 🧪 Tester l'intégration

### Test 1 : Upload avec cURL

```bash
# Upload
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"

# Récupérer le "id" de la réponse, puis :

# Créer token
curl -X POST http://localhost:8899/api/tokens \
  -H "Authorization: Bearer mysecretkey" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "ID_ICI", "expiresInHours": 24, "maxDownloads": 1}'

# Récupérer le "token" de la réponse, puis :

# Télécharger
curl -O http://localhost:8899/download/TOKEN_ICI
```

---

### Test 2 : Serveur de démo

```bash
cd examples
npm install
npm start
# Ouvrir http://localhost:3001
```

Interface web complète pour tester l'upload !

---

## 📊 Cas d'usage fréquents

### 1. Galerie d'images (multi-affichage)

**Problème** : L'image est affichée plusieurs fois, le token expire vite.

**Solution** : Token longue durée avec beaucoup de téléchargements.

```javascript
const token = await createToken(fileId, 168, 10000); // 1 semaine, 10k vues
```

---

### 2. Téléchargement unique (fichier sensible)

**Problème** : Le fichier ne doit être téléchargé qu'une seule fois.

**Solution** : Token à usage unique.

```javascript
const token = await createToken(fileId, 1, 1); // 1h, 1 téléchargement
```

---

### 3. Vidéo streaming

**Problème** : La vidéo doit être lisible plusieurs fois.

**Solution** : Token très longue durée.

```javascript
const token = await createToken(videoId, 720, 999999); // 1 mois, illimité
```

```html
<video controls>
  <source src="http://localhost:8899/download/{token}" type="video/mp4">
</video>
```

---

### 4. Avatar utilisateur (permanent)

**Option 1** : Token très longue durée
```javascript
const token = await createToken(avatarId, 8760, 100000); // 1 an
```

**Option 2** : Renouveler automatiquement
```javascript
// Cron job quotidien
cron.schedule('0 0 * * *', async () => {
  const oldTokens = await getExpiringSoonTokens();
  for (const old of oldTokens) {
    await revokeToken(old.id);
    const newToken = await createToken(old.fileId, 30, 10000);
    await updateUserAvatar(old.userId, newToken.token);
  }
});
```

---

## 🆘 Problèmes courants

### Erreur 401 Unauthorized
➡️ **API Key incorrecte ou absente**

Solution :
```javascript
headers: { 'Authorization': 'Bearer mysecretkey' }
```

---

### Erreur 413 Payload Too Large
➡️ **Fichier > 100 MB**

Solution :
- Compresser le fichier
- Diviser en plusieurs parties
- Augmenter `MAX_FILE_SIZE` dans le CDN

---

### Erreur 415 Unsupported Media Type
➡️ **Extension de fichier non autorisée**

Extensions autorisées :
```
.jpg, .jpeg, .png, .gif, .webp, .svg
.pdf, .txt, .doc, .docx
.zip, .rar, .7z
.mp4, .mp3, .wav, .webm
.json, .css, .html, .js
```

---

### Token ne fonctionne plus (404)
➡️ **Token expiré, révoqué ou limite atteinte**

Solutions :
- Vérifier la date d'expiration
- Créer un nouveau token
- Augmenter `maxDownloads`

---

## 📞 Support et debugging

### Logs du CDN
```bash
docker logs cdn-api
```

### Dashboard Admin
```
http://localhost:8899/admin-dashboard.html

Login : adam@vgtray.fr
Password : adam123456
```

### Health Check
```
http://localhost:8899/health
```

---

## 📁 Structure de la documentation

```
nginx-cdn/
├── EXTERNAL_INTEGRATION_SUMMARY.md  ← Ce fichier (index)
├── QUICKSTART.md                    ← Démarrage rapide
├── INTEGRATION_GUIDE.md             ← Guide complet
├── API_REFERENCE.md                 ← Référence API
└── examples/                        ← Exemples de code
    ├── README.md
    ├── nodejs-example.js
    ├── php-example.php
    ├── python-example.py
    ├── server-example.js
    └── package.json
```

---

## 🎓 Parcours d'apprentissage recommandé

1. **Découverte (5 min)**
   - Lire ce fichier (EXTERNAL_INTEGRATION_SUMMARY.md)
   - Comprendre l'architecture

2. **Test rapide (10 min)**
   - Suivre QUICKSTART.md
   - Tester avec cURL ou le serveur de démo

3. **Intégration (30 min)**
   - Lire INTEGRATION_GUIDE.md (section de votre langage)
   - Copier l'exemple correspondant
   - Adapter à votre projet

4. **Maîtrise (optionnel)**
   - Consulter API_REFERENCE.md pour les détails
   - Implémenter les cas d'usage avancés
   - Gérer le renouvellement automatique des tokens

---

## ✅ Checklist d'intégration

- [ ] CDN démarré et accessible
- [ ] API Key récupérée
- [ ] Dépendances installées (axios/guzzle/httpx)
- [ ] Test d'upload réussi
- [ ] Test de création de token réussi
- [ ] URL générée fonctionne
- [ ] Intégration dans votre backend
- [ ] Frontend peut uploader via votre backend
- [ ] Gestion des erreurs implémentée
- [ ] Variables d'environnement configurées
- [ ] HTTPS configuré (production uniquement)

---

**Version** : 1.0.0  
**Créé le** : 1 Décembre 2025  
**Auteur** : CDN System

---

## 🚀 Commencer maintenant

```bash
# Option 1 : Serveur de démo (le plus rapide)
cd examples && npm install && npm start

# Option 2 : Test cURL (pour comprendre l'API)
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"

# Option 3 : Intégration directe (copier l'exemple de votre langage)
# Voir examples/nodejs-example.js
# Voir examples/php-example.php
# Voir examples/python-example.py
```

**Bon développement ! 🎉**
