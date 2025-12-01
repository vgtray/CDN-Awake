# 📦 CDN System - Documentation Complète

## 🎯 Introduction

Ce projet est un **système CDN complet** avec :
- 📤 Upload de fichiers sécurisé
- 🔐 Système de tokens d'accès temporaires
- 👨‍💼 Dashboard administrateur
- 🔗 API REST pour intégration externe
- 🐳 Déploiement Docker

---

## 🚀 Démarrage rapide

### 1. Lancer le CDN

```bash
cd nginx-cdn
docker compose up -d
```

### 2. Accéder au Dashboard Admin

```
URL      : http://localhost:8899/admin-dashboard.html
Email    : adam@vgtray.fr
Password : adam123456
```

### 3. Tester l'API

```bash
# Upload un fichier
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"
```

---

## 📚 Documentation disponible

### Pour les développeurs externes

| Fichier | Description | Niveau |
|---------|-------------|--------|
| **[EXTERNAL_INTEGRATION_SUMMARY.md](nginx-cdn/EXTERNAL_INTEGRATION_SUMMARY.md)** | 🎯 Point d'entrée principal | ⭐⭐⭐ |
| **[QUICKSTART.md](nginx-cdn/QUICKSTART.md)** | 🚀 Démarrage en 5 minutes | ⭐⭐⭐ |
| **[INTEGRATION_GUIDE.md](nginx-cdn/INTEGRATION_GUIDE.md)** | 📖 Guide complet d'intégration | ⭐⭐ |
| **[API_REFERENCE.md](nginx-cdn/API_REFERENCE.md)** | 📋 Référence technique complète | ⭐ |
| **[examples/](nginx-cdn/examples/)** | 💻 Code prêt à l'emploi | ⭐⭐⭐ |

### Pour les administrateurs

| Fichier | Description |
|---------|-------------|
| **[ADMIN_SETUP_GUIDE.md](nginx-cdn/ADMIN_SETUP_GUIDE.md)** | Guide de configuration admin |
| **[README.md](nginx-cdn/README.md)** | Documentation technique du projet |

---

## 🗂️ Structure du projet

```
cdnawake/
└── nginx-cdn/
    ├── 📄 EXTERNAL_INTEGRATION_SUMMARY.md  ← Commencer ICI pour l'intégration
    ├── 📄 QUICKSTART.md                     ← Guide rapide (5 min)
    ├── 📄 INTEGRATION_GUIDE.md              ← Guide complet
    ├── 📄 API_REFERENCE.md                  ← Référence API
    ├── 📄 ADMIN_SETUP_GUIDE.md              ← Configuration admin
    │
    ├── 📁 examples/                         ← Exemples de code
    │   ├── README.md
    │   ├── nodejs-example.js                ← Node.js/Express
    │   ├── php-example.php                  ← PHP/Laravel
    │   ├── python-example.py                ← Python/FastAPI/Django
    │   ├── server-example.js                ← Serveur web de démo
    │   └── package.json
    │
    ├── 📁 api/                              ← Backend Node.js
    │   ├── src/
    │   │   ├── routes/
    │   │   │   ├── admin.js                 ← Routes admin (JWT)
    │   │   │   ├── files.js                 ← Upload/download
    │   │   │   └── tokens.js                ← Gestion tokens
    │   │   ├── models/                      ← Modèles Sequelize
    │   │   └── middleware/                  ← Auth middleware
    │   └── uploads/                         ← Stockage fichiers
    │
    ├── 📁 database/                         ← Base de données
    │   └── init.sql                         ← Schéma PostgreSQL
    │
    ├── 📄 docker-compose.yml                ← Orchestration Docker
    ├── 📄 nginx.conf                        ← Configuration Nginx
    ├── 📄 admin-dashboard.html              ← Interface admin
    ├── 📄 admin-dashboard.js                ← Logique dashboard
    └── 📄 admin-utils.js                    ← Utilitaires admin
```

---

## 🎯 Pour qui est cette documentation ?

### 👨‍💻 Développeur externe (vous voulez intégrer le CDN)

**Commencez ici** :
1. **[EXTERNAL_INTEGRATION_SUMMARY.md](nginx-cdn/EXTERNAL_INTEGRATION_SUMMARY.md)** - Vue d'ensemble
2. **[QUICKSTART.md](nginx-cdn/QUICKSTART.md)** - Test rapide
3. **[examples/](nginx-cdn/examples/)** - Copier le code

**Workflow** :
```bash
# 1. Tester avec le serveur de démo
cd nginx-cdn/examples
npm install
npm start
# Ouvrir http://localhost:3001

# 2. Copier l'exemple de votre langage
# Node.js : examples/nodejs-example.js
# PHP     : examples/php-example.php
# Python  : examples/python-example.py

# 3. Adapter à votre projet
```

---

### 👨‍💼 Administrateur système (vous gérez le CDN)

**Commencez ici** :
1. **[ADMIN_SETUP_GUIDE.md](nginx-cdn/ADMIN_SETUP_GUIDE.md)** - Configuration
2. Dashboard : http://localhost:8899/admin-dashboard.html

**Tâches courantes** :
- Créer des comptes admin
- Gérer les fichiers et tokens
- Consulter les logs d'accès
- Surveiller l'utilisation

---

### 🛠️ Développeur du CDN (vous maintenez le code)

**Documentation technique** :
1. **[README.md](nginx-cdn/README.md)** - Architecture technique
2. Code source dans `api/src/`
3. Schéma BDD dans `database/init.sql`

---

## 🔗 Intégration en 3 étapes

### Étape 1 : Upload d'un fichier

```javascript
// Node.js
const formData = new FormData();
formData.append('file', fs.createReadStream('./photo.jpg'));

const response = await axios.post('http://localhost:8899/api/files/upload', formData, {
  headers: {
    'Authorization': 'Bearer mysecretkey',
    ...formData.getHeaders()
  }
});

const fileId = response.data.data.id;
```

### Étape 2 : Créer un token d'accès

```javascript
const tokenResponse = await axios.post('http://localhost:8899/api/tokens', {
  fileId: fileId,
  expiresInHours: 24,
  maxDownloads: 100
}, {
  headers: { 'Authorization': 'Bearer mysecretkey' }
});

const downloadUrl = tokenResponse.data.data.downloadUrl;
```

### Étape 3 : Utiliser l'URL

```javascript
const publicUrl = `http://localhost:8899${downloadUrl}`;

// Dans votre HTML
<img src="http://localhost:8899/download/abc123..." alt="Image">
```

---

## 🔐 Sécurité

### ⚠️ IMPORTANT : API Key

L'API Key (`mysecretkey`) est **sensible** et ne doit **JAMAIS** être exposée côté client.

**✅ CORRECT** :
```
Frontend → Votre Backend (avec auth utilisateur)
              ↓
           CDN API (avec API Key)
```

**❌ INCORRECT** :
```
Frontend → CDN API directement (API Key dans le code JS)
```

---

## 📊 Cas d'usage

### 1. Galerie d'images (affichage répété)

```javascript
// Token longue durée, beaucoup de téléchargements
const token = await createToken(fileId, 168, 10000); // 1 semaine, 10k vues
```

### 2. Téléchargement unique (fichier sensible)

```javascript
// Token court, 1 seul téléchargement
const token = await createToken(fileId, 1, 1); // 1h, 1 téléchargement
```

### 3. Vidéo streaming

```javascript
// Token très longue durée
const token = await createToken(videoId, 720, 999999); // 1 mois
```

```html
<video controls>
  <source src="http://localhost:8899/download/{token}" type="video/mp4">
</video>
```

---

## 🧪 Test de l'API

### Test 1 : Upload avec cURL

```bash
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"
```

### Test 2 : Serveur de démo

```bash
cd nginx-cdn/examples
npm install
npm start
# Ouvrir http://localhost:3001
```

### Test 3 : Dashboard admin

```
http://localhost:8899/admin-dashboard.html
Login : adam@vgtray.fr / adam123456
```

---

## 🐳 Gestion Docker

### Démarrer le CDN

```bash
cd nginx-cdn
docker compose up -d
```

### Arrêter le CDN

```bash
docker compose down
```

### Voir les logs

```bash
docker logs cdn-api      # API Node.js
docker logs cdn-nginx    # Nginx
docker logs cdn-postgres # PostgreSQL
```

### Rebuilder après modification

```bash
docker compose build api
docker compose up -d
```

---

## 📞 Support

### Logs et debugging

```bash
# Logs API
docker logs cdn-api -f

# Logs Nginx
docker logs cdn-nginx -f

# Logs PostgreSQL
docker logs cdn-postgres -f
```

### Dashboard admin

```
http://localhost:8899/admin-dashboard.html
```

Fonctionnalités :
- 📂 Gestion des fichiers
- 🔑 Gestion des tokens
- 📊 Statistiques d'utilisation
- 📋 Logs d'accès

### Health check

```bash
curl http://localhost:8899/health
```

---

## 🗺️ Roadmap de lecture

### Pour une intégration rapide (30 min)

1. **[EXTERNAL_INTEGRATION_SUMMARY.md](nginx-cdn/EXTERNAL_INTEGRATION_SUMMARY.md)** (5 min)
2. **[QUICKSTART.md](nginx-cdn/QUICKSTART.md)** (5 min)
3. Tester avec `examples/server-example.js` (10 min)
4. Copier l'exemple de votre langage (10 min)

### Pour une intégration complète (2h)

1. Lire **[INTEGRATION_GUIDE.md](nginx-cdn/INTEGRATION_GUIDE.md)** (30 min)
2. Consulter **[API_REFERENCE.md](nginx-cdn/API_REFERENCE.md)** (30 min)
3. Implémenter dans votre projet (1h)

### Pour la maîtrise complète (1 jour)

1. Lire toute la documentation
2. Tester tous les exemples
3. Implémenter les cas d'usage avancés
4. Configurer le renouvellement automatique des tokens
5. Mettre en production avec HTTPS

---

## ✅ Checklist de déploiement

### Development

- [x] Docker Compose lancé
- [x] Dashboard admin accessible
- [x] API fonctionnelle
- [x] Test d'upload réussi
- [x] Documentation complète

### Production (à faire)

- [ ] Configuration HTTPS
- [ ] API Key de production (forte)
- [ ] JWT Secret de production (fort)
- [ ] Limite de taille de fichier adaptée
- [ ] Backup de la base de données
- [ ] Monitoring et alertes
- [ ] CDN/cache (optionnel)

---

## 🎓 Ressources

### Documentation

| Fichier | Pour qui ? | Temps de lecture |
|---------|-----------|------------------|
| EXTERNAL_INTEGRATION_SUMMARY.md | Tous | 10 min |
| QUICKSTART.md | Développeurs | 5 min |
| INTEGRATION_GUIDE.md | Développeurs | 30 min |
| API_REFERENCE.md | Développeurs | 20 min |
| ADMIN_SETUP_GUIDE.md | Admins | 15 min |

### Exemples de code

| Fichier | Langage | Prêt à l'emploi |
|---------|---------|-----------------|
| examples/nodejs-example.js | JavaScript/Node.js | ✅ |
| examples/php-example.php | PHP/Laravel | ✅ |
| examples/python-example.py | Python/FastAPI | ✅ |
| examples/server-example.js | Express + UI | ✅ |

---

## 🚀 Démarrer maintenant

```bash
# Option 1 : Serveur de démo (recommandé pour tester)
cd nginx-cdn/examples
npm install
npm start
# Ouvrir http://localhost:3001

# Option 2 : Test API avec cURL
curl -X POST http://localhost:8899/api/files/upload \
  -H "Authorization: Bearer mysecretkey" \
  -F "file=@photo.jpg"

# Option 3 : Dashboard admin
# Ouvrir http://localhost:8899/admin-dashboard.html
# Login : adam@vgtray.fr / adam123456
```

---

**Version** : 1.0.0  
**Date de création** : 1 Décembre 2025  
**Dernière mise à jour** : 1 Décembre 2025

---

**Bon développement ! 🎉**
