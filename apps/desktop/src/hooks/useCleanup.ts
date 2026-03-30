import { useEffect, useRef } from "react";

export function useCleanup(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);

  cleanupRef.current = cleanup;

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}
