#!/usr/bin/env python3
"""
Kaggle scraper for competitions and discussions.
"""
import time
import os
import json
import re
from typing import Dict, Any, List
import asyncio
from datetime import datetime, timezone, timedelta
from playwright.sync_api import Browser
from playwright.async_api import async_playwright
from google.cloud import firestore
from utils import normalize_text_spacy, str_to_utc_iso, update_env_variable
from dotenv import load_dotenv, find_dotenv
import random


class KaggleScraper:
    """Class for scraping Kaggle competitions and discussions."""
    
    def __init__(self):
        """Initialize the Kaggle scraper."""
        load_dotenv()
        creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        print(creds_path)
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        self.js_file_path = os.path.join(self.current_dir, 'extract_content.js')
        self.last_scrape_datetime = os.environ.get('LAST_SCRAPE_DATETIME', None)
        self.db = firestore.Client()
        self.existing_discussions = self.get_existing_discussions()

        if self.last_scrape_datetime == "None" or self.last_scrape_datetime is None:
            hundred_years_ago = datetime.now(timezone.utc) - timedelta(days=365*100)
            self.last_scrape_datetime = hundred_years_ago.isoformat()
            update_env_variable('LAST_SCRAPE_DATETIME', self.last_scrape_datetime)
    
    async def fetch_competitions(self, max_pages=5):
        """
        Fetch Kaggle competitions with pagination support.
        
        Args:
            max_pages: Maximum number of pages to scrape
            
        Returns:
            None: Data is saved to database directly
        """
        competitions = []
        all_discussions = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Start with the first page of competitions
            current_page = 1
            has_next_page = True
            
            while has_next_page and current_page <= max_pages:
                # Navigate to the page with active competitions
                page_url = f"https://www.kaggle.com/competitions?listOption=active&page={current_page}"
                print(f"Fetching competition page {current_page}: {page_url}")
                
                await page.goto(page_url)
                await page.wait_for_load_state('networkidle')
                
                # Wait for competition list to load
                specific_list_selector = "ul.MuiList-root.km-list.sc-ekhxZF.dPUdCH.css-1uzmcsd"
                try:
                    await page.wait_for_selector(specific_list_selector, timeout=30000)
                except Exception as e:
                    print(f"Could not find competition list on page {current_page}: {e}")
                    # Try an alternative selector
                    await page.wait_for_selector("ul.MuiList-root.km-list", timeout=30000)
                
                # Wait for each competition link to load
                await page.wait_for_selector("a[href^='/competitions/']", timeout=60000)

                # Fetch all competition links on the current page
                competition_links = await page.query_selector_all("a[href^='/competitions/']")
                
                # Filter out duplicate links and non-competition links
                unique_links = []
                processed_hrefs = set()
                
                for link in competition_links:
                    href = await link.get_attribute('href')
                    comp_id = href.split('/')[-1] if href else ""
                    
                    # Skip duplicates, non-competition links, and invalid competition IDs
                    if not href or href in processed_hrefs or not comp_id or comp_id == "competitions" or len(comp_id) < 3:
                        continue
                        
                    processed_hrefs.add(href)
                    unique_links.append(link)
                    
                competition_links = unique_links
                print(f"Found {len(competition_links)} unique competition links on page {current_page}")
                
                if len(competition_links) == 0:
                    # No more competitions to process
                    has_next_page = False
                    break
                    
                # Process each competition on this page
                for i, link in enumerate(competition_links):
                    try:
                        # Get competition URL and ID
                        href = await link.get_attribute('href')
                        comp_url = f"https://www.kaggle.com{href}"
                        comp_id = href.split('/')[-1] if href else "unknown"
                        
                        # Try to get the title using multiple selectors
                        title = "Unknown title"
                        for selector in ['.sc-dFaThA', 'h3', '.sc-jPkiSJ']:
                            title_elem = await link.query_selector(selector)
                            if title_elem:
                                title_text = await title_elem.text_content()
                                if title_text and title_text.strip():
                                    title = title_text.strip()
                                    break
                        
                        # Process competition details
                        print(f"\n--- Competition #{(current_page-1)*len(competition_links) + i+1} ---")
                        print(f"ID: {comp_id}")
                        print(f"Title: {title}")
                        
                        # Check if we already have this competition in our list
                        if any(comp['id'] == comp_id for comp in competitions):
                            print(f"Skipping duplicate competition: {comp_id}")
                            continue
                        
                        # Fetch detailed information about the competition
                        details = await self._fetch_competition_details(browser, comp_url)
                        
                        # Create the competition data dictionary
                        competition_data = {
                            "id": comp_id,
                            "title": title,
                            "url": comp_url,
                            "description": details['description'],
                            "evaluation": details['evaluation'],
                            "deadline": details.get('deadline', None),
                            "start_time": details.get('start_time', None),
                            "page_found": current_page,
                            "scraped_at": datetime.now(timezone.utc).isoformat(),
                            "updated": True
                        }
                        
                        competitions.append(competition_data)
                        
                        # Print competition details
                        print(f"URL: {comp_url}")
                        print(f"Description: {details['description'][:50]}...")
                        print(f"Evaluation: {details['evaluation'][:50]}...")
                        print(f"Start: {details['start_time']} | Deadline: {details['deadline']}")
                        print("----------------------------")
                        
                        # Fetch discussions with pagination
                        competition_discussions = await self._fetch_competition_discussions(browser, comp_id, comp_url, max_pages=20)
                        print(f"Found {len(competition_discussions)} discussions for {comp_id}")
                        
                        # Store discussions
                        if competition_discussions and len(competition_discussions) > 0:
                            all_discussions.extend(competition_discussions)
                        
                        update_env_variable('LAST_SCRAPE_DATETIME', datetime.now(timezone.utc).isoformat())
                        
                    except Exception as e:
                        print(f"Error processing competition on page {current_page}, item {i+1}: {e}")
                        import traceback
                        traceback.print_exc()
                
                # Check for next page button using the specific Kaggle selector
                next_page_button = await page.query_selector("button[aria-label='Go to next page']")
                if not next_page_button:
                    # Try alternative selector
                    next_page_button = await page.query_selector("button.MuiPaginationItem-previousNext[aria-label*='next']")
                
                # Check if the button exists and is not disabled
                is_disabled = await next_page_button.get_attribute("disabled") if next_page_button else "true"
                is_disabled_class = await next_page_button.get_attribute("class") if next_page_button else ""
                is_disabled_by_class = "Mui-disabled" in is_disabled_class if is_disabled_class else True
                
                if is_disabled == "true" or is_disabled_by_class or not next_page_button:
                    has_next_page = False
                    print("No more pages available")
                else:
                    print(f"Going to next page (page {current_page + 1})")
                    current_page += 1
                    # Click the next page button instead of constructing a new URL
                    try:
                        await next_page_button.click()
                        # Wait for the page to load
                        await page.wait_for_load_state('networkidle')
                        await asyncio.sleep(random.randint(5, 10)) 
                    except Exception as e:
                        print(f"Error navigating to next page: {e}")
                        # Fallback to direct URL navigation
                        has_next_page = False
            
            # Output summary statistics
            print(f"\nExtracted {len(competitions)} competitions and {len(all_discussions)} discussions.")

            # Save data to database
            try:
                # Save competitions
                batch = self.db.batch()
                for comp in competitions:
                    doc_ref = self.db.collection('competitions').document(comp['id'])
                    batch.set(doc_ref, comp)
                batch.commit()
                print(f"Saved {len(competitions)} competitions to Firestore.")

                # Save discussions
                if all_discussions:
                    batch = self.db.batch()
                    for disc in all_discussions:
                        doc_ref = self.db.collection('discussions').document(disc['id'])
                        batch.set(doc_ref, disc)
                    batch.commit()
                    print(f"Saved {len(all_discussions)} discussions to Firestore.")
            except Exception as e:
                print(f"Error saving to Firestore: {e}")
                # Save to backup JSON file just in case
                with open(f'competitions_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json', 'w') as f:
                    json.dump(competitions, f)
                with open(f'discussions_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json', 'w') as f:
                    json.dump(all_discussions, f)
            
            await browser.close()
    
    async def _fetch_competition_details(self, browser: Browser, url: str) -> Dict[str, Any]:
        """
        Fetch detailed information about a competition.
        
        Args:
            browser: Playwright browser instance
            url: URL of the competition
            
        Returns:
            Dictionary containing competition details
        """
        page = await browser.new_page()
        await page.goto(url)
        details = {}
        
        # Get Description    
        await page.wait_for_load_state('networkidle')
        
        details['description'] = await self._get_competition_description(page)    
        details['evaluation'] = await self._get_competition_evaluation(page)    
        details['deadline'] = await self._get_competition_deadline(page)    
        details['start_time'] = await self._get_competition_start_time(page)    
        
        await page.close()
        return details
    
    async def _get_competition_description(self, page) -> str:
        """Extract competition description using JavaScript."""
        # Load the JS file
        with open(self.js_file_path, 'r') as f:
            js_code = f.read()
        
        # Use the extractDescription function from the JS file
        description = await page.evaluate(f"""() => {{
            {js_code}
            return extractDescription();
        }}""")
        
        # Use enhanced RAG normalization for competition descriptions
        return normalize_text_spacy(description, for_rag=True) if description else ""
    
    async def _get_competition_deadline(self, page) -> str:
        """Extract competition deadline using JavaScript."""
        # Load the JS file
        with open(self.js_file_path, 'r') as f:
            js_code = f.read()
        
        # Use the extractDeadline function from the JS file
        deadline_timestamp = await page.evaluate(f"""() => {{
            {js_code}
            return extractDeadline();
        }}""")
        
        return str_to_utc_iso(deadline_timestamp) if deadline_timestamp else "Indefinite"
    
    async def _get_competition_start_time(self, page) -> str:
        """Extract competition start time using JavaScript."""
        # Load the JS file
        with open(self.js_file_path, 'r') as f:
            js_code = f.read()
        
        # Use the extractDeadline function from the JS file
        start_timestamp = await page.evaluate(f"""() => {{
            {js_code}
            return extractStartTime();
        }}""")
        
        return str_to_utc_iso(start_timestamp) if start_timestamp else "Indefinite"
    
    async def _get_competition_evaluation(self, page) -> str:
        """Extract competition evaluation criteria using JavaScript."""
        # Load the JS file
        with open(self.js_file_path, 'r') as f:
            js_code = f.read()
        
        # Use the extractEvaluation function from the JS file
        evaluation = await page.evaluate(f"""() => {{
            {js_code}
            return extractEvaluation();
        }}""")
        
        # Use enhanced RAG normalization for evaluation criteria
        return normalize_text_spacy(evaluation, for_rag=True) if evaluation else ""
    
    async def _fetch_competition_discussions(self, browser: Browser, comp_id: str, comp_url: str, minvote=10, max_pages=20) -> List[Dict[str, Any]]:
        """
        Fetch popular discussions for a competition with pagination support.
        
        Args:
            browser: Playwright browser instance
            comp_id: Competition ID
            comp_url: Competition URL
            minvote: Minimum number of votes for a discussion to be included
            max_pages: Maximum number of pages to scrape
            
        Returns:
            List of discussion data dictionaries
        """
        discussions = []
        
        try:
            # Start with the first page of discussions
            current_page = 1
            has_next_page = True
            total_items_with_enough_votes = 0
            
            # Navigate to the discussions tab
            page = await browser.new_page()
            
            while has_next_page and current_page <= max_pages:
                # Construct the URL with page parameter
                discussion_url = f"{comp_url}/discussion?sort=votes&page={current_page}"
                print(f"Fetching discussion page {current_page} for {comp_id}: {discussion_url}")
                
                await page.goto(discussion_url)
                await page.wait_for_load_state('networkidle')
                  
                # Wait for discussion list to load
                specific_list_selector = "ul.MuiList-root.km-list.css-1uzmcsd"
                try:
                    await page.wait_for_selector(specific_list_selector, timeout=30000)
                except Exception as e:
                    print(f"No discussion list found on page {current_page} for {comp_id}: {e}")
                    break
                
                # Wait for discussion items to load
                try:
                    await page.wait_for_selector("ul.MuiList-root.km-list.css-1uzmcsd li.MuiListItem-root", timeout=60000)
                except Exception as e:
                    print(f"No discussion items found on page {current_page} for {comp_id}: {e}")
                    break
                
                # Get all discussion list items
                discussion_items = await page.query_selector_all("li.MuiListItem-root.MuiListItem-gutters.MuiListItem-divider.sc-inRxyr")
                print(f"Found {len(discussion_items)} discussion items on page {current_page} for {comp_id}")
                
                if len(discussion_items) == 0:
                    # No discussions on this page, we've reached the end
                    break
                
                # Process each discussion item on the current page
                items_with_enough_votes = 0
                for i, item in enumerate(discussion_items):
                    disc_page = None  # Initialize disc_page outside the try block
                    try:
                        # Get the link to the discussion and extract disc_id
                        link_elem = await item.query_selector("a[href*='/discussion/']")
                        if link_elem:
                            href = await link_elem.get_attribute('href')
                            disc_url = f"https://www.kaggle.com{href}"
                            disc_id = href.split('/')[-1] if href else "unknown"
                        else:
                            print(f"Could not find discussion link for item {i} on page {current_page}")
                            continue

                        # Get the title
                        title = "Unknown title"
                        for selector in [".sc-dFaThA", ".sc-jPkiSJ", "h3"]:
                            title_elem = await item.query_selector(selector)
                            if title_elem:
                                title_text = await title_elem.text_content()
                                if title_text and title_text.strip():
                                    title = title_text.strip()
                                    break

                        # Get upvote count to filter by popularity
                        upvote_span = await item.query_selector("span[aria-live='polite']")
                        upvotes_text = await upvote_span.text_content() if upvote_span else "0"
                        upvotes = int(re.search(r"(\d+)", upvotes_text).group(1)) if re.search(r"(\d+)", upvotes_text) else 0

                        # Only process discussions with enough upvotes
                        if upvotes >= minvote:
                            # Check if discussion exists and upvotes/title are unchanged
                            existing = self.existing_discussions.get(disc_id)
                            if existing and existing.get("upvotes") == upvotes and existing.get("title") == title:
                                print(f"Skipping unchanged discussion: {disc_id} (upvotes: {upvotes})")
                                continue

                            items_with_enough_votes += 1
                            total_items_with_enough_votes += 1

                            # Check if we already have this discussion in our list
                            if any(disc['id'] == disc_id for disc in discussions):
                                print(f"Skipping duplicate discussion: {disc_id}")
                                continue

                            # Get author
                            author_elem = await item.query_selector("a[emphasis]")
                            author = await author_elem.text_content() if author_elem else "Unknown author"

                            print(f"Processing discussion: {title} ({upvotes} upvotes)")

                            # Now visit the discussion page to get its content
                            disc_page = await browser.new_page()
                            await disc_page.goto(disc_url)
                            await disc_page.wait_for_load_state('networkidle')

                            # Get the discussion content using JavaScript
                            with open(self.js_file_path, 'r') as f:
                                js_code = f.read()

                            content_data = await disc_page.evaluate(f"""() => {{
                                {js_code}
                                return extractDiscussionContent();
                            }}""")

                            # Check for errors in extraction
                            if content_data.get('error'):
                                print(f"Error extracting discussion content: {content_data['error']}")
                                content = ""
                            else:
                                # Process the content text with enhanced RAG normalization
                                content = normalize_text_spacy(content_data.get('content', ""), for_rag=True) if content_data.get('content') else ""

                            competition_rank = content_data.get('competitionRank')
                            if competition_rank:
                                # Extract just the number from strings like "2nd", "3rd", "1357th"
                                rank_match = re.match(r'(\d+)', competition_rank)
                                if rank_match:
                                    competition_rank = int(rank_match.group(1))

                            # Add all the extracted info to the discussion data
                            discussion_data = {
                                "id": disc_id,
                                "competition_id": comp_id,
                                "title": title,
                                "url": disc_url,
                                "author": author.strip(),
                                "content": content,
                                "upvotes": upvotes,
                                "post_date": str_to_utc_iso(content_data.get('posted_datetime')),
                                "author_competition_rank": competition_rank,
                                "author_kaggle_rank": content_data.get('kaggleRank'),
                                "medal_type": content_data.get('medalType'),
                                "page_found": current_page,
                                "scraped_at": datetime.now(timezone.utc).isoformat(),
                                "updated": True
                            }

                            discussions.append(discussion_data)

                            # Add a small delay between requests
                            await asyncio.sleep(random.randint(5, 10)) 
                    except Exception as e:
                        print(f"Error processing discussion item {i} on page {current_page}: {e}")
                    finally:
                        if disc_page:  # Only close if disc_page was created
                            await disc_page.close()
                
                print(f"Found {items_with_enough_votes} discussions with {minvote}+ upvotes on page {current_page}")
                
                # If we didn't find any discussions with enough votes on this page,
                # and we're past the first page, we might want to stop
                if items_with_enough_votes == 0 and current_page > 1:
                    print(f"No discussions with enough votes on page {current_page}. Stopping pagination.")
                    break
                    
                # Check for next page button
                next_page_button = await page.query_selector("button[aria-label='Go to next page']")
                if not next_page_button:
                    next_page_button = await page.query_selector("button.MuiPaginationItem-previousNext[aria-label*='next']")
                
                # Check if the button exists and is not disabled
                is_disabled = await next_page_button.get_attribute("disabled") if next_page_button else "true"
                is_disabled_class = await next_page_button.get_attribute("class") if next_page_button else ""
                is_disabled_by_class = "Mui-disabled" in is_disabled_class if is_disabled_class else True
                
                if is_disabled == "true" or is_disabled_by_class or not next_page_button:
                    has_next_page = False
                    print(f"No more discussion pages available for {comp_id}")
                else:
                    current_page += 1
                    print(f"Going to next discussion page (page {current_page}) for {comp_id}")
                    
                    # Click the next page button instead of constructing a new URL
                    try:
                        await next_page_button.click()
                        # Wait for the page to load
                        await page.wait_for_load_state('networkidle')
                        await asyncio.sleep(random.randint(5, 10)) 
                    except Exception as e:
                        print(f"Error navigating to next discussion page: {e}")
                        has_next_page = False
            
            print(f"Total discussions with {minvote}+ upvotes found for {comp_id}: {total_items_with_enough_votes}")
            
        except Exception as e:
            print(f"Error fetching discussions for {comp_id}: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            await page.close()
            
        return discussions
    

    def get_existing_competitions(self):
        competitions_ref = self.db.collection('competitions')
        docs = competitions_ref.stream()
        return {doc.id: doc.to_dict() for doc in docs}

    def get_existing_discussions(self):
        discussions_ref = self.db.collection('discussions')
        docs = discussions_ref.stream()
        return {doc.id: doc.to_dict() for doc in docs}


# Entry point for the script
if __name__ == "__main__":
    
    start_time = time.time()  # Start timer
    
    print("🚀 Starting Kaggle scraping and sync pipeline...")
    
    # Step 1: Run scraper
    print("\n📊 Step 1: Scraping Kaggle competitions and discussions...")
    scraper = KaggleScraper()
    asyncio.run(scraper.fetch_competitions(max_pages=5))
    
    scrape_time = time.time()
    scrape_minutes = (scrape_time - start_time) / 60
    print(f"✅ Scraping completed in {scrape_minutes:.2f} minutes")
    
    # Step 2: Sync to Pinecone
    print("\n🌲 Step 2: Syncing new data to Pinecone...")
    try:
        from pinecone_sync_service import PineconeSyncService
        
        sync_service = PineconeSyncService()
        
        # Print stats before sync
        stats = sync_service.get_stats()
        print(f"📊 Before sync: {stats['pinecone']['total_vectors']} vectors in Pinecone")
        print(f"📋 Pending: {stats['firestore_pending']['discussions']} discussions, {stats['firestore_pending']['competitions']} competitions")
        
        # Run sync
        sync_service.sync_all_updated()
        
        # Print stats after sync
        stats = sync_service.get_stats()
        print(f"📊 After sync: {stats['pinecone']['total_vectors']} vectors in Pinecone")
        
        sync_time = time.time()
        sync_minutes = (sync_time - scrape_time) / 60
        print(f"✅ Pinecone sync completed in {sync_minutes:.2f} minutes")
        
    except Exception as e:
        print(f"❌ Pinecone sync failed: {str(e)}")
        print("🔄 Scraping was successful, but sync failed. Manual sync may be needed.")
    
    # Total runtime
    end_time = time.time()
    total_minutes = (end_time - start_time) / 60
    print(f"\n🎉 Pipeline completed! Total runtime: {total_minutes:.2f} minutes")
    print("✅ Ready for next scheduled run in 4 hours")
