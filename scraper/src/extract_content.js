/**
 * Formats an HTML element and its contents into a structured text representation
 * @param {Element} el - The DOM element to format
 * @return {string} Formatted text content
 */
function formatElement(el) {
    // Skip empty or hidden elements
    if (!el || !el.textContent.trim()) return '';
    
    const tagName = el.tagName.toLowerCase();
    const text = el.textContent.trim();
    
    // Handle different element types
    switch (tagName) {
        case 'p':
            return text;
            
        case 'ul':
        case 'ol':
            const items = Array.from(el.querySelectorAll('li'))
                .map((li, i) => {
                    const prefix = tagName === 'ul' ? '• ' : `${i+1}. `;
                    return `${prefix}${li.textContent.trim()}`;
                })
                .filter(txt => txt.length > 0);
            return items.join('\n');
            
        case 'table':
            const rows = Array.from(el.querySelectorAll('tr'))
                .map(row => {
                    return Array.from(row.querySelectorAll('th, td'))
                        .map(cell => cell.textContent.trim())
                        .join(' | ');
                })
                .filter(row => row.length > 0);
            return 'TABLE:\n' + rows.join('\n');
            
        case 'pre':
        case 'code':
            return '```\n' + text + '\n```';
            
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
            return `## ${text}`;
            
        default:
            if (text.length > 0) return text;
            return '';
    }
}

/**
 * Extracts content from a section using its ID or alternative selectors
 * @param {string} primarySelector - The primary selector to try first (usually an ID like '#description')
 * @param {Array<string>} alternativeSelectors - Fallback selectors to try if primary fails
 * @return {string} The extracted and formatted content
 */
function extractContent(primarySelector, alternativeSelectors = []) {
    // Find the section using primary selector
    let section = document.querySelector(primarySelector);
    
    // If not found, try the alternative selectors
    if (!section && alternativeSelectors.length > 0) {
        for (const selector of alternativeSelectors) {
            section = document.querySelector(selector);
            if (section) break;
        }
    }
    
    // If still no section found, return empty string
    if (!section) return '';
    
    // Get direct children of the main content area
    // Look for common content containers first
    const contentArea = section.querySelector('.sc-etVRix') || 
                       section.querySelector('.sc-DYLTT .fHjysw') || 
                       section;
    
    // Process each child element
    const parts = [];
    for (const child of contentArea.children) {
        const formatted = formatElement(child);
        if (formatted) parts.push(formatted);
    }
    
    return parts.join('\n\n');
}

/**
 * Extracts description content with fallbacks
 * @return {string} The extracted description content
 */
function extractDescription() {
    return extractContent('#description', ['#abstract', '#overview']);
}

/**
 * Extracts evaluation content with fallbacks
 * @return {string} The extracted evaluation content
 */
function extractEvaluation() {
    return extractContent('#evaluation', ['#scoring', '[data-testid="evaluation"]']);
}

/**
 * Extracts competition deadline timestamp from title attribute
 * @return {string} Raw deadline timestamp string or null if not found
 */
/**
 * Extracts competition deadline (close date) timestamp from title attribute
 * @return {string} Raw deadline timestamp string or null if not found
 */
function extractDeadline() {
    // Target the span near "Close" text specifically
    const closeHeading = Array.from(document.querySelectorAll('.sc-etfXYe'))
        .find(el => el.textContent.trim() === 'Close');
    
    if (closeHeading) {
        // Navigate from the heading to its parent, then find the span with title attribute
        const parentDiv = closeHeading.closest('.sc-eMnNoy');
        if (parentDiv) {
            const deadlineSpan = parentDiv.querySelector('span[title]');
            return deadlineSpan ? deadlineSpan.getAttribute('title') : null;
        }
    }
    
    // Fallback: Try to find the span with "days to go" which is typically the deadline
    const daysToGoSpan = Array.from(document.querySelectorAll('span[aria-label]'))
        .find(span => span.getAttribute('aria-label')?.includes('days to go'));
    
    if (daysToGoSpan) {
        const parentSpan = daysToGoSpan.closest('span[title]');
        return parentSpan ? parentSpan.getAttribute('title') : null;
    }
    
    // Second fallback: Look for the rightmost date in the timeline section
    const timelineDates = document.querySelectorAll('.sc-gGarWV span[title]');
    if (timelineDates.length >= 2) {
        // Get the last date (usually the close date)
        return timelineDates[timelineDates.length - 1].getAttribute('title');
    }
    
    return null;
}

/**
 * Extracts competition start time timestamp from title attribute
 * @return {string} Raw start timestamp string or null if not found
 */
function extractStartTime() {
    // Target the span near "Start" text specifically
    const startHeading = Array.from(document.querySelectorAll('.sc-etfXYe'))
        .find(el => el.textContent.trim() === 'Start');
    
    if (startHeading) {
        // Navigate from the heading to its parent, then find the span with title attribute
        const parentDiv = startHeading.closest('.sc-eMnNoy');
        if (parentDiv) {
            const startSpan = parentDiv.querySelector('span[title]');
            return startSpan ? startSpan.getAttribute('title') : null;
        }
    }
    
    // Fallback: Look for the leftmost date in the timeline section
    const timelineDates = document.querySelectorAll('.sc-gGarWV span[title]');
    if (timelineDates.length >= 1) {
        // Get the first date (usually the start date)
        return timelineDates[0].getAttribute('title');
    }
    
    // Second fallback: Try to find any span with "days ago" which might be the start date
    const daysAgoSpan = Array.from(document.querySelectorAll('span[aria-label]'))
        .find(span => span.getAttribute('aria-label')?.includes('days ago'));
    
    if (daysAgoSpan) {
        const parentSpan = daysAgoSpan.closest('span[title]');
        return parentSpan ? parentSpan.getAttribute('title') : null;
    }
    
    return null;
}

/**
 * Extracts discussion content from a Kaggle discussion page
 * @returns {Object} Discussion content including author info, datetime, content, etc.
 */
function extractDiscussionContent() {
    try {
        // Get the main discussion header
        const header = document.querySelector('[data-testid="discussions-topic-header"]');
        if (!header) return { error: "Discussion header not found" };
        
        // Extract post datetime
        const dateTimeElement = header.querySelector('span[title][aria-label*="ago"]');
        const posted_datetime = dateTimeElement ? dateTimeElement.getAttribute('title') : null;
        
        // Extract content with better selector handling
        const contentElement = header.querySelector('.sc-etVRix') || 
                              header.querySelector('.sc-gONMyw .sc-cBjGLZ .sc-etVRix') ||
                              document.querySelector('.sc-cBjGLZ .sc-etVRix');
        const content = contentElement ? contentElement.innerText : null;
        
        // Extract author name
        const authorElement = header.querySelector('a[href^="/"].sc-fFwTJo .sc-brzPDJ') || 
                             header.querySelector('a[href^="/"] span.sc-brzPDJ');
        const author = authorElement ? authorElement.innerText : null;
        
        // Extract competition rank with improved selector
        let competitionRank = 'Unranked';
        const rankTexts = Array.from(header.querySelectorAll('.sc-brzPDJ, .sc-brzPDJ.beerbN'))
            .map(el => el.textContent.trim())
            .filter(text => text.includes('in this Competition'));
        
        if (rankTexts.length > 0) {
            const rankMatch = rankTexts[0].match(/(\d+)(st|nd|rd|th)/);
            if (rankMatch) {
                competitionRank = rankMatch[0];
            }
        }
        
        // Extract author Kaggle rank with better handling for both SVG formats
        let kaggleRank = 'Unknown';
        const authorAvatar = header.querySelector('a[href^="/"] svg');
        
        if (authorAvatar) {
            // Check if there are two circles (Grandmaster style)
            const circles = authorAvatar.querySelectorAll('circle');
            if (circles.length >= 2) {
                // See if the second circle has a special color (Grandmaster)
                const secondCircle = circles[1];
                const strokeStyle = window.getComputedStyle(secondCircle).stroke;
                
                if (strokeStyle.includes('235, 204, 41') || strokeStyle === 'rgb(235, 204, 41)') {
                    kaggleRank = 'Grandmaster';
                }
            }
            
            // Check for path element (non-Grandmaster style)
            if (kaggleRank === 'Unknown') {
                const path = authorAvatar.querySelector('path');
                if (path) {
                    const strokeStyle = window.getComputedStyle(path).stroke;
                    
                    // Map stroke color to Kaggle rank
                    if (strokeStyle.includes('255, 92, 25') || strokeStyle === 'rgb(255, 92, 25)') 
                        kaggleRank = 'Master';
                    else if (strokeStyle.includes('129, 72, 253') || strokeStyle === 'rgb(129, 72, 253)') 
                        kaggleRank = 'Expert';
                    else if (strokeStyle.includes('205, 127, 50') || strokeStyle === 'rgb(32, 190, 255)') 
                        kaggleRank = 'Contributor';
                    else if (strokeStyle.includes('31, 166, 65') || strokeStyle === 'rgb(31, 166, 65)') 
                        kaggleRank = 'Novice';
                }
            }
        }
        
        // Get upvote count with more flexible selector
        let upvotes = 0;
        const upvoteButton = header.querySelector('button[aria-label*="votes"]') || 
                           header.querySelector('button[aria-live="polite"]');
        
        if (upvoteButton) {
            const upvoteText = upvoteButton.textContent.trim();
            const upvoteMatch = upvoteText.match(/\d+/);
            if (upvoteMatch) {
                upvotes = parseInt(upvoteMatch[0], 10);
            }
        }
        
        // Get post title with more reliable selector
        const titleElement = header.querySelector('h3') || 
                           header.querySelector('.sc-jPkiSJ') || 
                           header.querySelector('.sc-hNZkKh');
        const title = titleElement ? titleElement.textContent.trim() : null;
        
        // Check for medal/award with better detection
        let medalType = null;
        const medalImg = header.querySelector('img[alt*="medal"]') || 
                        header.querySelector('img[src*="medal"]');
        
        if (medalImg) {
            const imgSrc = medalImg.src || '';
            const imgAlt = medalImg.alt || '';
            
            if (imgSrc.includes('gold') || imgAlt.includes('gold')) 
                medalType = 'Gold';
            else if (imgSrc.includes('silver') || imgAlt.includes('silver')) 
                medalType = 'Silver';
            else if (imgSrc.includes('bronze') || imgAlt.includes('bronze')) 
                medalType = 'Bronze';
            else 
                medalType = 'Unknown';
        }
        
        // Debugging output to see what we're getting
        console.log({
            title,
            author,
            posted_datetime,
            competitionRank,
            kaggleRank,
            medalType
        });
        
        return {
            title,
            author,
            posted_datetime,
            content,
            competitionRank,
            kaggleRank,
            upvotes,
            medalType
        };
    } catch (error) {
        console.error("Error extracting discussion content:", error);
        return {
            error: `Error extracting discussion content: ${error.message}`
        };
    }
}