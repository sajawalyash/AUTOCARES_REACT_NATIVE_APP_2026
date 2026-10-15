import { useEffect, useState } from 'react';

import { listServiceCategories } from '../lib/admin';
import type { ProblemType } from '../lib/types';
import { PROBLEM_LABELS } from '../lib/types';

export function useProblemLabels() {
  const [labels, setLabels] = useState<Record<ProblemType, string>>(PROBLEM_LABELS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    listServiceCategories(true).then((result) => {
      if (!isMounted) return;
      if (result.error) {
        setError(result.error);
        return;
      }
      setLabels((current) => {
        const next = { ...current };
        for (const category of result.categories) next[category.id] = category.label;
        return next;
      });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { problemLabels: labels, categoryError: error };
}
