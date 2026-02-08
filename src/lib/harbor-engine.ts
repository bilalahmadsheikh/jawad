// ============================================================
// Harbor Engine - Permission checking and policy management
// ============================================================

import type { HarborPolicy, PermissionLevel } from './types';
import { DEFAULT_HARBOR_POLICY, CRITICAL_ACTION_KEYWORDS } from './constants';

/**
 * Load the Harbor policy from browser storage.
 */
export async function getHarborPolicy(): Promise<HarborPolicy> {
  try {
    const data = await browser.storage.local.get('jawad_harbor');
    return (data.jawad_harbor as HarborPolicy) || DEFAULT_HARBOR_POLICY;
  } catch {
    return DEFAULT_HARBOR_POLICY;
  }
}

/**
 * Save the Harbor policy to browser storage.
 */
export async function saveHarborPolicy(policy: HarborPolicy): Promise<void> {
  await browser.storage.local.set({ jawad_harbor: policy });
}

/**
 * Check if a tool call is permitted on a given site.
 * Returns 'auto-approve', 'ask', or 'deny'.
 */
export function checkPermission(
  policy: HarborPolicy,
  toolName: string,
  permLevel: PermissionLevel,
  site: string
): 'auto-approve' | 'ask' | 'deny' {
  // 1. Check tool-level overrides
  const toolOverride = policy.toolOverrides[toolName];
  if (toolOverride) {
    if (!toolOverride.enabled) return 'deny';
    if (toolOverride.globalAutoApprove) return 'auto-approve';
  }

  // 2. Check site-level trust
  const siteTrust = policy.trustedSites[site];
  if (siteTrust) {
    // Check if trust has expired
    if (siteTrust.expiresAt && Date.now() > siteTrust.expiresAt) {
      // Expired - fall through to defaults
    } else {
      if (siteTrust.trustLevel === 'blocked') return 'deny';

      // Check explicit tool lists
      if (siteTrust.autoApprove.includes(toolName)) return 'auto-approve';
      if (siteTrust.requireConfirm.includes(toolName)) return 'ask';

      // Compare trust level hierarchy vs permission level
      const trustHierarchy = [
        'blocked',
        'read-only',
        'navigate',
        'interact',
        'full',
      ];
      const permHierarchy: PermissionLevel[] = [
        'read-only',
        'navigate',
        'interact',
        'submit',
      ];

      const trustIdx = trustHierarchy.indexOf(siteTrust.trustLevel);
      const permIdx = permHierarchy.indexOf(permLevel);

      // trust level is 1-indexed (blocked=0), perm level is 0-indexed
      if (trustIdx > permIdx + 1) return 'auto-approve';
      if (trustIdx > permIdx) return 'auto-approve';
    }
  }

  // 3. Fall back to global defaults
  const defaultKey =
    permLevel === 'read-only'
      ? 'readOnly'
      : permLevel === 'navigate'
        ? 'navigate'
        : permLevel === 'interact'
          ? 'interact'
          : 'submit';

  const defaultDecision = policy.defaults[defaultKey];

  if (defaultDecision === 'auto-approve') return 'auto-approve';
  if (defaultDecision === 'deny') return 'deny';
  return 'ask';
}

/**
 * Update Harbor policy after a user permission decision.
 */
export async function updateHarborPolicyForDecision(
  toolName: string,
  site: string,
  decision: string
): Promise<void> {
  const policy = await getHarborPolicy();

  if (!policy.trustedSites[site]) {
    policy.trustedSites[site] = {
      trustLevel: 'read-only',
      autoApprove: [],
      requireConfirm: [],
    };
  }

  if (decision === 'allow-site') {
    if (!policy.trustedSites[site].autoApprove.includes(toolName)) {
      policy.trustedSites[site].autoApprove.push(toolName);
    }
  } else if (decision === 'allow-session') {
    if (!policy.trustedSites[site].autoApprove.includes(toolName)) {
      policy.trustedSites[site].autoApprove.push(toolName);
    }
    // Session = 24 hours max
    policy.trustedSites[site].expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  } else if (decision === 'deny-all') {
    policy.toolOverrides[toolName] = {
      enabled: false,
      globalAutoApprove: false,
    };
  }

  await saveHarborPolicy(policy);
}

/**
 * Detect if an action targets a critical/dangerous element.
 */
export function isCriticalAction(
  buttonText: string,
  url: string
): boolean {
  const lowerText = buttonText.toLowerCase();
  const lowerUrl = url.toLowerCase();

  return (
    CRITICAL_ACTION_KEYWORDS.some((kw) => lowerText.includes(kw)) ||
    lowerUrl.includes('/checkout') ||
    lowerUrl.includes('/payment') ||
    lowerUrl.includes('/purchase') ||
    lowerUrl.includes('/order')
  );
}

