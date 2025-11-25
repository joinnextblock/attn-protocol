/**
 * Relay publisher for publishing events to Nostr relays
 */

import WebSocket from "ws";
import type { Event } from "nostr-tools";
import type { PublishResult, PublishResults } from "../types/index.js";

/**
 * Publish event to a single relay
 */
export async function publish_to_relay(
  relay_url: string,
  event: Event,
  timeout_ms: number = 10000
): Promise<PublishResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(relay_url);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        resolve({
          event_id: event.id,
          relay_url,
          success: false,
          error: "Timeout waiting for relay response",
        });
      }
    }, timeout_ms);

    ws.on("open", () => {
      // Send EVENT message
      const message = JSON.stringify(["EVENT", event]);
      ws.send(message);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (Array.isArray(message) && message.length >= 2) {
          const [type, event_id, accepted, message_text] = message;

          if (type === "OK" && event_id === event.id) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              ws.close();
              resolve({
                event_id: event.id,
                relay_url,
                success: accepted === true,
                error: accepted === false ? message_text : undefined,
              });
            }
          }
        }
      } catch (error) {
        // Ignore parse errors, wait for OK message
      }
    });

    ws.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          event_id: event.id,
          relay_url,
          success: false,
          error: error.message ?? "WebSocket error",
        });
      }
    });

    ws.on("close", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          event_id: event.id,
          relay_url,
          success: false,
          error: "Connection closed before response",
        });
      }
    });
  });
}

/**
 * Publish event to multiple relays
 */
export async function publish_to_multiple(
  relay_urls: string[],
  event: Event,
  timeout_ms: number = 10000
): Promise<PublishResults> {
  const publish_promises = relay_urls.map((url) =>
    publish_to_relay(url, event, timeout_ms)
  );

  const results = await Promise.allSettled(publish_promises);

  const publish_results: PublishResult[] = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      event_id: event.id,
      relay_url: relay_urls[index] ?? "unknown",
      success: false,
      error: result.reason?.message ?? "Unknown error",
    };
  });

  const success_count = publish_results.filter((r) => r.success).length;
  const failure_count = publish_results.length - success_count;

  return {
    event_id: event.id,
    results: publish_results,
    success_count,
    failure_count,
  };
}

