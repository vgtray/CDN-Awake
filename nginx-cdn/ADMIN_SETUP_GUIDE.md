# 🔐 Guide d'Administration CDN

## Comment devenir administrateur

### Méthode 1 : Setup Initial (Premier Admin)

Si **aucun administrateur n'existe encore** dans le système, vous pouvez créer le premier compte admin via l'endpoint de setup.

#### Étapes :

1. **Obtenez votre API Key** (définie dans le fichier `.env`)
   - Vérifiez la variable `API_KEY` ou `ADMIN_SETUP_KEY` dans votre fichier `.env`

2. **Créez le premier admin via API**

```bash
curl -X POST http://localhost:8899/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "VotreMotDePasseSecurise123!",
    "setupKey": "VOTRE_API_KEY_ICI"
  }'
```

**Remplacez** :
- `admin` par le nom d'utilisateur souhaité
- `admin@example.com` par votre email
- `VotreMotDePasseSecurise123!` par un mot de passe fort (min 8 caractères)
- `VOTRE_API_KEY_ICI` par la valeur de votre API_KEY du fichier `.env`

3. **Réponse attendue**

```json
{
  "success": true,
  "message": "Admin account created successfully",
  "data": {
    "id": "uuid-here",
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin"
  }
}
```

Le premier admin créé sera automatiquement **superadmin**.

### Méthode 2 : Via PowerShell (Windows)

```powershell
$apiKey = "VOTRE_API_KEY_ICI"
$body = @{
    username = "admin"
    email = "admin@example.com"
    password = "VotreMotDePasseSecurise123!"
    setupKey = $apiKey
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8899/api/auth/setup" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Méthode 3 : Directement en Base de Données (Avancé)

Si vous avez accès à la base de données PostgreSQL :

```sql
-- Connectez-vous à PostgreSQL
psql -U postgres -d cdn_db

-- Créez un admin manuellement (remplacez les valeurs)
INSERT INTO admin_users (
    id, 
    username, 
    email, 
    password_hash, 
    role, 
    is_active
) VALUES (
    gen_random_uuid(),
    'admin',
    'admin@example.com',
    -- Hash bcrypt pour "password123" - CHANGEZ-LE !
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lWAkNvP0vszu',
    'superadmin',
    true
);
```

⚠️ **IMPORTANT** : Ne jamais utiliser ce mot de passe en production ! Générez un hash bcrypt approprié.

### Pour générer un hash bcrypt :

```javascript
// Node.js
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('VotreMotDePasse', 12);
console.log(hash);
```

Ou utilisez un outil en ligne (attention aux mots de passe sensibles) : https://bcrypt-generator.com/

---

## Connexion à l'interface Admin

Une fois votre compte créé :

1. **Accédez à la page de login**
   ```
   http://localhost:8899/admin-login.html
   ```

2. **Connectez-vous** avec vos identifiants

3. **Vous serez redirigé vers le dashboard**
   ```
   http://localhost:8899/admin-dashboard.html
   ```

---

## Créer d'autres administrateurs

Une fois connecté en tant que **superadmin**, vous pouvez créer d'autres comptes admin via l'interface :

1. Allez dans **Dashboard Admin** → **Utilisateurs** (icône 👥)
2. Cliquez sur **+ Créer Admin**
3. Remplissez le formulaire :
   - Nom d'utilisateur (lettres, chiffres, underscore uniquement)
   - Email
   - Mot de passe (min 8 caractères)
   - Rôle : **Admin** ou **Super Admin**
4. Cliquez sur **Créer**

### Différence entre Admin et Super Admin

| Fonctionnalité | Admin | Super Admin |
|----------------|-------|-------------|
| Voir dashboard | ✅ | ✅ |
| Gérer fichiers | ✅ | ✅ |
| Gérer tokens | ✅ | ✅ |
| Voir logs | ✅ | ✅ |
| **Gérer utilisateurs** | ❌ | ✅ |
| **Créer/Supprimer admins** | ❌ | ✅ |

---

## Via API (pour automation)

### Créer un nouvel admin (en tant que superadmin)

```bash
curl -X POST http://localhost:8899/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN" \
  -d '{
    "username": "nouvel_admin",
    "email": "admin2@example.com",
    "password": "MotDePasseSecurise123!",
    "role": "admin"
  }'
```

### Lister tous les admins

```bash
curl -X GET http://localhost:8899/api/admin/users \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN"
```

### Désactiver un admin

```bash
curl -X PUT http://localhost:8899/api/admin/users/{USER_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN" \
  -d '{
    "isActive": false
  }'
```

### Supprimer un admin

```bash
curl -X DELETE http://localhost:8899/api/admin/users/{USER_ID} \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN"
```

---

## Fonctionnalités de l'interface Admin

### 📊 Dashboard
- Statistiques en temps réel (fichiers, taille totale, tokens, téléchargements)
- Activité récente du système
- Vue d'ensemble complète

### 📁 Gestion des Fichiers
- Liste tous les fichiers uploadés
- Recherche de fichiers
- Voir détails d'un fichier (tokens associés, statistiques)
- Supprimer des fichiers
- Pagination

### 🔑 Gestion des Tokens
- Liste tous les tokens d'accès
- Créer de nouveaux tokens
- Révoquer des tokens
- Copier les liens de téléchargement
- Voir le statut (valide, expiré, révoqué)
- Filtrage et pagination

### 📝 Logs
- Logs d'accès détaillés
- Filtrage par action, IP, status
- Historique complet
- Pagination

### 👥 Gestion des Utilisateurs (Super Admin uniquement)
- Créer de nouveaux administrateurs
- Modifier les rôles
- Activer/Désactiver des comptes
- Supprimer des utilisateurs
- Voir la dernière connexion

---

## Sécurité

### Bonnes pratiques :

1. **Mot de passe fort** : Minimum 8 caractères, avec majuscules, minuscules, chiffres et symboles
2. **JWT Secret** : Changez `JWT_SECRET` dans le fichier `.env` en production
3. **API Key** : Ne partagez jamais votre API_KEY
4. **HTTPS** : Utilisez toujours HTTPS en production
5. **Rotation des tokens** : Les JWT expirent après 15 minutes par défaut
6. **Refresh tokens** : Valides 7 jours, stockés dans admin_sessions
7. **Logs d'activité** : Tous les actions admin sont loggées dans `admin_activity_logs`

### En cas de compromission :

```bash
# Révoquer toutes les sessions d'un utilisateur
curl -X POST http://localhost:8899/api/admin/cleanup/sessions \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN"
```

---

## Dépannage

### "Admin already exists"
- Le setup initial a déjà été fait
- Utilisez la page de login normale avec vos identifiants existants
- Ou contactez un super admin pour créer votre compte

### "Invalid setup key"
- Vérifiez que vous utilisez la bonne API_KEY du fichier `.env`
- La clé doit correspondre exactement à `API_KEY` ou `ADMIN_SETUP_KEY`

### "Session expired"
- Votre JWT a expiré (15 minutes par défaut)
- Reconnectez-vous pour obtenir un nouveau token

### Impossible de se connecter
- Vérifiez que l'API est bien démarrée : http://localhost:8899/health
- Vérifiez que la base de données est accessible
- Consultez les logs du conteneur API

---

## Variables d'environnement importantes

```env
# Authentification
API_KEY=votre-api-key-secrete
JWT_SECRET=votre-jwt-secret-change-en-production
JWT_EXPIRES_IN=15m

# Setup initial (optionnel, sinon utilise API_KEY)
ADMIN_SETUP_KEY=votre-setup-key-unique
```

---

## Support

Pour toute question ou problème :
1. Consultez les logs : `docker-compose logs api`
2. Vérifiez la base de données : `docker-compose exec postgres psql -U postgres -d cdn_db`
3. Testez l'API : `curl http://localhost:8899/health`

---

**Créé le** : 30 Novembre 2025
**Version** : 1.0.0
