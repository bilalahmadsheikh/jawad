// ============================================================
// Orchestrator - Research Mode multi-tab workflow execution
// Uses specialized agents: SearchAgent, EmailAgent, CalendarAgent, SummarizeAgent
// ============================================================

import { chatCompletion } from '../lib/any-llm-router';
import { runAgentLoop } from './agent-manager';
import { requestPermissionFromUser } from './message-handler';
import type { LLMConfig, WorkflowPlan, WorkflowStep } from '../lib/types';
import { generateId } from '../lib/constants';
import {
  SEARCH_AGENT_PROMPT,
  SEARCH_SITES,
} from '../agents/search-agent';
import {
  EMAIL_AGENT_PROMPT,
  EMAIL_SITES,
} from '../agents/email-agent';
import {
  CALENDAR_AGENT_PROMPT,
  CALENDAR_SITES,
} from '../agents/calendar-agent';
import {
  SUMMARIZE_AGENT_PROMPT,
  detectContentType,
} from '../agents/summarize-agent';

let isCancelled = false;

// Map agent names to their specialized prompts
const AGENT_PROMPTS: Record<string, string> = {
  SearchAgent: SEARCH_AGENT_PROMPT,
  EmailAgent: EMAIL_AGENT_PROMPT,
  CalendarAgent: CALENDAR_AGENT_PROMPT,
  SummarizeAgent: SUMMARIZE_AGENT_PROMPT,
  CompareAgent: SEARCH_AGENT_PROMPT, // CompareAgent uses search-style extraction
};

/**
 * Build the system prompt for a workflow step using the specialized agent.
 */
function buildStepPrompt(
  agentName: string,
  task: string,
  site: string,
  pageContent: string,
  previousContext: string,
  pageTitle?: string
): string {
  const basePrompt =
    AGENT_PROMPTS[agentName] ||
    `You are a research agent. Extract relevant information from the page content and complete the task.`;

  let contextBlock = `**Current task:** ${task}\n**Site:** ${site}\n\n**Page content:**\n${pageContent.substring(0, 4000)}`;

  if (previousContext) {
    contextBlock += `\n\n**Context from previous steps:**\n${previousContext}`;
  }

  if (agentName === 'SummarizeAgent' && pageTitle) {
    const contentType = detectContentType(site, pageTitle);
    contextBlock += `\n\n**Content type detected:** ${contentType}`;
  }

  return `${basePrompt}\n\n---\n\n${contextBlock}`;
}

/**
 * Cancel the currently running workflow.
 */
export function cancelCurrentWorkflow(): void {
  isCancelled = true;
}

/**
 * Plan and execute a Research Mode workflow.
 * 1. Use LLM to decompose the intent into steps
 * 2. Show the plan to the user for approval
 * 3. Execute each step sequentially
 */
export async function planAndExecuteWorkflow(
  intent: string,
  port: browser.Port
): Promise<void> {
  isCancelled = false;

  try {
    const config = await getConfig();

    // Step 1: Plan the workflow using LLM
    const plan = await createWorkflowPlan(config, intent);

    // Send plan to sidebar for display
    port.postMessage({
      type: 'WORKFLOW_UPDATE',
      payload: plan,
    });

    // Also send the plan as a chat response
    const planSummary = plan.steps
      .map((s, i) => `${i + 1}. **${s.agent}**: ${s.task} (${s.site})`)
      .join('\n');

    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: {
        content: `**Research Plan:**\n\n${planSummary}\n\nExecuting plan...`,
      },
    });

    // Step 2: Execute each step
    plan.status = 'running';
    const results: Record<string, unknown> = {};

    for (let i = 0; i < plan.steps.length; i++) {
      if (isCancelled) {
        plan.status = 'cancelled';
        port.postMessage({ type: 'WORKFLOW_UPDATE', payload: plan });
        port.postMessage({
          type: 'CHAT_RESPONSE',
          payload: { content: 'Workflow cancelled by user.' },
        });
        return;
      }

      const step = plan.steps[i];
      step.status = 'running';
      port.postMessage({ type: 'WORKFLOW_UPDATE', payload: plan });

      try {
        // Open the site in a new tab
        const tab = await browser.tabs.create({
          url: step.site,
          active: true,
        });
        step.tabId = tab.id;

        // Wait for page to load
        await waitForLoad(tab.id!);

        // Read the page content
        let pageContent: { markdown?: string; title?: string } | null = null;
        try {
          pageContent = (await browser.tabs.sendMessage(tab.id!, {
            type: 'READ_PAGE',
          })) as typeof pageContent;
        } catch {
          pageContent = { markdown: 'Could not read page content.', title: step.site };
        }

        // Build context from previous steps
        const previousContext = Object.entries(results)
          .map(([key, val]) => `Previous result (${key}): ${JSON.stringify(val)}`)
          .join('\n');

        // Run the specialized agent for this step
        const systemPrompt = buildStepPrompt(
          step.agent,
          step.task,
          step.site,
          pageContent?.markdown || 'No content',
          previousContext,
          pageContent?.title
        );

        const stepMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: step.task },
        ];

        const stepResult = await runAgentLoop(
          config,
          stepMessages,
          port,
          requestPermissionFromUser
        );

        step.result = stepResult;
        step.status = 'completed';
        results[`step_${i + 1}_${step.agent}`] = stepResult;

        port.postMessage({ type: 'WORKFLOW_UPDATE', payload: plan });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        step.status = 'error';
        step.error = msg;
        port.postMessage({ type: 'WORKFLOW_UPDATE', payload: plan });
      }
    }

    // Step 3: Aggregate results
    plan.status = 'completed';
    port.postMessage({ type: 'WORKFLOW_UPDATE', payload: plan });

    // Generate final summary
    const completedSteps = plan.steps.filter((s) => s.status === 'completed');
    const summaryParts = completedSteps.map(
      (s, i) => `**Step ${i + 1} (${s.agent}):** ${s.result || 'No result'}`
    );

    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: {
        content: `**Research Complete!**\n\n${summaryParts.join('\n\n')}`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: {
        content: `Workflow error: ${msg}`,
        isError: true,
      },
    });
  }
}

/**
 * Use the LLM to create a structured workflow plan from a user's intent.
 * Includes specialized agent types and suggested sites.
 */
async function createWorkflowPlan(
  config: LLMConfig,
  intent: string
): Promise<WorkflowPlan> {
  const siteHints = `Suggested sites by agent type:
- SearchAgent: ${SEARCH_SITES.products.join(', ')}; ${SEARCH_SITES.flights.join(', ')};
  Google search: https://www.google.com/search?q=QUERY
- CalendarAgent: ${CALENDAR_SITES.join(', ')}
- EmailAgent: ${EMAIL_SITES.join(', ')}
- SummarizeAgent: Use any article/product URL the user wants summarized`;

  const response = await chatCompletion(config, {
    messages: [
      {
        role: 'system',
        content: `You are a workflow planner. Given a user's intent, decompose it into a sequence of web research steps.

Each step should have:
- agent: One of SearchAgent, CalendarAgent, EmailAgent, SummarizeAgent, or CompareAgent
  - SearchAgent: for searching products, flights, hotels, news, comparisons
  - CalendarAgent: for checking calendar, availability, conflicts
  - EmailAgent: for drafting emails (opens Gmail/Outlook compose)
  - SummarizeAgent: for summarizing a page or article
  - CompareAgent: for comparing options across sites
- task: What the agent should do on that page
- site: The exact URL to visit (use real URLs)

${siteHints}

Respond with ONLY valid JSON in this format:
{
  "steps": [
    { "agent": "SearchAgent", "task": "Search for...", "site": "https://www.google.com/search?q=..." },
    ...
  ]
}

Keep it to 3-5 steps. Use real, common websites. For search, use Google with the query in the URL.`,
      },
      {
        role: 'user',
        content: intent,
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '{"steps":[]}';

  // Parse the JSON response
  let parsed: { steps: Array<{ agent: string; task: string; site: string }> };
  try {
    // Try to extract JSON from the response (LLM might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    // Fallback: create a simple single-step plan
    parsed = {
      steps: [
        {
          agent: 'SearchAgent',
          task: intent,
          site: 'https://www.google.com/search?q=' + encodeURIComponent(intent),
        },
      ],
    };
  }

  const plan: WorkflowPlan = {
    id: generateId(),
    intent,
    steps: parsed.steps.map((s, i) => ({
      id: `step_${i}_${generateId()}`,
      agent: s.agent,
      task: s.task,
      site: s.site,
      permissions: ['read-only', 'navigate'] as WorkflowStep['permissions'],
      status: 'pending' as const,
    })),
    status: 'awaiting-approval',
    createdAt: Date.now(),
  };

  return plan;
}

async function getConfig(): Promise<LLMConfig> {
  const data = await browser.storage.local.get('jawad_config');
  const config = data.jawad_config as LLMConfig | undefined;
  if (!config) {
    throw new Error('LLM not configured.');
  }
  return config;
}

function waitForLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      id: number,
      info: { status?: string }
    ) => {
      if (id === tabId && info.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1000); // Extra time for JS rendering
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}
