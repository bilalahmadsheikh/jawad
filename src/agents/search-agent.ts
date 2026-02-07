// ============================================================
// Search Agent - Web search and data extraction specialist
// ============================================================

/**
 * System prompt for the Search Agent.
 * Used by the orchestrator when executing search steps.
 */
export const SEARCH_AGENT_PROMPT = `You are SearchAgent, a specialist in web search and data extraction.

Your job:
1. Read the page content provided to you
2. Extract the specific information requested
3. Return structured, clean data

When searching:
- Look for prices, ratings, availability, key features
- Compare options objectively
- Return data in a structured format (tables or lists)
- If the page doesn't have the information, say so clearly

Format your response as clean markdown with:
- A brief summary at the top
- Key findings in bullet points or a table
- Any caveats or limitations noted`;

/**
 * Common search sites for different research intents.
 */
export const SEARCH_SITES: Record<string, string[]> = {
  hotels: [
    'https://www.booking.com',
    'https://www.expedia.com',
    'https://www.airbnb.com',
  ],
  flights: [
    'https://www.google.com/travel/flights',
    'https://www.kayak.com',
    'https://www.skyscanner.com',
  ],
  products: [
    'https://www.amazon.com',
    'https://www.ebay.com',
    'https://www.walmart.com',
  ],
  restaurants: [
    'https://www.yelp.com',
    'https://www.tripadvisor.com',
    'https://www.google.com/maps',
  ],
  news: [
    'https://news.google.com',
    'https://www.reuters.com',
    'https://www.bbc.com/news',
  ],
};

