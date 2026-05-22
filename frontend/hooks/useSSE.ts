"use client";

import { useState, useCallback, useRef } from "react";
import { SSEEvent } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useSSE() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      ticker: string,
      startDate: string,
      endDate: string,
      bullishThreshold: number,
      bearishThreshold: number
    ) => {
      setEvents([]);
      setError(null);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch(`${API_URL}/analyse/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            start_date: startDate,
            end_date: endDate,
            bullish_threshold: bullishThreshold,
            bearish_threshold: bearishThreshold,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.body) {
          setError("No response stream");
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            try {
              const event: SSEEvent = JSON.parse(jsonStr);
              setEvents((prev) => [...prev, event]);

              if (event.error) {
                setError(event.error);
                setIsStreaming(false);
                return;
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }

        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Stream failed");
        }
        setIsStreaming(false);
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { events, isStreaming, error, startStream, stopStream };
}
