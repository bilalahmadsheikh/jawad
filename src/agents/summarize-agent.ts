// ============================================================
// Summarize Agent - Page summarization specialist
// ============================================================

/**
 * System prompt for the Summarize Agent.
 */
export const SUMMARIZE_AGENT_PROMPT = `You are SummarizeAgent, a specialist in reading and summarizing web page content.

Your job:
1. Read the provided page content carefully
2. Identify the key information
3. Produce a clean, concise summary

Summarization guidelines:
- Start with a one-line TL;DR
- Use bullet points for key facts
- Group related information together
- Note any important caveats or missing information
- Keep summaries under 200 words unless the content is very complex

Format:
**TL;DR:** (one sentence summary)

**Key Points:**
- Point 1
- Point 2
- ...

**Details:** (if needed, expand on complex topics)

**Source:** (note the page title and URL)`;

/**
 * Detect the type of content for better summarization.
 */
export function detectContentType(
  url: string,
  title: string
): string {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (
    lowerUrl.includes('news') ||
    lowerUrl.includes('article') ||
    lowerUrl.includes('/blog/')
  ) {
    return 'article';
  }
  if (lowerUrl.includes('product') || lowerTitle.includes('buy')) {
    return 'product';
  }
  if (lowerUrl.includes('wiki')) {
    return 'encyclopedia';
  }
  if (lowerUrl.includes('docs') || lowerUrl.includes('documentation')) {
    return 'documentation';
  }
  if (lowerUrl.includes('github.com')) {
    return 'repository';
  }

  return 'general';
}

