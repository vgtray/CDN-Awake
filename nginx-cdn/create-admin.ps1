# Script PowerShell pour créer le premier administrateur
# CDN Management System - Admin Setup Script

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host " CDN Admin Setup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si l'API est accessible
Write-Host "🔍 Vérification de l'API..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8899/health" -Method Get -ErrorAction Stop
    if ($health.status -eq "healthy") {
        Write-Host "✅ API accessible et opérationnelle" -ForegroundColor Green
    } else {
        Write-Host "⚠️  API accessible mais statut: $($health.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur: Impossible de contacter l'API" -ForegroundColor Red
    Write-Host "   Assurez-vous que Docker est démarré et que l'API est en cours d'exécution:" -ForegroundColor Yellow
    Write-Host "   docker-compose up -d" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""

# Vérifier si un admin existe déjà
Write-Host "🔍 Vérification du setup..." -ForegroundColor Yellow
try {
    $setupCheck = Invoke-RestMethod -Uri "http://localhost:8899/api/auth/check-setup" -Method Get -ErrorAction Stop
    
    if ($setupCheck.needsSetup -eq $false) {
        Write-Host "ℹ️  Un administrateur existe déjà dans le système" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Options disponibles:" -ForegroundColor Cyan
        Write-Host "  1. Se connecter avec un compte existant: http://localhost:8899/admin-login.html"
        Write-Host "  2. Demander à un super admin de créer votre compte"
        Write-Host ""
        
        $continue = Read-Host "Voulez-vous quand même essayer de créer un admin? (o/N)"
        if ($continue -ne "o" -and $continue -ne "O") {
            Write-Host "Opération annulée." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "⚠️  Impossible de vérifier le statut du setup (continuons quand même)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Création d'un nouveau compte administrateur" -ForegroundColor Cyan
Write-Host ""

# Demander les informations
$username = Read-Host "Nom d'utilisateur (lettres, chiffres, underscore uniquement)"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Le nom d'utilisateur ne peut pas être vide" -ForegroundColor Red
    exit 1
}

$email = Read-Host "Email"
if ([string]::IsNullOrWhiteSpace($email) -or $email -notmatch "@") {
    Write-Host "❌ Email invalide" -ForegroundColor Red
    exit 1
}

$password = Read-Host "Mot de passe (min 8 caractères)" -AsSecureString
$passwordBSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($passwordBSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBSTR)

if ($passwordPlain.Length -lt 8) {
    Write-Host "❌ Le mot de passe doit contenir au moins 8 caractères" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔑 API Key / Setup Key" -ForegroundColor Cyan
Write-Host "   Cette clé doit correspondre à la variable API_KEY ou ADMIN_SETUP_KEY dans votre fichier .env" -ForegroundColor Gray
Write-Host ""

$apiKey = Read-Host "API Key / Setup Key"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "❌ La clé API ne peut pas être vide" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📤 Création du compte..." -ForegroundColor Yellow

# Préparer le body de la requête
$body = @{
    username = $username
    email = $email
    password = $passwordPlain
    setupKey = $apiKey
} | ConvertTo-Json

# Envoyer la requête
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8899/api/auth/setup" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "✅ SUCCÈS!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Compte administrateur créé avec succès:" -ForegroundColor Green
    Write-Host "  • Nom d'utilisateur: $($response.data.username)" -ForegroundColor Cyan
    Write-Host "  • Email: $($response.data.email)" -ForegroundColor Cyan
    Write-Host "  • Rôle: $($response.data.role)" -ForegroundColor Cyan
    Write-Host "  • ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎉 Vous pouvez maintenant vous connecter:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8899/admin-login.html" -ForegroundColor Cyan
    Write-Host ""
    
    # Demander si on veut ouvrir le navigateur
    $open = Read-Host "Voulez-vous ouvrir la page de connexion maintenant? (o/N)"
    if ($open -eq "o" -or $open -eq "O") {
        Start-Process "http://localhost:8899/admin-login.html"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERREUR lors de la création du compte" -ForegroundColor Red
    Write-Host ""
    
    $errorResponse = $_.ErrorDetails.Message
    if ($errorResponse) {
        try {
            $errorJson = $errorResponse | ConvertFrom-Json
            Write-Host "Message d'erreur: $($errorJson.message)" -ForegroundColor Yellow
            
            if ($errorJson.message -like "*setup key*") {
                Write-Host ""
                Write-Host "💡 Conseil:" -ForegroundColor Cyan
                Write-Host "   Vérifiez que la clé API correspond exactement à la valeur de" -ForegroundColor Gray
                Write-Host "   API_KEY ou ADMIN_SETUP_KEY dans votre fichier .env" -ForegroundColor Gray
            }
            
            if ($errorJson.message -like "*already exists*") {
                Write-Host ""
                Write-Host "💡 Conseil:" -ForegroundColor Cyan
                Write-Host "   Un administrateur existe déjà. Connectez-vous avec vos identifiants:" -ForegroundColor Gray
                Write-Host "   http://localhost:8899/admin-login.html" -ForegroundColor Cyan
            }
            
        } catch {
            Write-Host "Détails: $errorResponse" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Détails: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🔧 Vérifications à faire:" -ForegroundColor Yellow
    Write-Host "  1. L'API est-elle bien démarrée? docker-compose ps" -ForegroundColor Gray
    Write-Host "  2. La base de données est-elle accessible?" -ForegroundColor Gray
    Write-Host "  3. La clé API est-elle correcte?" -ForegroundColor Gray
    Write-Host "  4. Consultez les logs: docker-compose logs api" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Terminé!" -ForegroundColor Green
Write-Host ""
