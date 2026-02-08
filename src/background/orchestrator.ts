// ============================================================
// Orchestrator - Research Mode multi-tab workflow execution
// ============================================================

import { chatCompletion } from '../lib/any-llm-router';
import { runAgentLoop } from './agent-manager';
import { requestPermissionFromUser } from './message-handler';
import type { LLMConfig, WorkflowPlan, WorkflowStep } from '../lib/types';
import { generateId } from '../lib/constants';

let isCancelled = false;

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

        // Run agent for this step
        const stepMessages = [
          {
            role: 'system',
            content: `You are a research agent. Your current task: ${step.task}\nSite: ${step.site}\nPage content:\n${pageContent?.markdown?.substring(0, 3000) || 'No content'}\n\n${previousContext ? `Context from previous steps:\n${previousContext}` : ''}`,
          },
          {
            role: 'user',
            content: step.task,
          },
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
 */
async function createWorkflowPlan(
  config: LLMConfig,
  intent: string
): Promise<WorkflowPlan> {
  const response = await chatCompletion(config, {
    messages: [
      {
        role: 'system',
        content: `You are a workflow planner. Given a user's intent, decompose it into a sequence of web research steps.

Each step should have:
- agent: The type of agent (SearchAgent, CalendarAgent, EmailAgent, CompareAgent)
- task: What the agent should do
- site: The URL to visit

Respond with ONLY valid JSON in this format:
{
  "steps": [
    { "agent": "SearchAgent", "task": "Search for...", "site": "https://..." },
    ...
  ]
}

Keep it to 3-5 steps. Use real, common websites.`,
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
  const data = await browser.storage.local.get('foxagent_config');
  const config = data.foxagent_config as LLMConfig | undefined;
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
