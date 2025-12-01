/**
 * 🚀 Exemple de serveur Express avec intégration CDN
 * 
 * Installation :
 * npm install express multer axios form-data dotenv
 * 
 * Démarrage :
 * node server-example.js
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'temp/' });

// Configuration CDN
const CDN_URL = process.env.CDN_URL || 'http://localhost:8899/api';
const API_KEY = process.env.CDN_API_KEY || 'mysecretkey';

const cdnClient = axios.create({
  baseURL: CDN_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ========================================
// Routes
// ========================================

/**
 * Page d'accueil
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CDN Integration Demo</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
        .container {
          border: 2px solid #6366f1;
          border-radius: 10px;
          padding: 30px;
        }
        h1 {
          color: #6366f1;
        }
        .upload-form {
          margin: 20px 0;
        }
        input[type="file"] {
          display: block;
          margin: 10px 0;
        }
        button {
          background: #6366f1;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background: #4f46e5;
        }
        #result {
          margin-top: 20px;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 5px;
          display: none;
        }
        #preview {
          max-width: 100%;
          margin-top: 10px;
          border-radius: 5px;
        }
        .success {
          color: #10b981;
        }
        .error {
          color: #ef4444;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 CDN Integration Demo</h1>
        <p>Upload une image et obtenez une URL CDN sécurisée</p>
        
        <div class="upload-form">
          <form id="uploadForm">
            <label>
              <strong>Choisir un fichier :</strong><br>
              <input type="file" id="fileInput" accept="image/*" required>
            </label>
            <button type="submit">📤 Upload vers le CDN</button>
          </form>
        </div>
        
        <div id="result">
          <h3>Résultat :</h3>
          <div id="message"></div>
          <img id="preview" style="display: none;">
        </div>
      </div>

      <script>
        const form = document.getElementById('uploadForm');
        const result = document.getElementById('result');
        const message = document.getElementById('message');
        const preview = document.getElementById('preview');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const fileInput = document.getElementById('fileInput');
          const file = fileInput.files[0];
          
          if (!file) {
            alert('Choisissez un fichier !');
            return;
          }
          
          // Afficher le chargement
          message.innerHTML = '<p>⏳ Upload en cours...</p>';
          result.style.display = 'block';
          preview.style.display = 'none';
          
          try {
            // Upload via notre API
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
              message.innerHTML = \`
                <p class="success">✅ Fichier uploadé avec succès !</p>
                <p><strong>URL CDN :</strong></p>
                <input type="text" value="\${data.url}" readonly style="width: 100%; padding: 5px; margin: 10px 0;">
                <p><strong>File ID :</strong> \${data.fileId}</p>
                <p><strong>Token ID :</strong> \${data.tokenId}</p>
              \`;
              
              // Afficher l'aperçu
              preview.src = data.url;
              preview.style.display = 'block';
            } else {
              message.innerHTML = \`<p class="error">❌ Erreur : \${data.error}</p>\`;
            }
            
          } catch (error) {
            message.innerHTML = \`<p class="error">❌ Erreur : \${error.message}</p>\`;
          }
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * Upload une image vers le CDN
 */
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  console.log('📤 Requête d\'upload reçue');
  
  try {
    // Vérifier le fichier
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }
    
    console.log('📁 Fichier temporaire :', req.file.path);
    console.log('📝 Nom original :', req.file.originalname);
    
    // 1. Upload vers le CDN
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);
    formData.append('uploadedBy', 'demo-server');
    
    const uploadResponse = await cdnClient.post('/files/upload', formData, {
      headers: formData.getHeaders()
    });
    
    const fileData = uploadResponse.data.data;
    console.log('✅ Fichier uploadé au CDN :', fileData.id);
    
    // 2. Créer un token
    const tokenResponse = await cdnClient.post('/tokens', {
      fileId: fileData.id,
      expiresInHours: 48, // 48 heures
      maxDownloads: 1000  // 1000 téléchargements max
    });
    
    const tokenData = tokenResponse.data.data;
    console.log('✅ Token créé :', tokenData.token);
    
    // 3. Construire l'URL publique
    const publicUrl = `http://localhost:8899${tokenData.downloadUrl}`;
    
    // Nettoyer le fichier temporaire
    fs.unlinkSync(req.file.path);
    console.log('🗑️  Fichier temporaire supprimé\n');
    
    // Retourner le résultat
    res.json({
      success: true,
      url: publicUrl,
      fileId: fileData.id,
      tokenId: tokenData.id,
      fileName: fileData.originalName,
      fileSize: fileData.size,
      expiresAt: tokenData.expiresAt
    });
    
  } catch (error) {
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('❌ Erreur :', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Supprimer une image du CDN
 */
app.delete('/api/delete-image/:fileId', async (req, res) => {
  try {
    await cdnClient.delete(`/files/${req.params.fileId}`);
    
    res.json({
      success: true,
      message: 'Image supprimée du CDN'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Lister les fichiers du CDN
 */
app.get('/api/files', async (req, res) => {
  try {
    const response = await cdnClient.get('/files', {
      params: {
        page: req.query.page || 1,
        limit: req.query.limit || 20
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Démarrage du serveur
// ========================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 Serveur Express démarré !');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n  📍 URL : http://localhost:${PORT}`);
  console.log(`  🔗 CDN : ${CDN_URL}`);
  console.log(`  🔑 API Key : ${API_KEY.substring(0, 8)}...`);
  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('  💡 Ouvrez http://localhost:3001 dans votre navigateur');
  console.log('\n═══════════════════════════════════════════════════════\n');
});

// Créer le dossier temp s'il n'existe pas
if (!fs.existsSync('temp')) {
  fs.mkdirSync('temp');
}
