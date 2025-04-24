// project dependencies
import type pino from 'pino';
import { BILLBOARD_REFRESH_KIND } from "@promo-protocol/commons/constants";
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
import type { PROMO_PROTOCOL } from '../../..';
import * as PROMO_COMMON from '../../../../packages/promo-commons/index';

/**
 * This function publishes a kind 28888 event to the Nostr network.
 */
export async function publish_kind_28888_event(
  { metrics }: PublishKind28888EventParams,
  { key_manager, relay_handler, logger }: PublishKind28888EventDependencies
): Promise<PublishKind28888EventResponse> {
  logger.trace('publishing refresh event');

  const unsigned_kind_28888_event = key_manager.createEventTemplate(BILLBOARD_REFRESH_KIND);
  unsigned_kind_28888_event.content = JSON.stringify(metrics);

  logger.debug({ unsigned_kind_28888_event });
  // Sign event with private key
  const signed_kind_28888_event = key_manager.signEvent(unsigned_kind_28888_event);
  // publish event to relay 
  await relay_handler.publishEvent(signed_kind_28888_event);
  logger.trace('refresh event published');
  return {
    event_id: signed_kind_28888_event.id,
  }
}

export type PublishKind28888EventResponse = {
  event_id: string;
}
export type PublishKind28888EventParams = {
  metrics: PROMO_COMMON.COMMONS.BillboardMetrics;
}

export type PublishKind28888EventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
}