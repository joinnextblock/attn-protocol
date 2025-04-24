import { BILLBOARD_ANNOUNCEMENT_KIND } from "@promo-protocol/commons/constants";
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type pino from 'pino';
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";


/**
 * This function publishes a kind 38088 event to the Nostr network.
 */
export async function publish_kind_38088_event(
  { name, about, image, url, kinds }: PublishKind38088EventParams,
  { key_manager, relay_handler, logger }: PublishKind38088EventDependencies
): Promise<PublishKind38088EventResponse> {
  logger.trace('publishing kind 38088 event');
  const unsigned_kind_38088_event = key_manager.createEventTemplate(BILLBOARD_ANNOUNCEMENT_KIND);
  unsigned_kind_38088_event.tags.push(["d", key_manager.getPublicKey()]);
  unsigned_kind_38088_event.tags.push(["name", name]);
  unsigned_kind_38088_event.tags.push(["description", about]);
  unsigned_kind_38088_event.tags.push(["image", image]);
  unsigned_kind_38088_event.tags.push(["url", url]);
  unsigned_kind_38088_event.tags.push(...kinds.map(kind => ["k", kind.toString()]));

  logger.debug({ unsigned_kind_38088_event });

  logger.debug({ unsigned_kind_38088_event });
  // Sign event with private key
  const signed_kind_38088_event = key_manager.signEvent(unsigned_kind_38088_event);
  // publish event to relay 
  await relay_handler.publishEvent(signed_kind_38088_event);
  logger.trace('announcement event published');
  return {
    event_id: signed_kind_38088_event.id,
  }
}
export type PublishKind38088EventParams = {
  name: string;
  about: string;
  image: string;
  url: string;
  kinds: number[];
}

export type PublishKind38088EventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
}

export type PublishKind38088EventResponse = {
  event_id: string;
}
