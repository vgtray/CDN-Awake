# 🎉 Interface d'Administration Complète - CDN Management

## ✅ Ce qui a été créé

J'ai créé une **interface d'administration complète** pour gérer votre CDN via une interface web moderne et intuitive.

### 📁 Fichiers créés

1. **`admin-login.html`** - Page de connexion administrateur
2. **`admin-dashboard.html`** - Dashboard principal avec toutes les pages
3. **`admin-utils.js`** - Utilitaires JavaScript partagés (auth, API, formatage)
4. **`admin-dashboard.js`** - Logique JavaScript du dashboard
5. **`ADMIN_SETUP_GUIDE.md`** - Guide complet pour devenir admin

### 🎯 Fonctionnalités

#### 📊 Dashboard
- **Statistiques en temps réel** : Fichiers, taille totale, tokens actifs, téléchargements
- **Activité récente** : Dernières actions sur le système
- **Vue d'ensemble** complète de votre CDN

#### 📁 Gestion des Fichiers
- **Lister tous les fichiers** uploadés
- **Rechercher** des fichiers par nom
- **Voir détails** d'un fichier (tokens associés, stats)
- **Supprimer** des fichiers
- **Pagination** automatique

#### 🔑 Gestion des Tokens
- **Lister tous les tokens** d'accès
- **Créer de nouveaux tokens** avec paramètres personnalisés :
  - Choisir le fichier
  - Définir l'expiration (en heures)
  - Limiter le nombre de téléchargements
- **Révoquer des tokens** actifs
- **Copier les liens** de téléchargement en un clic
- **Voir le statut** : Valide, Expiré, Révoqué
- Filtrage et pagination

#### 📝 Logs et Monitoring
- **Logs d'accès détaillés** : Qui a accédé à quoi, quand
- **Filtrage** par action, IP, status code
- **Historique complet** avec pagination
- Visualisation des erreurs et succès

#### 👥 Gestion des Utilisateurs (Super Admin uniquement)
- **Créer** de nouveaux administrateurs
- **Modifier les rôles** : Admin ou Super Admin
- **Activer/Désactiver** des comptes
- **Supprimer** des utilisateurs
- Voir la **dernière connexion**

---

## 🚀 Comment Devenir Admin

### Option 1 : Via API (Recommandé)

Si **aucun admin n'existe encore**, utilisez l'endpoint de setup :

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

**Remplacez** :
- `VOTRE_API_KEY` par la valeur de `API_KEY` dans votre fichier `.env`
- Les autres valeurs selon vos préférences

### Option 2 : Via PowerShell (Windows)

```powershell
# Récupérer l'API key depuis .env
$apiKey = "mysecretkey"  # Remplacez par votre vraie API key

# Créer le premier admin
$body = @{
    username = "admin"
    email = "admin@example.com"
    password = "Admin123!Secure"
    setupKey = $apiKey
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8899/api/auth/setup" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Résultat attendu

```json
{
  "success": true,
  "message": "Admin account created successfully",
  "data": {
    "id": "uuid-generated",
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin"
  }
}
```

✅ Le premier admin est automatiquement **superadmin** !

---

## 🔐 Se Connecter

1. **Démarrez les services** :
   ```bash
   docker-compose up -d
   ```

2. **Accédez à la page de login** :
   ```
   http://localhost:8899/admin-login.html
   ```
   
   Ou cliquez sur **"🔐 Admin Panel"** depuis la page d'accueil

3. **Connectez-vous** avec vos identifiants

4. **Vous serez redirigé** vers le dashboard admin !

---

## 📱 Utilisation de l'Interface

### Navigation

Le menu latéral gauche contient :
- **📊 Dashboard** : Vue d'ensemble
- **📁 Fichiers** : Gérer les fichiers
- **🔑 Tokens** : Gérer les tokens d'accès
- **📝 Logs** : Consulter l'historique
- **👥 Utilisateurs** : Gérer les admins (superadmin uniquement)

### Créer un Token

1. Allez dans **🔑 Tokens**
2. Cliquez sur **"+ Créer Token"**
3. Remplissez le formulaire :
   - Sélectionnez un fichier
   - Définissez l'expiration (ex: 24 heures)
   - Limitez les téléchargements (ex: 1 pour usage unique)
4. Cliquez sur **"Créer"**
5. Le lien de téléchargement est automatiquement généré
6. Cliquez sur **📋** pour copier le lien complet

### Créer un Nouvel Admin (Superadmin uniquement)

1. Allez dans **👥 Utilisateurs**
2. Cliquez sur **"+ Créer Admin"**
3. Remplissez :
   - Nom d'utilisateur (lettres, chiffres, underscore)
   - Email
   - Mot de passe (min 8 caractères)
   - Rôle : **Admin** ou **Super Admin**
4. Cliquez sur **"Créer"**

### Supprimer un Fichier

1. Allez dans **📁 Fichiers**
2. Trouvez le fichier
3. Cliquez sur **🗑️**
4. Confirmez la suppression

⚠️ **Attention** : Cela supprime aussi tous les tokens associés !

---

## 🔧 Différences entre Admin et Super Admin

| Fonctionnalité | Admin | Super Admin |
|----------------|-------|-------------|
| Voir dashboard | ✅ | ✅ |
| Gérer fichiers | ✅ | ✅ |
| Créer/révoquer tokens | ✅ | ✅ |
| Consulter logs | ✅ | ✅ |
| **Gérer utilisateurs** | ❌ | ✅ |
| **Créer/supprimer admins** | ❌ | ✅ |
| **Modifier rôles** | ❌ | ✅ |

---

## 🔒 Sécurité

### Authentification
- **JWT tokens** : Expiration 15 minutes par défaut
- **Refresh tokens** : Valides 7 jours
- **Sessions** stockées en base de données
- **Déconnexion** : Révoque immédiatement la session

### Bonnes Pratiques
1. **Mot de passe fort** : Min 8 caractères
2. **HTTPS en production** : Toujours !
3. **Changez JWT_SECRET** dans `.env` avant déploiement
4. **Ne partagez jamais** votre API_KEY
5. **Consultez les logs** régulièrement

### Variables d'Environnement

Ajoutez dans votre `.env` :

```env
# API
API_KEY=votre-api-key-super-secrete-changez-moi

# JWT
JWT_SECRET=votre-jwt-secret-tres-long-et-complexe
JWT_EXPIRES_IN=15m

# Setup (optionnel)
ADMIN_SETUP_KEY=cle-unique-pour-setup-initial
```

---

## 🐛 Dépannage

### Impossible de se connecter

1. **Vérifiez que l'API fonctionne** :
   ```bash
   curl http://localhost:8899/health
   ```
   Doit retourner `{"status":"healthy",...}`

2. **Vérifiez les logs** :
   ```bash
   docker-compose logs api
   ```

3. **Redémarrez les services** :
   ```bash
   docker-compose restart
   ```

### "Admin already exists"

- Un admin existe déjà dans le système
- Utilisez la page de login normale
- Contactez un superadmin pour créer votre compte

### "Invalid setup key"

- Vérifiez la valeur de `API_KEY` dans `.env`
- La clé doit correspondre **exactement**

### Session expirée

- Les JWT expirent après 15 minutes
- Reconnectez-vous simplement

### Fichiers admin non accessibles

1. **Vérifiez les volumes** dans `docker-compose.yml` :
   ```yaml
   volumes:
     - ./admin-login.html:/usr/share/nginx/html/admin-login.html:ro
     - ./admin-dashboard.html:/usr/share/nginx/html/admin-dashboard.html:ro
     - ./admin-utils.js:/usr/share/nginx/html/admin-utils.js:ro
     - ./admin-dashboard.js:/usr/share/nginx/html/admin-dashboard.js:ro
   ```

2. **Redémarrez nginx** :
   ```bash
   docker-compose restart nginx
   ```

---

## 📊 Endpoints API Admin

Tous ces endpoints nécessitent un JWT valide dans le header :
```
Authorization: Bearer VOTRE_JWT_TOKEN
```

### Dashboard
- `GET /api/admin/dashboard` - Statistiques globales

### Fichiers
- `GET /api/admin/files` - Liste tous les fichiers
- `GET /api/admin/files/:id` - Détails d'un fichier
- `GET /api/admin/files?search=query` - Rechercher des fichiers

### Tokens
- `GET /api/admin/tokens` - Liste tous les tokens
- `POST /api/tokens` - Créer un token (body: `{fileId, expiresInHours, maxDownloads}`)
- `DELETE /api/tokens/:id` - Révoquer un token

### Logs
- `GET /api/admin/logs` - Logs d'accès
- `GET /api/admin/logs/activity` - Logs d'activité admin

### Utilisateurs (Superadmin)
- `GET /api/admin/users` - Liste tous les admins
- `POST /api/admin/users` - Créer un admin
- `PUT /api/admin/users/:id` - Modifier un admin
- `DELETE /api/admin/users/:id` - Supprimer un admin

---

## 🎨 Personnalisation

### Modifier les couleurs

Éditez `admin-dashboard.html` et changez le gradient :

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Modifier l'expiration JWT

Dans `.env` :
```env
JWT_EXPIRES_IN=30m  # 30 minutes au lieu de 15
```

### Modifier le nombre d'éléments par page

Dans `admin-dashboard.js`, changez `limit=20` dans les appels API.

---

## 📚 Fichiers du Projet

```
nginx-cdn/
├── admin-login.html          # Page de connexion
├── admin-dashboard.html      # Dashboard principal
├── admin-utils.js            # Utilitaires JS
├── admin-dashboard.js        # Logique dashboard
├── ADMIN_SETUP_GUIDE.md      # Guide détaillé
├── ADMIN_INTERFACE_GUIDE.md  # Ce fichier
├── index.html                # Page d'accueil (modifiée avec lien admin)
├── docker-compose.yml        # Configuration Docker (mise à jour)
└── api/
    └── src/
        ├── routes/
        │   ├── admin.js      # Routes admin (déjà existant)
        │   └── auth.js       # Routes auth (déjà existant)
        └── models/
            └── AdminUser.js  # Modèle admin (déjà existant)
```

---

## 🚀 Prochaines Étapes

1. **Démarrez Docker** :
   ```bash
   docker-compose up -d
   ```

2. **Créez votre premier admin** (voir section "Comment Devenir Admin")

3. **Connectez-vous** : http://localhost:8899/admin-login.html

4. **Explorez l'interface** !

5. **Créez d'autres admins** si nécessaire

---

## 💡 Astuces

- **Raccourci clavier** : Utilisez le lien "🔐 Admin Panel" en haut à droite de la page d'accueil
- **Copie rapide** : Cliquez sur 📋 à côté d'un token pour copier l'URL complète
- **Filtrage** : Utilisez la barre de recherche pour trouver rapidement des fichiers
- **Pagination** : Naviguez entre les pages avec "Précédent" / "Suivant"
- **Sessions** : Vous restez connecté 7 jours (refresh token)

---

## 📞 Support

En cas de problème :

1. Consultez `ADMIN_SETUP_GUIDE.md` pour plus de détails
2. Vérifiez les logs : `docker-compose logs -f`
3. Testez l'API : `curl http://localhost:8899/health`
4. Vérifiez la base de données :
   ```bash
   docker-compose exec postgres psql -U cdn_user -d cdn_db
   ```

---

**Créé le** : 30 Novembre 2025  
**Version** : 1.0.0  
**Interface complète et fonctionnelle** ✅
