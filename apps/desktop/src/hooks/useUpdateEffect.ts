import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";

export function useUpdateEffect(effect: EffectCallback, deps: DependencyList) {
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    return effect();
  }, deps);
}
