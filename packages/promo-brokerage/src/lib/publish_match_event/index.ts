import { v5 as uuidv5 } from 'uuid';
import { KeyManager } from '@dvmcp/commons/nostr/key-manager';
import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';

export type PublishMatchEventParams = {
  attention_event: any;
  promotion_event: any;
  billboard_pubkey: string;
};
export type PublishMatchEventDependencies = {
  key_manager: KeyManager;
  relay_handler: RelayHandler;
};
export const publish_match_event = async (
  { attention_event, promotion_event, billboard_pubkey }: PublishMatchEventParams,
  { key_manager, relay_handler }: PublishMatchEventDependencies
): Promise<void> => {
  const attention_max_duration = attention_event.tags.find((tag: any) => tag[0] === 'max_duration')?.[1];
  const attention_sats_per_second = attention_event.tags.find((tag: any) => tag[0] === 'sats_per_second')?.[1];
  const promotion_duration = promotion_event.tags.find((tag: any) => tag[0] === 'duration')?.[1];
  const promotion_sats_per_second = promotion_event.tags.find((tag: any) => tag[0] === 'sats_per_second')?.[1];

  // generate a unique id for the match event
  const keys = [attention_event.id, promotion_event.id, billboard_pubkey, key_manager.getPublicKey()];

  const d = uuidv5(keys.join('|'), uuidv5.URL);

  const unsigned_event = {
    kind: 38388,
    pubkey: key_manager.getPublicKey(),
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      // d tag
      ['d', d],
      // event pointers
      ['e', attention_event.id],
      ['e', promotion_event.id],
      // profile pointers
      ['p', attention_event.pubkey],
      ['p', promotion_event.pubkey],
      ['p', billboard_pubkey],
      ['p', key_manager.getPublicKey()],
      // billboard data
      ['billboard_pubkey', billboard_pubkey],
      // attention data
      ['attention_event_id', attention_event.id],
      ['attention_max_duration', attention_max_duration],
      ['attention_sats_per_second', attention_sats_per_second],
      // promotion data
      ['promotion_event_id', promotion_event.id],
      ['promotion_duration', promotion_duration],
      ['promotion_sats_per_second', promotion_sats_per_second],
    ],
  };
  // console.log({ unsigned_event });
  // Sign event with private key
  const signedEvent = key_manager.signEvent(unsigned_event);
  // publish event to relay
  await relay_handler.publishEvent(signedEvent);
};
