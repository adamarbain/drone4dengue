import { useState, useEffect, useRef } from 'react';

/**
 * Hook that ensures a loading state is shown for a minimum duration
 * @param isLoading - The actual loading state from data fetching
 * @param minimumTime - Minimum time in milliseconds to show loading (default: 2000ms)
 * @returns A boolean indicating whether to show the loader (ensures minimum display time)
 */
export function useMinimumLoadingTime(isLoading: boolean, minimumTime: number = 2000): boolean {
  const [showLoader, setShowLoader] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading started - record the start time
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      setShowLoader(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      // Loading finished - check if minimum time has passed
      if (startTimeRef.current !== null) {
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = minimumTime - elapsedTime;

        if (remainingTime > 0) {
          // Wait for the remaining time before hiding the loader
          timeoutRef.current = setTimeout(() => {
            setShowLoader(false);
            startTimeRef.current = null;
          }, remainingTime);
        } else {
          // Minimum time has already passed, hide immediately
          setShowLoader(false);
          startTimeRef.current = null;
        }
      } else {
        // No start time recorded, hide immediately
        setShowLoader(false);
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minimumTime]);

  return showLoader;
}
