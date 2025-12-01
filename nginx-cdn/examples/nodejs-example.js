/**
 * 🚀 CDN Integration - Node.js Example
 * 
 * Installation :
 * npm install axios form-data
 * 
 * Configuration :
 * Créer un fichier .env avec :
 * CDN_URL=http://localhost:8899/api
 * CDN_API_KEY=mysecretkey
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

// Configuration
const CDN_URL = process.env.CDN_URL || 'http://localhost:8899/api';
const API_KEY = process.env.CDN_API_KEY || 'mysecretkey';

// Client HTTP configuré
const cdnClient = axios.create({
  baseURL: CDN_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  },
  timeout: 30000 // 30 secondes
});

// ========================================
// 1. Upload d'un fichier
// ========================================
async function uploadFile(filePath, uploadedBy = 'nodejs-app') {
  console.log(`📤 Upload du fichier : ${filePath}`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('uploadedBy', uploadedBy);

  try {
    const response = await cdnClient.post('/files/upload', formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    const file = response.data.data;
    console.log('✅ Fichier uploadé avec succès !');
    console.log(`   ID        : ${file.id}`);
    console.log(`   Nom       : ${file.originalName}`);
    console.log(`   Taille    : ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`   Type      : ${file.mimeType}`);
    
    return file;
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 2. Créer un token d'accès
// ========================================
async function createToken(fileId, expiresInHours = 24, maxDownloads = 1) {
  console.log(`🔑 Création d'un token pour le fichier ${fileId}`);
  
  try {
    const response = await cdnClient.post('/tokens', {
      fileId,
      expiresInHours,
      maxDownloads
    });
    
    const token = response.data.data;
    console.log('✅ Token créé avec succès !');
    console.log(`   Token     : ${token.token}`);
    console.log(`   Expire le : ${new Date(token.expiresAt).toLocaleString('fr-FR')}`);
    console.log(`   Limite    : ${token.maxDownloads} téléchargements`);
    console.log(`   URL       : http://localhost:8899${token.downloadUrl}`);
    
    return token;
  } catch (error) {
    console.error('❌ Erreur lors de la création du token :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 3. Lister les fichiers
// ========================================
async function listFiles(page = 1, limit = 10) {
  console.log(`📋 Liste des fichiers (page ${page})`);
  
  try {
    const response = await cdnClient.get('/files', {
      params: { page, limit, sortBy: 'createdAt', sortOrder: 'desc' }
    });
    
    const { data, pagination } = response.data;
    
    console.log(`✅ ${data.length} fichier(s) trouvé(s) (total: ${pagination.total})`);
    data.forEach((file, index) => {
      console.log(`\n   ${index + 1}. ${file.originalName}`);
      console.log(`      ID      : ${file.id}`);
      console.log(`      Taille  : ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`      Type    : ${file.mimeType}`);
      console.log(`      Créé le : ${new Date(file.createdAt).toLocaleString('fr-FR')}`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des fichiers :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 4. Supprimer un fichier
// ========================================
async function deleteFile(fileId) {
  console.log(`🗑️  Suppression du fichier ${fileId}`);
  
  try {
    const response = await cdnClient.delete(`/files/${fileId}`);
    
    console.log('✅ Fichier supprimé avec succès !');
    console.log(`   Nom : ${response.data.data.originalName}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 5. Révoquer un token
// ========================================
async function revokeToken(tokenId) {
  console.log(`❌ Révocation du token ${tokenId}`);
  
  try {
    await cdnClient.delete(`/tokens/${tokenId}`);
    
    console.log('✅ Token révoqué avec succès !');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la révocation :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 6. Télécharger un fichier (via token)
// ========================================
async function downloadFile(token, outputPath) {
  console.log(`📥 Téléchargement du fichier via token`);
  
  try {
    const response = await axios.get(`http://localhost:8899/download/${token}`, {
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Fichier téléchargé : ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement :', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// 7. Workflow complet : Upload + Token
// ========================================
async function uploadAndGetUrl(filePath, expiresInHours = 24, maxDownloads = 100) {
  console.log('\n🔄 Workflow complet : Upload + Création de token\n');
  
  try {
    // 1. Upload
    const file = await uploadFile(filePath);
    console.log('');
    
    // 2. Créer token
    const token = await createToken(file.id, expiresInHours, maxDownloads);
    console.log('');
    
    // 3. URL publique
    const publicUrl = `http://localhost:8899${token.downloadUrl}`;
    
    console.log('🎉 Workflow terminé avec succès !');
    console.log(`\n📎 URL publique à utiliser :`);
    console.log(`   ${publicUrl}`);
    console.log(`\n💡 Exemple HTML :`);
    console.log(`   <img src="${publicUrl}" alt="${file.originalName}">`);
    
    return {
      file,
      token,
      publicUrl
    };
  } catch (error) {
    console.error('❌ Échec du workflow :', error.message);
    throw error;
  }
}

// ========================================
// 8. Exemple d'utilisation avec Express
// ========================================
function setupExpressExample() {
  const express = require('express');
  const multer = require('multer');
  const upload = multer({ dest: 'temp/' });
  
  const app = express();
  
  // Route pour upload depuis votre site
  app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
      // Upload vers le CDN
      const result = await uploadAndGetUrl(req.file.path, 48, 1000); // 48h, 1000 vues
      
      // Nettoyer le fichier temporaire
      fs.unlinkSync(req.file.path);
      
      // Retourner l'URL au client
      res.json({
        success: true,
        url: result.publicUrl,
        fileId: result.file.id,
        tokenId: result.token.id
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Route pour supprimer une image
  app.delete('/api/delete-image/:fileId', async (req, res) => {
    try {
      await deleteFile(req.params.fileId);
      
      res.json({
        success: true,
        message: 'Image supprimée'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  app.listen(3001, () => {
    console.log('🚀 Serveur Express démarré sur http://localhost:3001');
  });
}

// ========================================
// 🎯 Exemples d'exécution
// ========================================

async function runExamples() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📦 CDN Integration - Exemples d\'utilisation');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Exemple 1 : Upload + Token (workflow complet)
    console.log('📌 Exemple 1 : Upload d\'un fichier et création de token\n');
    const result = await uploadAndGetUrl('./test-image.jpg', 24, 100);
    
    console.log('\n' + '─'.repeat(55) + '\n');
    
    // Exemple 2 : Lister les fichiers
    console.log('📌 Exemple 2 : Liste des fichiers\n');
    await listFiles(1, 5);
    
    console.log('\n' + '─'.repeat(55) + '\n');
    
    // Exemple 3 : Télécharger un fichier
    console.log('📌 Exemple 3 : Téléchargement via token\n');
    await downloadFile(result.token.token, './downloaded-image.jpg');
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ Tous les exemples ont été exécutés avec succès !');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n⚠️  Une erreur s\'est produite :', error.message);
    process.exit(1);
  }
}

// ========================================
// 🚀 Point d'entrée
// ========================================

// Décommenter pour exécuter les exemples
// runExamples();

// Décommenter pour démarrer le serveur Express
// setupExpressExample();

// Exporter les fonctions
module.exports = {
  uploadFile,
  createToken,
  listFiles,
  deleteFile,
  revokeToken,
  downloadFile,
  uploadAndGetUrl
};
