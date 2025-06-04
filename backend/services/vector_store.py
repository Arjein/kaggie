import os
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone
from dotenv import find_dotenv, load_dotenv
from langchain.schema import Document
load_dotenv(find_dotenv())

class VectorStoreService:
    def __init__(self):
        # Initialize Pinecone with the same setup as sync service
        self.pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        self.index_name = 'kaggle-competitions'  # Use the correct index name
        
        try:
            self.index = self.pc.Index(self.index_name)
            print(f"✅ Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            print(f"❌ Error connecting to Pinecone index: {str(e)}")
            raise
        
        # Initialize embeddings
        try:
            self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            print("✅ OpenAI embeddings initialized")
        except Exception as e:
            print(f"⚠️ OpenAI embeddings not available: {e}")
            print("💡 Set OPENAI_API_KEY environment variable for embedding functionality")
            self.embeddings = None
        
        # Initialize vector store
        if self.embeddings:
            self.vector_store = PineconeVectorStore(
                index=self.index,
                embedding=self.embeddings
            )
            print("✅ Vector store initialized with OpenAI embeddings")
        else:
            self.vector_store = None
            print("⚠️ Vector store not available - missing OpenAI credentials")
    
    def search_by_embedding(self, embedding: list[float], competition_id: str, k: int = 4) -> list:
        """Search for relevant discussions by embedding with competition filter"""
        if not self.vector_store:
            print("⚠️ Vector search not available - missing OpenAI credentials")
            return []
            
        try:
            print("🔄 Using direct Pinecone query...")
            complete_results = self.index.query(
                vector=embedding,
                top_k=k,
                filter={
                    "competition_id": competition_id,
                    "type": "discussion",
                    "chunk_type": "complete_discussion"  # Prioritize whole discussions

                },
                include_metadata=True,
                include_values=False
            )
            print("Results:", complete_results)
            if len(complete_results.matches) >= k:
                return self._convert_pinecone_to_documents(complete_results.matches[:k])
            
            # Otherwise, supplement with discussion parts
            partial_results = self.index.query(
                vector=embedding,
                top_k=k,
                filter={
                    "competition_id": competition_id,
                    "type": "discussion"
                },
                include_metadata=True
            )
            
            return self._convert_pinecone_to_documents(partial_results.matches)
            
        except Exception as e:
            print(f"❌ Error searching Pinecone: {str(e)}")
            import traceback
            print(f"❌ Full traceback: {traceback.format_exc()}")
            return []

    def _convert_pinecone_to_documents(self, pinecone_matches):

        docs = []
        for match in pinecone_matches:
            # Get the text content from metadata (this is how we stored it)
            page_content = match.metadata.get('text', '')
            
            # Create metadata without the text field
            metadata = {k: v for k, v in match.metadata.items() if k != 'text'}
            metadata['score'] = match.score  # Add similarity score
            
            docs.append(Document(
                page_content=page_content,
                metadata=metadata
            ))
        
        return docs
    
    def search_competitions(self, query: str, k: int = 4) -> list:
        """Search for relevant competitions by text query"""
        try:
            results = self.vector_store.similarity_search(
                query=query,
                k=k,
                filter={"type": "competition"}
            )
            return results
        except Exception as e:
            print(f"❌ Error searching competitions: {str(e)}")
            return []
    
    def search_discussions(self, query: str, competition_id: str = None, k: int = 4) -> list:
        """Search for relevant discussions by text query"""
        try:
            search_filter = {"type": "discussion"}
            if competition_id:
                search_filter["competition_id"] = competition_id
            
            results = self.vector_store.similarity_search(
                query=query,
                k=k,
                filter=search_filter
            )
            return results
        except Exception as e:
            print(f"❌ Error searching discussions: {str(e)}")
            return []


# Singleton instance
vector_store_service = VectorStoreService()


