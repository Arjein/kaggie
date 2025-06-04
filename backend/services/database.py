from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import os
import json
import tempfile
from google.oauth2 import service_account

class DatabaseService:
    def __init__(self):
        self.db = self._initialize_firestore_client()

    def _initialize_firestore_client(self):
        """Initialize Firestore client with flexible credential handling"""
        try:
            # Method 1: Try JSON credentials from environment variable (Render.com)
            creds_json = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')
            if creds_json:
                print("✅ Using JSON credentials from environment variable")
                try:
                    # Parse JSON string
                    creds_dict = json.loads(creds_json)
                    credentials = service_account.Credentials.from_service_account_info(creds_dict)
                    return firestore.Client(credentials=credentials)
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse JSON credentials: {e}")
            
            # Method 2: Try file path from environment variable (local development)
            creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
            if creds_path:
                # Handle relative paths correctly - resolve from the current working directory
                if not os.path.isabs(creds_path):
                    # If it's a relative path, make it relative to the current working directory
                    abs_creds_path = os.path.abspath(creds_path)
                else:
                    abs_creds_path = creds_path
                
                if os.path.exists(abs_creds_path):
                    print(f"✅ Using credentials file: {abs_creds_path}")
                    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = abs_creds_path
                    return firestore.Client()
                else:
                    print(f"⚠️ Credentials file not found: {abs_creds_path}")
                    print(f"   Current working directory: {os.getcwd()}")
                    print(f"   Looking for: {creds_path}")
            
            # Method 3: Try default credentials (if running on Google Cloud)
            print("🔍 Trying default Google Cloud credentials...")
            return firestore.Client()
            
        except Exception as e:
            print(f"❌ Failed to initialize Firestore client: {e}")
            print("💡 Make sure to set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON")
            # Return None or raise exception based on your preference
            # For development, we'll return None and handle it gracefully
            return None

    def get_competition(self, competition_id: str) -> dict:
        """Get a specific competition by ID"""
        if not self.db:
            raise ValueError("Database not available - check Google Cloud credentials")
        
        try:
            docs = (
                self.db.collection("competitions")
                .where(filter=FieldFilter("id", "==", competition_id))
                .get()
            )
            if docs:
                return docs[0].to_dict()
            raise ValueError(f"Competition {competition_id} not found")
        except Exception as e:
            print(f"Database error in get_competition: {e}")
            raise ValueError(f"Failed to fetch competition {competition_id}")
    
    def get_active_competitions(self) -> list:
        """Get all active competitions"""
        if not self.db:
            print("⚠️ Database not available - returning empty competitions list")
            return []
        
        try:
            docs = self.db.collection("competitions").get()
            
            competitions = []
            for doc in docs:
                data = doc.to_dict()
                competitions.append({
                    "id": doc.id,
                    "title": data.get("title", ""),
                    "url": data.get("url", ""),
                    "deadline": data.get("deadline", "")
                })
            
            return competitions
            
        except Exception as e:
            print(f"Database error in get_active_competitions: {e}")
            return []  # Return empty list on error

# Singleton instance
db_service = DatabaseService()