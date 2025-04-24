import type { Event, UnsignedEvent } from 'nostr-tools';
import type { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import type pino from 'pino';
import type { KeyManager } from '@dvmcp/commons/nostr/key-manager';

export async function publish_kind_1_event(
  { name, about, picture, display_name, website, banner }: PublishKind1EventParams,
  { key_manager, relay_handler, logger }: PublishKind1EventDependencies
): Promise<PublishKind1EventResponse> {
  logger.trace('publishing kind 1 event');
  const pubkey = key_manager.getPublicKey();

  const unsigned_kind_1_event = key_manager.createEventTemplate(1);
  unsigned_kind_1_event.content = JSON.stringify({
    name,
    about,
    picture,
    display_name,
    website,
    banner,
  });

  unsigned_kind_1_event.tags.push(['r', website]);

  logger.debug({ unsigned_kind_1_event });
  // Sign event with private key
  const signed_kind_1_event = key_manager.signEvent(unsigned_kind_1_event);
  // publish event to relay
  await relay_handler.publishEvent(signed_kind_1_event);
  logger.trace('kind 1 event published');
  return {
    event_id: signed_kind_1_event.id,
  };
}

export type PublishKind1EventParams = {
  name: string;
  about: string;
  picture: string;
  display_name: string;
  website: string;
  banner: string;
};

export type PublishKind1EventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
};

export type PublishKind1EventResponse = {
  event_id: string;
};
