"""
🚀 CDN Integration - Python Example

Installation :
pip install httpx python-dotenv

Configuration :
Créer un fichier .env avec :
CDN_URL=http://localhost:8899/api
CDN_API_KEY=mysecretkey
"""

import httpx
import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Configuration
CDN_URL = os.getenv('CDN_URL', 'http://localhost:8899/api')
API_KEY = os.getenv('CDN_API_KEY', 'mysecretkey')

# ========================================
# CDN Service Class
# ========================================

class CDNService:
    """Service pour interagir avec l'API CDN"""
    
    def __init__(self, base_url: str = CDN_URL, api_key: str = API_KEY):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'Authorization': f'Bearer {api_key}'
        }
    
    # ========================================
    # 1. Upload d'un fichier
    # ========================================
    
    async def upload_file(self, file_path: str, uploaded_by: str = 'python-app') -> Dict[str, Any]:
        """
        Upload un fichier vers le CDN
        
        Args:
            file_path: Chemin vers le fichier à uploader
            uploaded_by: Identifiant de l'application
            
        Returns:
            Données du fichier uploadé
        """
        print(f"📤 Upload du fichier : {file_path}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(file_path, 'rb') as f:
                    files = {'file': (Path(file_path).name, f)}
                    data = {'uploadedBy': uploaded_by}
                    
                    response = await client.post(
                        f'{self.base_url}/files/upload',
                        headers=self.headers,
                        files=files,
                        data=data
                    )
                    response.raise_for_status()
                    
                    result = response.json()['data']
                    
                    print(f"✅ Fichier uploadé avec succès !")
                    print(f"   ID        : {result['id']}")
                    print(f"   Nom       : {result['originalName']}")
                    print(f"   Taille    : {result['size'] / 1024:.2f} KB")
                    print(f"   Type      : {result['mimeType']}\n")
                    
                    return result
                    
        except httpx.HTTPStatusError as e:
            error_msg = e.response.json().get('error', str(e))
            raise Exception(f"Upload failed: {error_msg}")
        except Exception as e:
            raise Exception(f"Upload failed: {str(e)}")
    
    # ========================================
    # 2. Créer un token d'accès
    # ========================================
    
    async def create_token(
        self, 
        file_id: str, 
        expires_in_hours: int = 24, 
        max_downloads: int = 1
    ) -> Dict[str, Any]:
        """
        Créer un token d'accès pour un fichier
        
        Args:
            file_id: UUID du fichier
            expires_in_hours: Durée de validité en heures
            max_downloads: Nombre max de téléchargements
            
        Returns:
            Données du token
        """
        print(f"🔑 Création d'un token pour le fichier {file_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f'{self.base_url}/tokens',
                    headers=self.headers,
                    json={
                        'fileId': file_id,
                        'expiresInHours': expires_in_hours,
                        'maxDownloads': max_downloads
                    }
                )
                response.raise_for_status()
                
                result = response.json()['data']
                
                print(f"✅ Token créé avec succès !")
                print(f"   Token     : {result['token']}")
                print(f"   Expire le : {result['expiresAt']}")
                print(f"   Limite    : {result['maxDownloads']} téléchargements")
                print(f"   URL       : http://localhost:8899{result['downloadUrl']}\n")
                
                return result
                
        except httpx.HTTPStatusError as e:
            error_msg = e.response.json().get('error', str(e))
            raise Exception(f"Token creation failed: {error_msg}")
        except Exception as e:
            raise Exception(f"Token creation failed: {str(e)}")
    
    # ========================================
    # 3. Lister les fichiers
    # ========================================
    
    async def list_files(
        self, 
        page: int = 1, 
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Récupérer la liste des fichiers
        
        Args:
            page: Numéro de page
            limit: Nombre de résultats par page
            
        Returns:
            Liste des fichiers et pagination
        """
        print(f"📋 Liste des fichiers (page {page})")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f'{self.base_url}/files',
                    headers=self.headers,
                    params={
                        'page': page,
                        'limit': limit,
                        'sortBy': 'createdAt',
                        'sortOrder': 'desc'
                    }
                )
                response.raise_for_status()
                
                result = response.json()
                
                print(f"✅ {len(result['data'])} fichier(s) trouvé(s) (total: {result['pagination']['total']})\n")
                
                for index, file in enumerate(result['data'], 1):
                    print(f"   {index}. {file['originalName']}")
                    print(f"      ID      : {file['id']}")
                    print(f"      Taille  : {file['size'] / 1024:.2f} KB")
                    print(f"      Type    : {file['mimeType']}\n")
                
                return result
                
        except Exception as e:
            raise Exception(f"Failed to list files: {str(e)}")
    
    # ========================================
    # 4. Supprimer un fichier
    # ========================================
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Supprimer un fichier du CDN
        
        Args:
            file_id: UUID du fichier
            
        Returns:
            True si suppression réussie
        """
        print(f"🗑️  Suppression du fichier {file_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f'{self.base_url}/files/{file_id}',
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()['data']
                
                print(f"✅ Fichier supprimé : {result['originalName']}\n")
                
                return True
                
        except Exception as e:
            raise Exception(f"Delete failed: {str(e)}")
    
    # ========================================
    # 5. Révoquer un token
    # ========================================
    
    async def revoke_token(self, token_id: str) -> bool:
        """
        Révoquer un token d'accès
        
        Args:
            token_id: UUID du token
            
        Returns:
            True si révocation réussie
        """
        print(f"❌ Révocation du token {token_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f'{self.base_url}/tokens/{token_id}',
                    headers=self.headers
                )
                response.raise_for_status()
                
                print(f"✅ Token révoqué avec succès !\n")
                
                return True
                
        except Exception as e:
            raise Exception(f"Token revocation failed: {str(e)}")
    
    # ========================================
    # 6. Télécharger un fichier
    # ========================================
    
    async def download_file(self, token: str, output_path: str) -> str:
        """
        Télécharger un fichier via token
        
        Args:
            token: Token d'accès
            output_path: Chemin de destination
            
        Returns:
            Chemin du fichier téléchargé
        """
        print(f"📥 Téléchargement du fichier via token")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f'http://localhost:8899/download/{token}'
                )
                response.raise_for_status()
                
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"✅ Fichier téléchargé : {output_path}\n")
                
                return output_path
                
        except Exception as e:
            raise Exception(f"Download failed: {str(e)}")
    
    # ========================================
    # 7. Workflow complet
    # ========================================
    
    async def upload_and_get_url(
        self, 
        file_path: str, 
        expires_in_hours: int = 24, 
        max_downloads: int = 100
    ) -> Dict[str, Any]:
        """
        Upload un fichier et créer un token (workflow complet)
        
        Args:
            file_path: Chemin vers le fichier
            expires_in_hours: Durée de validité
            max_downloads: Nombre max de téléchargements
            
        Returns:
            Dictionnaire contenant file, token et url
        """
        print("\n🔄 Workflow complet : Upload + Création de token\n")
        
        # 1. Upload
        file_data = await self.upload_file(file_path)
        
        # 2. Créer token
        token_data = await self.create_token(file_data['id'], expires_in_hours, max_downloads)
        
        # 3. URL publique
        public_url = f"http://localhost:8899{token_data['downloadUrl']}"
        
        print("🎉 Workflow terminé avec succès !")
        print(f"\n📎 URL publique à utiliser :")
        print(f"   {public_url}")
        print(f"\n💡 Exemple HTML :")
        print(f'   <img src="{public_url}" alt="{file_data["originalName"]}">\n')
        
        return {
            'file': file_data,
            'token': token_data,
            'url': public_url
        }


# ========================================
# 🎯 Exemples d'utilisation
# ========================================

async def run_examples():
    """Exécuter les exemples d'utilisation"""
    
    cdn = CDNService()
    
    print("\n" + "=" * 55)
    print("  📦 CDN Integration - Exemples d'utilisation")
    print("=" * 55 + "\n")
    
    try:
        # Exemple 1 : Upload + Token (workflow complet)
        print("📌 Exemple 1 : Upload d'un fichier et création de token\n")
        result = await cdn.upload_and_get_url('./test-image.jpg', 24, 100)
        
        print("\n" + "-" * 55 + "\n")
        
        # Exemple 2 : Lister les fichiers
        print("📌 Exemple 2 : Liste des fichiers\n")
        await cdn.list_files(1, 5)
        
        print("\n" + "-" * 55 + "\n")
        
        # Exemple 3 : Télécharger un fichier
        print("📌 Exemple 3 : Téléchargement via token\n")
        await cdn.download_file(result['token']['token'], './downloaded-image.jpg')
        
        print("\n" + "=" * 55)
        print("  ✅ Tous les exemples ont été exécutés avec succès !")
        print("=" * 55 + "\n")
        
    except Exception as e:
        print(f"\n⚠️  Une erreur s'est produite : {e}\n")


# ========================================
# Exemple avec FastAPI
# ========================================

"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import shutil

app = FastAPI()
cdn = CDNService()

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    '''Upload une image via le CDN'''
    
    # Sauvegarder temporairement
    temp_path = f"temp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Upload vers le CDN
        result = await cdn.upload_and_get_url(temp_path, 48, 1000)
        
        # Nettoyer le fichier temporaire
        os.remove(temp_path)
        
        return JSONResponse({
            "success": True,
            "url": result['url'],
            "file_id": result['file']['id'],
            "token_id": result['token']['id']
        })
        
    except Exception as e:
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/delete-image/{file_id}")
async def delete_image(file_id: str):
    '''Supprimer une image du CDN'''
    
    try:
        await cdn.delete_file(file_id)
        
        return JSONResponse({
            "success": True,
            "message": "Image supprimée"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/renew-token/{file_id}")
async def renew_token(file_id: str, old_token_id: str):
    '''Renouveler un token expiré'''
    
    try:
        # Révoquer l'ancien
        await cdn.revoke_token(old_token_id)
        
        # Créer le nouveau
        new_token = await cdn.create_token(file_id, 48, 1000)
        
        return JSONResponse({
            "success": True,
            "new_url": f"http://localhost:8899{new_token['downloadUrl']}",
            "token_id": new_token['id']
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""


# ========================================
# Exemple avec Django
# ========================================

"""
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
import asyncio

cdn = CDNService()

@csrf_exempt
async def upload_image(request):
    '''Upload une image via le CDN'''
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    file = request.FILES.get('image')
    if not file:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    # Sauvegarder temporairement
    temp_path = default_storage.save(f'temp/{file.name}', file)
    
    try:
        # Upload vers le CDN
        result = await cdn.upload_and_get_url(temp_path, 48, 1000)
        
        # Nettoyer
        default_storage.delete(temp_path)
        
        return JsonResponse({
            'success': True,
            'url': result['url'],
            'file_id': result['file']['id']
        })
        
    except Exception as e:
        default_storage.delete(temp_path)
        return JsonResponse({'error': str(e)}, status=500)
"""


# ========================================
# 🚀 Point d'entrée
# ========================================

if __name__ == "__main__":
    # Exécuter les exemples
    asyncio.run(run_examples())
