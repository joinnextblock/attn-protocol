import { REFRESH_KIND } from "../../../promo-commons/constants";
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type pino from 'pino';
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
export type PublishRefreshEventParams = {
  metrics: any;
}

export type PublishRefreshEventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
}

export async function publish_refresh_event(
  { metrics }: PublishRefreshEventParams,
  { key_manager, relay_handler, logger }: PublishRefreshEventDependencies
) {
  logger.trace('publishing refresh event');

  const pubkey = key_manager.getPublicKey();

  const unsigned_event = {
    kind: REFRESH_KIND,
    "pubkey": pubkey,
    "created_at": Math.floor(Date.now() / 1000),
    "tags": [],
    "content": JSON.stringify(metrics),
  };

  logger.debug({ unsigned_event });
  // Sign event with private key
  const signedEvent = key_manager.signEvent(unsigned_event);
  // publish event to relay 
  await relay_handler.publishEvent(signedEvent);
  logger.trace('refresh event published');
}
