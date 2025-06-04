from datetime import datetime
import dateutil.parser
import os
import spacy
import re
from dotenv import find_dotenv
# Load spaCy model - you'll need to install it first with:
# pip install spacy && python -m spacy download en_core_web_sm
try:
    nlp = spacy.load("en_core_web_sm")
except:
    print("Please install spaCy model: python -m spacy download en_core_web_sm")
    nlp = None

def normalize_text_spacy(text: str, for_rag=False) -> str:
    """
    Advanced text normalization using spaCy.
    Handles math formulas, bullet points, code blocks, special formatting, and links.
    
    Args:
        text: The input text to normalize
        for_rag: If True, applies enhanced normalization optimized for RAG and vector search
        
    Returns:
        Normalized text ready for processing or storage
    """
    if not text or not nlp:
        return text
    
    # Handle links in the text before other processing
    if for_rag:
        # Replace groups of consecutive links with a single placeholder
        consecutive_links_pattern = r'((?:https?://\S+\s*){3,})'
        text = re.sub(consecutive_links_pattern, ' [Multiple Reference Links] ', text)
        
        # For remaining individual links, preserve their context
        individual_link_pattern = r'(https?://[^\s]+)'
        
        def process_link(match):
            link = match.group(1)
            # Extract meaningful parts from the URL
            if 'scholar.google' in link:
                return '[Google Scholar Reference]'
            elif 'sciencedirect' in link:
                return '[ScienceDirect Reference]'
            elif 'springer' in link:
                return '[Springer Reference]'
            elif 'ieee' in link:
                return '[IEEE Reference]'
            elif 'nature.com' in link:
                return '[Nature Reference]'
            elif 'researchgate' in link:
                return '[ResearchGate Reference]'
            elif 'arxiv' in link:
                return '[arXiv Reference]'
            elif 'github' in link:
                return '[GitHub Repository]'
            elif 'kaggle.com' in link:
                return '[Kaggle Resource]'
            else:
                return '[Reference Link]'
                
        text = re.sub(individual_link_pattern, process_link, text)
        
    # For longer content that will be used in RAG systems, use enhanced processing
    if for_rag and len(text) > 200:
        # Apply more aggressive normalization for long RAG content
        text = normalize_rag_content(text)
        # Remove duplicates which are common in scraped competition descriptions
        return remove_duplicated_content(text)
    
    # Basic normalization for shorter content and non-RAG use cases
    # First pass: clean up special formatting
    text = pre_clean_text(text)
    
    # Process with spaCy
    doc = nlp(text)
    
    # Extract and clean sentences
    sentences = []
    for sent in doc.sents:
        clean_sent = sent.text.strip()
        if clean_sent:
            # Ensure sentence ends with proper punctuation
            if not clean_sent[-1] in ['.', '!', '?']:
                clean_sent += '.'
            sentences.append(clean_sent)
    
    # Join sentences with spaces
    normalized_text = ' '.join(sentences)
    
    # Final cleanup
    normalized_text = post_clean_text(normalized_text)
    
    return normalized_text

def pre_clean_text(text: str) -> str:
    """Initial cleaning before spaCy processing."""
    # Replace LaTeX/math formulas with simplified text
    text = re.sub(r'\\textrm\{([^}]+)\}', r'\1', text)
    text = re.sub(r'\\left\(', '(', text)
    text = re.sub(r'\\right\)', ')', text)
    text = re.sub(r'\\frac\{1\}\{([^}]+)\}', r'1/\1', text)
    text = re.sub(r'\\sum_\{([^}]+)\}\^\{([^}]+)\}', r'sum from \1 to \2', text)
    text = re.sub(r'\\log', 'log', text)
    
    # Handle bullet points and lists
    text = re.sub(r'^\s*•\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # Handle code blocks
    text = re.sub(r'```[\s\S]*?```', ' Code example: ', text)
    
    # Handle markdown headers
    text = re.sub(r'##\s+([^\n]+)', r'\1:', text)
    
    # Handle tables
    text = re.sub(r'TABLE:\s*\n', 'Table: ', text)
    text = re.sub(r'\s*\|\s*', ' ', text)
    
    # Convert newlines to spaces
    text = re.sub(r'\n\n+', '. ', text)
    text = re.sub(r'\n', ' ', text)
    
    return text

def post_clean_text(text: str) -> str:
    """Final cleaning after spaCy processing."""
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Fix common issues
    text = re.sub(r'\s+\.', '.', text)  # Remove spaces before periods
    text = re.sub(r'\.\.+', '.', text)  # Multiple periods to single
    
    # Replace any remaining special characters while preserving key technical symbols
    text = re.sub(r'[^\w\s\.\,\;\:\?\!\'\"()-_+*/=%<>]', ' ', text)
    
    # Handle common Kaggle-specific expressions
    # Keep common metrics and ML terms intact
    text = re.sub(r'(?i)\br ?squared\b', 'R²', text)
    text = re.sub(r'(?i)\bmae\b', 'MAE', text)
    text = re.sub(r'(?i)\bmse\b', 'MSE', text)
    text = re.sub(r'(?i)\brmse\b', 'RMSE', text)
    text = re.sub(r'(?i)\bauc\b', 'AUC', text)
    
    # Final whitespace normalization
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def remove_duplicated_content(text: str) -> str:
    """Remove duplicated paragraphs and repetitive content that's common in scraped data."""
    if not text:
        return text
        
    # Split text into paragraphs
    paragraphs = text.split('. ')
    
    # Remove exact duplicates while preserving order
    unique_paragraphs = []
    seen = set()
    
    for paragraph in paragraphs:
        normalized_p = paragraph.lower().strip()
        if len(normalized_p) > 15 and normalized_p not in seen:
            seen.add(normalized_p)
            unique_paragraphs.append(paragraph)
        elif len(normalized_p) <= 15:
            # Always keep short paragraphs
            unique_paragraphs.append(paragraph)
    
    return '. '.join(unique_paragraphs)


def normalize_rag_content(text: str) -> str:
    """
    Enhanced normalization specifically for content fields that will be used in RAG systems.
    Optimized for vector search and semantic matching while preserving meaning.
    """
    if not text or not nlp:
        return text
    
    # First clean special formatting
    text = pre_clean_text(text)
    
    # Process with spaCy
    doc = nlp(text)
    
    # Extract cleaned sentences while preserving technical terms and entities
    sentences = []
    for sent in doc.sents:
        # Skip very short or meaningless sentences
        clean_sent = sent.text.strip()
        if len(clean_sent) < 4 or clean_sent.isspace():
            continue
            
        # Handle technical vocabulary and special terms
        # This preserves mathematical expressions, code references, etc.
        for token in sent:
            # Preserve technical vocabulary and symbols important for Kaggle competitions
            if (token.is_digit or 
                token.like_num or 
                token.text in ['ML', 'AI', 'CV', 'NLP', 'AUC', 'RMSE', 'MSE', 'MAE']):
                # Keep these tokens as they are (handling happens in pre_clean_text)
                pass
        
        # Add proper sentence ending if missing
        if clean_sent and not clean_sent[-1] in ['.', '!', '?']:
            clean_sent += '.'
            
        # Only add non-empty sentences
        if clean_sent and not clean_sent.isspace():
            sentences.append(clean_sent)
    
    # Join with proper spacing
    normalized_text = ' '.join(sentences)
    
    # Final cleanup with enhanced processing
    normalized_text = post_clean_text(normalized_text)
    
    return normalized_text



def str_to_utc_iso(dt: str) -> str:
    """
    Convert a date string to UTC format.
    Returns ISO 8601 formatted UTC datetime string.
    """
    # First remove the part in parentheses
    cleaned_dt = re.sub(r'\s+\([^)]+\)', '', dt)
    
    # Fix GMT+XXXX format which dateutil interprets incorrectly
    # Convert GMT+XXXX to +XXXX (ISO format)
    cleaned_dt = re.sub(r'GMT\+', '+', cleaned_dt)
    # Convert GMT-XXXX to -XXXX (ISO format)
    cleaned_dt = re.sub(r'GMT-', '-', cleaned_dt)
    
    
    try:
        # Parse the date string
        parsed_dt = dateutil.parser.parse(cleaned_dt)
    

        # Convert to UTC
        utc_dt = parsed_dt.astimezone(dateutil.tz.UTC)
    

        # Format as ISO 8601 for standardized output
        iso_format = utc_dt.isoformat()
    

        # Alternative format
        formatted_utc = utc_dt.strftime("%Y-%m-%d %H:%M:%S %Z")
    
        
        return iso_format
    
    except Exception as e:
        print(f"Error parsing date: {e}")
        return f"Error: {str(e)}"
    

def update_env_variable(key, value):
    """Update a specific environment variable in the .env file."""
    env_path = find_dotenv()
    
    # Read the current .env file
    with open(env_path, 'r') as file:
        lines = file.readlines()
    
    # Update or add the variable
    updated = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            updated = True
            break
    
    # If the variable wasn't found, append it
    if not updated:
        lines.append(f"{key}={value}\n")
    
    # Write the updated content back to the file
    with open(env_path, 'w') as file:
        file.writelines(lines)
    
    # Also update the current environment
    os.environ[key] = value