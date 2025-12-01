<?php

/**
 * 🚀 CDN Integration - PHP Example
 * 
 * Installation :
 * composer require guzzlehttp/guzzle
 * 
 * Configuration :
 * Créer un fichier .env avec :
 * CDN_URL=http://localhost:8899/api
 * CDN_API_KEY=mysecretkey
 */

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Http\UploadedFile;

class CdnService
{
    private $client;
    private $baseUrl;
    private $apiKey;
    
    public function __construct()
    {
        $this->baseUrl = env('CDN_URL', 'http://localhost:8899/api');
        $this->apiKey = env('CDN_API_KEY', 'mysecretkey');
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30.0,
            'headers' => [
                'Authorization' => "Bearer {$this->apiKey}",
                'Accept' => 'application/json'
            ]
        ]);
    }
    
    // ========================================
    // 1. Upload d'un fichier
    // ========================================
    
    /**
     * Upload un fichier vers le CDN
     * 
     * @param UploadedFile|string $file Fichier Laravel ou chemin vers fichier
     * @param string $uploadedBy Identifiant de l'application
     * @return array Données du fichier uploadé
     * @throws \Exception
     */
    public function uploadFile($file, string $uploadedBy = 'php-app')
    {
        try {
            $multipart = [
                [
                    'name' => 'uploadedBy',
                    'contents' => $uploadedBy
                ]
            ];
            
            // Déterminer si c'est un UploadedFile Laravel ou un chemin
            if ($file instanceof UploadedFile) {
                $multipart[] = [
                    'name' => 'file',
                    'contents' => fopen($file->getRealPath(), 'r'),
                    'filename' => $file->getClientOriginalName()
                ];
            } else {
                $multipart[] = [
                    'name' => 'file',
                    'contents' => fopen($file, 'r'),
                    'filename' => basename($file)
                ];
            }
            
            $response = $this->client->post('/files/upload', [
                'multipart' => $multipart
            ]);
            
            $data = json_decode($response->getBody(), true);
            
            echo "✅ Fichier uploadé : {$data['data']['originalName']}\n";
            echo "   ID : {$data['data']['id']}\n";
            echo "   Taille : " . round($data['data']['size'] / 1024, 2) . " KB\n\n";
            
            return $data['data'];
            
        } catch (RequestException $e) {
            $error = $e->hasResponse() 
                ? json_decode($e->getResponse()->getBody(), true) 
                : ['error' => $e->getMessage()];
            
            throw new \Exception("Upload failed: " . ($error['error'] ?? $e->getMessage()));
        }
    }
    
    // ========================================
    // 2. Créer un token d'accès
    // ========================================
    
    /**
     * Créer un token d'accès pour un fichier
     * 
     * @param string $fileId UUID du fichier
     * @param int $expiresInHours Durée de validité en heures
     * @param int $maxDownloads Nombre max de téléchargements
     * @return array Données du token
     * @throws \Exception
     */
    public function createToken(string $fileId, int $expiresInHours = 24, int $maxDownloads = 1)
    {
        try {
            $response = $this->client->post('/tokens', [
                'json' => [
                    'fileId' => $fileId,
                    'expiresInHours' => $expiresInHours,
                    'maxDownloads' => $maxDownloads
                ]
            ]);
            
            $data = json_decode($response->getBody(), true);
            
            echo "✅ Token créé\n";
            echo "   Token : {$data['data']['token']}\n";
            echo "   Expire le : {$data['data']['expiresAt']}\n";
            echo "   URL : http://localhost:8899{$data['data']['downloadUrl']}\n\n";
            
            return $data['data'];
            
        } catch (RequestException $e) {
            $error = $e->hasResponse() 
                ? json_decode($e->getResponse()->getBody(), true) 
                : ['error' => $e->getMessage()];
            
            throw new \Exception("Token creation failed: " . ($error['error'] ?? $e->getMessage()));
        }
    }
    
    // ========================================
    // 3. Lister les fichiers
    // ========================================
    
    /**
     * Récupérer la liste des fichiers
     * 
     * @param int $page Numéro de page
     * @param int $limit Nombre de résultats par page
     * @return array Liste des fichiers et pagination
     * @throws \Exception
     */
    public function listFiles(int $page = 1, int $limit = 20)
    {
        try {
            $response = $this->client->get('/files', [
                'query' => [
                    'page' => $page,
                    'limit' => $limit,
                    'sortBy' => 'createdAt',
                    'sortOrder' => 'desc'
                ]
            ]);
            
            $data = json_decode($response->getBody(), true);
            
            echo "📋 {$data['pagination']['total']} fichier(s) trouvé(s)\n\n";
            
            foreach ($data['data'] as $index => $file) {
                echo ($index + 1) . ". {$file['originalName']}\n";
                echo "   ID : {$file['id']}\n";
                echo "   Taille : " . round($file['size'] / 1024, 2) . " KB\n\n";
            }
            
            return $data;
            
        } catch (RequestException $e) {
            throw new \Exception("Failed to list files: " . $e->getMessage());
        }
    }
    
    // ========================================
    // 4. Supprimer un fichier
    // ========================================
    
    /**
     * Supprimer un fichier du CDN
     * 
     * @param string $fileId UUID du fichier
     * @return bool
     * @throws \Exception
     */
    public function deleteFile(string $fileId)
    {
        try {
            $response = $this->client->delete("/files/{$fileId}");
            
            $data = json_decode($response->getBody(), true);
            
            echo "✅ Fichier supprimé : {$data['data']['originalName']}\n\n";
            
            return true;
            
        } catch (RequestException $e) {
            $error = $e->hasResponse() 
                ? json_decode($e->getResponse()->getBody(), true) 
                : ['error' => $e->getMessage()];
            
            throw new \Exception("Delete failed: " . ($error['error'] ?? $e->getMessage()));
        }
    }
    
    // ========================================
    // 5. Révoquer un token
    // ========================================
    
    /**
     * Révoquer un token d'accès
     * 
     * @param string $tokenId UUID du token
     * @return bool
     * @throws \Exception
     */
    public function revokeToken(string $tokenId)
    {
        try {
            $this->client->delete("/tokens/{$tokenId}");
            
            echo "✅ Token révoqué : {$tokenId}\n\n";
            
            return true;
            
        } catch (RequestException $e) {
            throw new \Exception("Token revocation failed: " . $e->getMessage());
        }
    }
    
    // ========================================
    // 6. Télécharger un fichier
    // ========================================
    
    /**
     * Télécharger un fichier via token
     * 
     * @param string $token Token d'accès
     * @param string $outputPath Chemin de destination
     * @return string Chemin du fichier téléchargé
     * @throws \Exception
     */
    public function downloadFile(string $token, string $outputPath)
    {
        try {
            $client = new Client(); // Nouveau client sans auth
            
            $response = $client->get("http://localhost:8899/download/{$token}", [
                'sink' => $outputPath
            ]);
            
            echo "✅ Fichier téléchargé : {$outputPath}\n\n";
            
            return $outputPath;
            
        } catch (RequestException $e) {
            throw new \Exception("Download failed: " . $e->getMessage());
        }
    }
    
    // ========================================
    // 7. Workflow complet
    // ========================================
    
    /**
     * Upload un fichier et créer un token (workflow complet)
     * 
     * @param UploadedFile|string $file
     * @param int $expiresInHours
     * @param int $maxDownloads
     * @return array
     * @throws \Exception
     */
    public function uploadAndGetUrl($file, int $expiresInHours = 24, int $maxDownloads = 100)
    {
        echo "🔄 Workflow complet : Upload + Token\n\n";
        
        // 1. Upload
        $fileData = $this->uploadFile($file);
        
        // 2. Créer token
        $tokenData = $this->createToken($fileData['id'], $expiresInHours, $maxDownloads);
        
        // 3. Construire URL publique
        $publicUrl = "http://localhost:8899{$tokenData['downloadUrl']}";
        
        echo "🎉 Workflow terminé !\n";
        echo "📎 URL publique : {$publicUrl}\n\n";
        
        return [
            'file' => $fileData,
            'token' => $tokenData,
            'url' => $publicUrl
        ];
    }
}

// ========================================
// 🎯 Exemples d'utilisation
// ========================================

// Exemple 1 : Utilisation standalone (sans Laravel)
function standaloneExample()
{
    require_once __DIR__ . '/../vendor/autoload.php';
    
    $cdn = new CdnService();
    
    // Upload + Token
    $result = $cdn->uploadAndGetUrl('./test-image.jpg', 48, 1000);
    
    echo "Utilisez cette URL dans votre HTML :\n";
    echo "<img src=\"{$result['url']}\" alt=\"Image\">\n\n";
    
    // Lister les fichiers
    $cdn->listFiles(1, 10);
}

// Exemple 2 : Contrôleur Laravel
class ImageController extends Controller
{
    private $cdn;
    
    public function __construct(CdnService $cdn)
    {
        $this->cdn = $cdn;
    }
    
    /**
     * Upload une image depuis un formulaire
     */
    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240' // 10 MB max
        ]);
        
        try {
            // Upload vers le CDN
            $result = $this->cdn->uploadAndGetUrl(
                $request->file('image'),
                expiresInHours: 168, // 1 semaine
                maxDownloads: 1000
            );
            
            // Sauvegarder dans votre BDD
            $post = Post::create([
                'title' => $request->title,
                'content' => $request->content,
                'image_url' => $result['url'],
                'cdn_file_id' => $result['file']['id'],
                'cdn_token_id' => $result['token']['id']
            ]);
            
            return response()->json([
                'success' => true,
                'post' => $post,
                'image_url' => $result['url']
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Supprimer une image
     */
    public function destroy(Post $post)
    {
        try {
            // Supprimer du CDN
            if ($post->cdn_file_id) {
                $this->cdn->deleteFile($post->cdn_file_id);
            }
            
            // Supprimer de la BDD
            $post->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Post et image supprimés'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Renouveler un token expiré
     */
    public function renewToken(Post $post)
    {
        try {
            // Révoquer l'ancien token
            if ($post->cdn_token_id) {
                $this->cdn->revokeToken($post->cdn_token_id);
            }
            
            // Créer un nouveau token
            $newToken = $this->cdn->createToken(
                $post->cdn_file_id,
                expiresInHours: 168,
                maxDownloads: 1000
            );
            
            // Mettre à jour la BDD
            $post->update([
                'image_url' => "http://localhost:8899{$newToken['downloadUrl']}",
                'cdn_token_id' => $newToken['id']
            ]);
            
            return response()->json([
                'success' => true,
                'new_url' => $post->image_url
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

// Exemple 3 : API Route (Laravel)
// routes/api.php
/*
use App\Http\Controllers\ImageController;

Route::middleware('auth:api')->group(function () {
    Route::post('/images', [ImageController::class, 'store']);
    Route::delete('/images/{post}', [ImageController::class, 'destroy']);
    Route::post('/images/{post}/renew-token', [ImageController::class, 'renewToken']);
});
*/

// Exemple 4 : Commande Artisan pour nettoyer les vieux fichiers
class CleanCdnCommand extends Command
{
    protected $signature = 'cdn:clean';
    protected $description = 'Supprimer les fichiers CDN non utilisés';
    
    public function handle(CdnService $cdn)
    {
        // Récupérer les posts avec des fichiers CDN
        $usedFileIds = Post::whereNotNull('cdn_file_id')
            ->pluck('cdn_file_id')
            ->toArray();
        
        // Lister tous les fichiers du CDN
        $allFiles = $cdn->listFiles(1, 1000);
        
        $deletedCount = 0;
        
        foreach ($allFiles['data'] as $file) {
            // Si le fichier n'est pas utilisé, le supprimer
            if (!in_array($file['id'], $usedFileIds)) {
                $cdn->deleteFile($file['id']);
                $deletedCount++;
                $this->info("Supprimé : {$file['originalName']}");
            }
        }
        
        $this->info("\n✅ {$deletedCount} fichier(s) supprimé(s)");
    }
}

// ========================================
// 🚀 Exécution
// ========================================

// Décommenter pour tester
// standaloneExample();
