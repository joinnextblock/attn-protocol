import type { Event, UnsignedEvent } from 'nostr-tools';
import type { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import type pino from 'pino';
import type { KeyManager } from '@dvmcp/commons/nostr/key-manager';

export const publish_kind_10002_event = async (
  { relays }: PublishKind10002EventParams,
  { key_manager, relay_handler, logger }: PublishKind10002EventDependencies
): Promise<PublishKind10002EventResponse> => {
  logger.trace('publishing kind 10002 event');

  const unsigned_kind_10002_event = key_manager.createEventTemplate(10002);

  for (const relay of relays) {
    unsigned_kind_10002_event.tags.push(['r', relay]);
  }

  logger.debug({ unsigned_kind_10002_event });
  // Sign event with private key
  const signed_kind_10002_event = key_manager.signEvent(unsigned_kind_10002_event);
  // publish event to relay
  await relay_handler.publishEvent(signed_kind_10002_event);
  logger.trace('kind 10002 event published');
  return {
    event_id: signed_kind_10002_event.id,
  };
};

export type PublishKind10002EventParams = {
  relays: string[];
};

export type PublishKind10002EventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
};

export type PublishKind10002EventResponse = {
  event_id: string;
};
