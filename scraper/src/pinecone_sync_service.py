import os
import time
import json
from datetime import datetime, timezone
from typing import List, Dict
from google.cloud import firestore
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

class PineconeSyncService:
    def __init__(self):
        # Initialize Pinecone
        self.pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        self.index_name = 'kaggle-competitions'
        
        try:
            self.index = self.pc.Index(self.index_name)
            print(f"✅ Connected to existing Pinecone index: {self.index_name}")
        except Exception:
            # Create index if needed
            self.pc.create_index(
                name=self.index_name,
                dimension=1536,
                metric='cosine',
                spec={'serverless': {'cloud': 'aws', 'region': 'us-east-1'}}
            )
            self.index = self.pc.Index(self.index_name)
        
        # Initialize embeddings and vector store
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vector_store = PineconeVectorStore(
            index=self.index,
            embedding=self.embeddings
        )
        
        # Initialize Firestore
        self.db = firestore.Client()
        
        # 🚀 NEW: Smart content chunking strategy
        self.discussion_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,  # Larger chunks to preserve context
            chunk_overlap=200,
            separators=["\n\n\n", "\n\n"],  # Only split on paragraph breaks
            length_function=len,
        )
        
        # Different strategy for competitions (can be split more)
        self.competition_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". "],
            length_function=len,
        )
    
    def prepare_discussion_docs_for_rag(self, doc: Dict) -> Dict:
        """Enhanced discussion preparation that preserves coherence"""
        
        title = doc.get('title', '').strip()
        content = doc.get('content', '').strip()
        
        # Create comprehensive context for RAG
        rag_context = []
        
        if title:
            rag_context.append(f"Discussion Title: {title}")
        
        # Add author context (very important for RAG quality assessment)
        author = doc.get('author', '').strip()
        kaggle_rank = doc.get('author_kaggle_rank', '')
        medal_type = doc.get('medal_type', '')
        comp_rank = doc.get('author_competition_rank', '')
        
        if author and kaggle_rank and medal_type:
            author_context = f"Author: {author} (Kaggle {kaggle_rank}, {medal_type} medal"
            if comp_rank and comp_rank != "Unranked":
                author_context += f", ranked #{comp_rank} in this competition"
            author_context += ")"
            rag_context.append(author_context)
        
        if content:
            rag_context.append(f"Discussion Content:\n{content}")
        
        # Join with double newlines to preserve structure
        full_text = "\n\n".join(rag_context)
        
        # Clean competition_id
        competition_id = doc.get('competition_id', '').strip()
        if not competition_id or competition_id.lower() in ['none', 'null']:
            competition_id = None
        
        # Clean upvotes
        upvotes = doc.get('upvotes', 0)
        if isinstance(upvotes, str):
            try:
                upvotes = int(upvotes) if upvotes.lower() not in ['none', 'null', ''] else 0
            except:
                upvotes = 0
        
        return {
            "type": "discussion",
            "id": doc.get('id', ''),
            "text": full_text,  # Rich, contextual text for RAG
            "competition_id": competition_id,
            "title": title,
            "author": author,
            "author_kaggle_rank": kaggle_rank,
            "medal_type": medal_type,
            "author_competition_rank": comp_rank,
            "upvotes": upvotes,
            "url": doc.get('url', ''),
            "post_date": doc.get('post_date', ''),
        }
    
    def sync_discussions_to_pinecone(self, discussions: List[Dict]):
        """Sync discussions with smart chunking that preserves coherence"""
        documents = []
        
        for disc in discussions:
            processed_disc = self.prepare_discussion_docs_for_rag(disc)
            
            # Quality validation
            if (not processed_disc["competition_id"] or 
                not processed_disc["text"] or 
                len(processed_disc["text"].strip()) < 100):
                continue
            
            # 🎯 SMART CHUNKING STRATEGY
            text_length = len(processed_disc["text"])
            
            if text_length <= 2000:
                # Small discussions: Keep as single chunk (preserve full context)
                doc = Document(
                    page_content=processed_disc["text"],
                    metadata={k: v for k, v in processed_disc.items() if k != "text"}
                )
                documents.append(doc)
                
            elif text_length <= 4000:
                # Medium discussions: Split carefully on paragraph breaks only
                chunks = self.discussion_splitter.split_text(processed_disc["text"])
                for i, chunk in enumerate(chunks):
                    metadata = {k: v for k, v in processed_disc.items() if k != "text"}
                    metadata.update({
                        'chunk_index': i,
                        'total_chunks': len(chunks),
                        'chunk_type': 'discussion_part'
                    })
                    
                    doc = Document(page_content=chunk, metadata=metadata)
                    documents.append(doc)
            
            else:
                # Very long discussions: Use semantic splitting
                # Try to split on natural discussion sections
                semantic_chunks = self._split_discussion_semantically(processed_disc["text"])
                
                for i, chunk in enumerate(semantic_chunks):
                    metadata = {k: v for k, v in processed_disc.items() if k != "text"}
                    metadata.update({
                        'chunk_index': i,
                        'total_chunks': len(semantic_chunks),
                        'chunk_type': 'discussion_section'
                    })
                    
                    doc = Document(page_content=chunk, metadata=metadata)
                    documents.append(doc)
        
        # Batch processing to avoid Pinecone limits
        if documents:
            self._add_documents_in_batches(documents, "discussions")
            self.mark_discussions_synced([disc['id'] for disc in discussions])
    
    def _split_discussion_semantically(self, text: str) -> List[str]:
        """Smart semantic splitting for very long discussions"""
        # Look for natural discussion sections
        section_markers = [
            "\n\n**",  # Bold headers
            "\n\n##",  # Markdown headers
            "\n\n1.",  # Numbered lists
            "\n\n-",   # Bullet points
            "\nConclusion",
            "\nSummary",
            "\nUpdate:",
            "\nEdit:",
        ]
        
        # Try to split on semantic boundaries first
        for marker in section_markers:
            if marker in text:
                parts = text.split(marker)
                if len(parts) > 1:
                    # Rejoin with markers and ensure minimum chunk size
                    chunks = []
                    current_chunk = parts[0]
                    
                    for i, part in enumerate(parts[1:], 1):
                        section = marker + part
                        if len(current_chunk) > 1500:  # Start new chunk
                            chunks.append(current_chunk.strip())
                            current_chunk = section
                        else:  # Continue building current chunk
                            current_chunk += section
                    
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    
                    return [chunk for chunk in chunks if len(chunk.strip()) > 100]
        
        # Fallback to paragraph-based splitting if no semantic markers found
        return self.discussion_splitter.split_text(text)
    
    def _add_documents_in_batches(self, documents: List[Document], doc_type: str):
        """Add documents to Pinecone in batches to avoid size limits"""
        batch_size = 40  # Conservative batch size
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        print(f"📦 Processing {len(documents)} {doc_type} in {total_batches} batches...")
        
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            try:
                self.vector_store.add_documents(batch_docs)
                print(f"  ✅ Batch {batch_num}/{total_batches}: {len(batch_docs)} chunks")
                time.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                print(f"  ❌ Error in batch {batch_num}: {str(e)}")
                continue
        
        print(f"✅ Synced {len(documents)} {doc_type} chunks to Pinecone")


    # Add these missing methods to your PineconeSyncService class:

    def sync_all_updated(self):
        """Sync all items with updated=True from Firestore to Pinecone"""
        print("🔄 Starting enhanced RAG-optimized Pinecone sync...")
        
        # Sync competitions
        updated_competitions = self.get_updated_competitions()
        if updated_competitions:
            self.sync_competitions_to_pinecone(updated_competitions)
        
        # Sync high-quality discussions with enhanced RAG preparation
        updated_discussions = self.get_updated_gold_expert_discussions()
        if updated_discussions:
            self.sync_discussions_to_pinecone(updated_discussions)
        
        print("✅ Enhanced RAG sync completed!")

    def get_updated_competitions(self) -> List[Dict]:
        """Get competitions with updated=True from Firestore"""
        competitions_ref = self.db.collection('competitions')
        query = competitions_ref.where('updated', '==', True)
        
        competitions = []
        for doc in query.stream():
            data = doc.to_dict()
            data['id'] = doc.id
            competitions.append(data)
        
        print(f"📊 Found {len(competitions)} updated competitions")
        return competitions

    def get_updated_gold_expert_discussions(self) -> List[Dict]:
        """Get ONLY Gold medal discussions from Expert+ authors with updated=True"""
        discussions_ref = self.db.collection('discussions')
        
        expert_ranks = ["Expert", "Master", "Grandmaster"]
        discussions = []
        
        # Query for each expert rank separately (Firestore limitation)
        for rank in expert_ranks:
            query = (discussions_ref
                    .where('updated', '==', True)
                    .where('medal_type', '==', 'Gold')
                    .where('author_kaggle_rank', '==', rank))
            
            rank_discussions = []
            for doc in query.stream():
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Additional filtering for quality
                if self._is_quality_discussion(data):
                    rank_discussions.append(data)
            
            discussions.extend(rank_discussions)
            print(f"💬 Found {len(rank_discussions)} updated Gold discussions from {rank} authors")
        
        print(f"💬 Total: {len(discussions)} updated Gold + Expert+ discussions")
        return discussions

    def _is_quality_discussion(self, doc: Dict) -> bool:
        """Apply additional quality filters for RAG optimization"""
        # Check for valid competition_id
        competition_id = doc.get('competition_id', '').strip()
        if not competition_id or competition_id.lower() in ['none', 'null', '']:
            return False
        
        # Check for real content
        content = doc.get('content', '').strip()
        title = doc.get('title', '').strip()
        
        # Must have both title and content with minimum length
        if not title or not content:
            return False
        
        # Minimum content length for meaningful RAG
        combined_text = f"Title: {title}\nContent: {content}"
        if len(combined_text.strip()) < 100:
            return False
        
        return True

    def sync_competitions_to_pinecone(self, competitions: List[Dict]):
        """Sync competitions to Pinecone with enhanced preparation"""
        documents = []
        
        # Process competitions
        processed_competitions = [self.prepare_competition_docs(comp) for comp in competitions]
        
        # Filter for quality
        quality_competitions = [
            doc for doc in processed_competitions 
            if len(doc["text"].strip()) > 100
        ]
        
        for comp in quality_competitions:
            # Split competitions if they're too long
            if len(comp["text"]) <= 1000:
                # Small competitions: Keep whole
                doc = Document(
                    page_content=comp["text"],
                    metadata={k: v for k, v in comp.items() if k != "text"}
                )
                documents.append(doc)
            else:
                # Large competitions: Split carefully
                chunks = self.competition_splitter.split_text(comp["text"])
                for i, chunk in enumerate(chunks):
                    metadata = {k: v for k, v in comp.items() if k != "text"}
                    metadata.update({
                        'chunk_index': i,
                        'total_chunks': len(chunks),
                        'chunk_type': 'competition_section'
                    })
                    
                    doc = Document(page_content=chunk, metadata=metadata)
                    documents.append(doc)
        
        if documents:
            self._add_documents_in_batches(documents, "competitions")
            self.mark_competitions_synced([comp['id'] for comp in competitions])

    def prepare_competition_docs(self, doc: Dict) -> Dict:
        """Enhanced competition document preparation with better formatting"""
        title = doc.get('title', '').strip()
        description = doc.get('description', '').strip()
        evaluation = doc.get('evaluation', '').strip()
        
        # Create rich text content with sections
        text_parts = []
        if title:
            text_parts.append(f"Competition Title: {title}")
        if description:
            text_parts.append(f"Description: {description}")
        if evaluation:
            text_parts.append(f"Evaluation: {evaluation}")
        
        text = "\n\n".join(text_parts)
        
        return {
            "type": "competition",
            "id": doc.get('id', ''),
            "text": text,
            "url": doc.get('url', ''),
            "competition_id": doc.get('id', ''),
            "title": title,
            "start_time": doc.get('start_time', ''),
            "deadline": doc.get('deadline', ''),
        }

    def mark_competitions_synced(self, competition_ids: List[str]):
        """Mark competitions as synced in Firestore"""
        batch = self.db.batch()
        for comp_id in competition_ids:
            doc_ref = self.db.collection('competitions').document(comp_id)
            batch.update(doc_ref, {
                'updated': False,
                'last_synced': datetime.now(timezone.utc).isoformat()
            })
        batch.commit()
        print(f"📝 Marked {len(competition_ids)} competitions as synced")

    def mark_discussions_synced(self, discussion_ids: List[str]):
        """Mark discussions as synced in Firestore"""
        batch = self.db.batch()
        for disc_id in discussion_ids:
            doc_ref = self.db.collection('discussions').document(disc_id)
            batch.update(doc_ref, {
                'updated': False,
                'last_synced': datetime.now(timezone.utc).isoformat()
            })
        batch.commit()
        print(f"📝 Marked {len(discussion_ids)} discussions as synced")

    def get_stats(self) -> dict:
        """Get statistics about the vector store and sync status"""
        try:
            # Pinecone stats
            pinecone_stats = self.index.describe_index_stats()
            
            # Firestore stats
            competitions_pending = len(list(self.db.collection('competitions').where('updated', '==', True).stream()))
            discussions_pending = 0
            
            # Count pending discussions by rank
            expert_ranks = ["Expert", "Master", "Grandmaster"]
            for rank in expert_ranks:
                query = (self.db.collection('discussions')
                        .where('updated', '==', True)
                        .where('medal_type', '==', 'Gold')
                        .where('author_kaggle_rank', '==', rank))
                rank_pending = len(list(query.stream()))
                discussions_pending += rank_pending
            
            return {
                'pinecone': {
                    'total_vectors': pinecone_stats.total_vector_count,
                    'dimension': pinecone_stats.dimension,
                    'index_fullness': pinecone_stats.index_fullness,
                },
                'firestore_pending': {
                    'competitions': competitions_pending,
                    'discussions': discussions_pending
                }
            }
        except Exception as e:
            print(f"❌ Error getting stats: {str(e)}")
            return {'error': str(e)}

# Add this at the end of the file:
if __name__ == "__main__":
    print("🚀 Starting Enhanced RAG-Optimized Pinecone Sync")
    print("=" * 60)
    
    sync_service = PineconeSyncService()
    
    # Print current stats
    print("\n📊 CURRENT STATS:")
    stats = sync_service.get_stats()
    if 'error' not in stats:
        print(f"  Pinecone vectors: {stats['pinecone']['total_vectors']}")
        print(f"  Pending competitions: {stats['firestore_pending']['competitions']}")
        print(f"  Pending Gold+Expert discussions: {stats['firestore_pending']['discussions']}")
    else:
        print(f"  Error getting stats: {stats['error']}")
    
    # Run enhanced sync
    print(f"\n🔄 STARTING ENHANCED RAG SYNC:")
    start_time = time.time()
    
    sync_service.sync_all_updated()
    
    sync_time = time.time() - start_time
    print(f"\n⏱️ Sync completed in {sync_time:.2f} seconds")
    
    # Print updated stats
    print(f"\n📊 AFTER SYNC:")
    stats = sync_service.get_stats()
    if 'error' not in stats:
        print(f"  Pinecone vectors: {stats['pinecone']['total_vectors']}")
        print(f"  Pending competitions: {stats['firestore_pending']['competitions']}")
        print(f"  Pending Gold+Expert discussions: {stats['firestore_pending']['discussions']}")
    
    print(f"\n🎉 Enhanced RAG sync pipeline completed!")