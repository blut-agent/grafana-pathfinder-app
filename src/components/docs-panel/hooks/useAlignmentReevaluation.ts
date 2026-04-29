import { useEffect, useRef, useState } from 'react';
import { locationService } from '@grafana/runtime';

import { interactiveStepStorage } from '../../../lib/user-storage';
import type { DocsPanelModelOperations } from '../types';

const SKIP_REEVALUATION_TAB_IDS = new Set(['recommendations', 'editor', 'devtools']);

export function useAlignmentReevaluation(
  model: Pick<DocsPanelModelOperations, 'reevaluateAlignment'>,
  activeTabId: string | undefined,
  progressKey: string
): [boolean, (hasProgress: boolean) => void] {
  const [hasInteractiveProgress, setHasInteractiveProgress] = useState(false);

  useEffect(() => {
    void (progressKey ? interactiveStepStorage.hasProgress(progressKey) : Promise.resolve(false)).then(
      setHasInteractiveProgress
    );
  }, [progressKey]);

  useEffect(() => {
    const handleProgressSaved = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.contentKey === progressKey && detail?.hasProgress) {
        setHasInteractiveProgress(true);
      }
    };

    window.addEventListener('interactive-progress-saved', handleProgressSaved);
    return () => {
      window.removeEventListener('interactive-progress-saved', handleProgressSaved);
    };
  }, [progressKey]);

  const activeTabIdRef = useRef(activeTabId);
  const hasInteractiveProgressRef = useRef(hasInteractiveProgress);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    hasInteractiveProgressRef.current = hasInteractiveProgress;
  }, [hasInteractiveProgress]);

  useEffect(() => {
    const history = locationService.getHistory();
    const unlisten = history.listen((newLocation: { pathname: string }) => {
      if (hasInteractiveProgressRef.current) {
        return;
      }
      const tabId = activeTabIdRef.current;
      if (!tabId || SKIP_REEVALUATION_TAB_IDS.has(tabId)) {
        return;
      }
      model.reevaluateAlignment(tabId, newLocation.pathname);
    });
    return unlisten;
  }, [model]);

  return [hasInteractiveProgress, setHasInteractiveProgress];
}
