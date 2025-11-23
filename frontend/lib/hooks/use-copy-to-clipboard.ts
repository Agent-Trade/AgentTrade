import { useState, useCallback, useRef } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!text) return false;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopied(false);
      return false;
    }
  }, []);

  return { copy, copied };
}

