import { useState, useEffect, useCallback } from 'react';
import type { HarborPolicy } from '../../lib/types';
import { DEFAULT_HARBOR_POLICY } from '../../lib/constants';

/**
 * Hook for managing Harbor policy (persistent in browser.storage.local).
 */
export function useHarbor() {
  const [policy, setPolicy] = useState<HarborPolicy>(DEFAULT_HARBOR_POLICY);
  const [isLoading, setIsLoading] = useState(true);

  // Load policy from storage on mount
  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const data = await browser.storage.local.get('jawad_harbor');
      if (data.jawad_harbor) {
        setPolicy(data.jawad_harbor as HarborPolicy);
      }
    } catch {
      // Use default policy
    }
    setIsLoading(false);
  };

  const savePolicy = useCallback(async (newPolicy: HarborPolicy) => {
    try {
      await browser.storage.local.set({ jawad_harbor: newPolicy });
      setPolicy(newPolicy);
    } catch (e) {
      console.error('Failed to save Harbor policy:', e);
    }
  }, []);

  const updateSiteTrust = useCallback(
    async (
      domain: string,
      trustLevel: string,
      autoApprove: string[] = [],
      requireConfirm: string[] = []
    ) => {
      const newPolicy = { ...policy };
      newPolicy.trustedSites = {
        ...newPolicy.trustedSites,
        [domain]: {
          trustLevel: trustLevel as 'blocked' | 'read-only' | 'navigate' | 'interact' | 'full',
          autoApprove,
          requireConfirm,
        },
      };
      await savePolicy(newPolicy);
    },
    [policy, savePolicy]
  );

  const removeSiteTrust = useCallback(
    async (domain: string) => {
      const newPolicy = { ...policy };
      const sites = { ...newPolicy.trustedSites };
      delete sites[domain];
      newPolicy.trustedSites = sites;
      await savePolicy(newPolicy);
    },
    [policy, savePolicy]
  );

  const updateDefaults = useCallback(
    async (defaults: Partial<HarborPolicy['defaults']>) => {
      const newPolicy = {
        ...policy,
        defaults: { ...policy.defaults, ...defaults },
      };
      await savePolicy(newPolicy);
    },
    [policy, savePolicy]
  );

  const resetPolicy = useCallback(async () => {
    await savePolicy(DEFAULT_HARBOR_POLICY);
  }, [savePolicy]);

  return {
    policy,
    isLoading,
    savePolicy,
    updateSiteTrust,
    removeSiteTrust,
    updateDefaults,
    resetPolicy,
  };
}

