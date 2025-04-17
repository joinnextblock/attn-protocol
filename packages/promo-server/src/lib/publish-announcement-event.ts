import { BILLBOARD_ANNOUNCEMENT_KIND } from "../constants";
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type pino from 'pino';
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
export type PublishAnnouncementEventParams = {
  name: string;
  description: string;
  image: string;
  url: string;
  kinds: number[];
}

export type PublishAnnouncementEventDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
}

export async function publish_announcement_event(
  { name, description, image, url, kinds }: PublishAnnouncementEventParams,
  { key_manager, relay_handler, logger }: PublishAnnouncementEventDependencies
) {
  logger.trace('publishing announcement event');

  const pubkey = key_manager.getPublicKey();

  const unsigned_event = {
    kind: BILLBOARD_ANNOUNCEMENT_KIND,
    "pubkey": pubkey,
    "created_at": Math.floor(Date.now() / 1000),
    "content": "",
    "tags": [
      ["d", pubkey],
      ["name", name],
      ["description", description],
      ["image", image],
      ["url", url],
    ],
  }

  unsigned_event.tags.push(...kinds.map(kind => ["k", kind.toString()]));

  logger.debug({ unsigned_event });
  // Sign event with private key
  const signed_event = key_manager.signEvent(unsigned_event);
  // publish event to relay 
  await relay_handler.publishEvent(signed_event);
  logger.trace('announcement event published');
}