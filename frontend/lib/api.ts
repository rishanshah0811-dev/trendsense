const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function validateTicker(
  ticker: string
): Promise<{ valid: boolean; name: string; exchange: string }> {
  const res = await fetch(`${API_URL}/tickers/validate/${ticker}`);
  return res.json();
}

export function streamAnalysis(
  ticker: string,
  startDate: string,
  endDate: string,
  bullishThreshold: number,
  bearishThreshold: number
): ReadableStream<Uint8Array> | null {
  const controller = new AbortController();

  const fetchPromise = fetch(`${API_URL}/analyse/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker,
      start_date: startDate,
      end_date: endDate,
      bullish_threshold: bullishThreshold,
      bearish_threshold: bearishThreshold,
    }),
    signal: controller.signal,
  });

  return new ReadableStream({
    async start(streamController) {
      try {
        const response = await fetchPromise;
        if (!response.body) {
          streamController.close();
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamController.enqueue(decoder.decode(value, { stream: true }));
        }
        streamController.close();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          streamController.error(err);
        }
      }
    },
    cancel() {
      controller.abort();
    },
  }) as unknown as ReadableStream<Uint8Array>;
}

export async function filterSignals(
  rawProbas: Array<{
    date: string;
    price: number;
    bullish_prob: number;
    bearish_prob: number;
    index: number;
  }>,
  bullishThreshold: number,
  bearishThreshold: number,
  lookAhead: number
) {
  const res = await fetch(`${API_URL}/signals/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_probas: rawProbas,
      bullish_threshold: bullishThreshold,
      bearish_threshold: bearishThreshold,
      look_ahead: lookAhead,
    }),
  });
  return res.json();
}

export { API_URL };
