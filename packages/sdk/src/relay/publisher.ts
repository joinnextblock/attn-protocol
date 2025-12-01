/**
 * Relay publisher for publishing events to Nostr relays
 */

import WebSocket from "ws";
import type { Event } from "nostr-tools";
import { finalizeEvent, getPublicKey, utils } from "nostr-tools";
import type { PublishResult, PublishResults } from "../types/index.js";

/**
 * Publish event to a single relay with NIP-42 authentication
 */
export async function publish_to_relay(
  relay_url: string,
  event: Event,
  private_key: Uint8Array,
  timeout_ms: number = 10000,
  auth_timeout_ms: number = 10000
): Promise<PublishResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(relay_url);
    let resolved = false;
    let is_authenticated = false;
    let auth_event_id: string | null = null;
    let auth_timeout: NodeJS.Timeout | null = null;
    let publish_timeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (auth_timeout) {
        clearTimeout(auth_timeout);
        auth_timeout = null;
      }
      if (publish_timeout) {
        clearTimeout(publish_timeout);
        publish_timeout = null;
      }
    };

    const fail = (error: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        ws.close();
        resolve({
          event_id: event.id,
          relay_url,
          success: false,
          error,
        });
      }
    };

    ws.on("open", () => {
      // Wait for AUTH challenge - do not send EVENT until authenticated
      // Set timeout for AUTH challenge
      auth_timeout = setTimeout(() => {
        if (!is_authenticated && !resolved) {
          fail("No AUTH challenge received from relay - NIP-42 authentication required");
        }
      }, auth_timeout_ms);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (!Array.isArray(message) || message.length < 1) {
          return;
        }

        const [type, ...rest] = message;

        // Handle AUTH challenge (NIP-42)
        if (type === "AUTH" && !is_authenticated) {
          const challenge = rest[0];
          if (challenge && typeof challenge === "string") {
            // Normalize relay URL for challenge tag
            let normalized_relay_url = relay_url.trim();
            if (normalized_relay_url.endsWith("/")) {
              normalized_relay_url = normalized_relay_url.slice(0, -1);
            }

            try {
              const url = new URL(normalized_relay_url);
              normalized_relay_url = `${url.protocol}//${url.host}`;
            } catch {
              // Use original URL if parsing fails
            }

            try {
              // Ensure private_key is a Uint8Array
              const private_key_copy = new Uint8Array(private_key);

              // Get public key from private key
              const public_key_result: unknown = getPublicKey(private_key_copy);
              let public_key_hex: string;
              if (public_key_result instanceof Uint8Array) {
                public_key_hex = utils.bytesToHex(public_key_result);
              } else if (typeof public_key_result === "string") {
                public_key_hex = public_key_result;
              } else {
                fail("getPublicKey returned unexpected type");
                return;
              }

              // Create kind 22242 authentication event
              const auth_event = {
                kind: 22242,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                  ["relay", normalized_relay_url],
                  ["challenge", challenge],
                ],
                content: "",
                pubkey: public_key_hex,
              };

              // Sign the event
              const signed_auth_event = finalizeEvent(auth_event, private_key_copy);
              auth_event_id = signed_auth_event.id;

              // Send AUTH response
              const auth_message = JSON.stringify(["AUTH", signed_auth_event]);
              ws.send(auth_message);

              // Set timeout for OK response
              auth_timeout = setTimeout(() => {
                if (!is_authenticated) {
                  fail("Authentication timeout: No OK response received");
                }
              }, auth_timeout_ms);
            } catch (error) {
              fail(
                `Failed to create authentication event: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          }
          return;
        }

        // Handle OK response for authentication
        if (type === "OK" && !is_authenticated && auth_event_id) {
          const event_id = rest[0];
          const accepted = rest[1];
          if (event_id === auth_event_id) {
            if (auth_timeout) {
              clearTimeout(auth_timeout);
              auth_timeout = null;
            }
            if (accepted === true) {
              is_authenticated = true;
              auth_event_id = null;
              // Now send the EVENT message
              const event_message = JSON.stringify(["EVENT", event]);
              ws.send(event_message);
              // Set timeout for publish OK response
              publish_timeout = setTimeout(() => {
                if (!resolved) {
                  fail("Timeout waiting for relay response");
                }
              }, timeout_ms);
            } else {
              const error_message = rest[2] || "Unknown reason";
              fail(`Authentication rejected by relay: ${error_message}`);
            }
          }
          return;
        }

        // Handle OK response for published event
        if (type === "OK" && is_authenticated) {
          const event_id = rest[0];
          const accepted = rest[1];
          const message_text = rest[2];

          if (event_id === event.id) {
            if (!resolved) {
              resolved = true;
              cleanup();
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
      fail(error.message ?? "WebSocket error");
    });

    ws.on("close", () => {
      if (!resolved) {
        if (!is_authenticated) {
          fail("Connection closed before authentication");
        } else {
          fail("Connection closed before response");
        }
      }
    });
  });
}

/**
 * Publish event to multiple relays with NIP-42 authentication
 */
export async function publish_to_multiple(
  relay_urls: string[],
  event: Event,
  private_key: Uint8Array,
  timeout_ms: number = 10000,
  auth_timeout_ms: number = 10000
): Promise<PublishResults> {
  const publish_promises = relay_urls.map((url) =>
    publish_to_relay(url, event, private_key, timeout_ms, auth_timeout_ms)
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

