import { useEffect, useRef } from "react";

interface HardwareBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Universal Hardware Barcode Scanner Hook
 * Listens for rapid keystrokes emitted by USB/Bluetooth barcode guns.
 */
export function useHardwareBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 6,
  maxIntervalMs = 50,
}: HardwareBarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Ignore modifier keys
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement;
      // Allow hardware scanning even in input elements if barcode scanner sends fast input,
      // but avoid intercepting normal typing in input/textarea/contenteditable unless scanner is very fast.
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        if (bufferRef.current.length >= minChars) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = "";
          if (barcode) {
            // Prevent default form submit if scanner triggered Enter
            if (isInput) event.preventDefault();
            onScan(barcode);
          }
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Scanner characters arrive in rapid succession (<50ms per key)
      if (event.key.length === 1) {
        if (interval > maxIntervalMs && !isInput) {
          // Reset buffer if delay was too long and user was not typing in an input
          bufferRef.current = event.key;
        } else if (interval <= maxIntervalMs) {
          bufferRef.current += event.key;
        } else if (!isInput) {
          bufferRef.current += event.key;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs, onScan]);
}
