import { Event } from 'nostr-tools';
import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import { KeyManager } from '@dvmcp/commons/nostr/key-manager';

export type PublishDeleteEventParams = {
  event: Event;
};
export type PublishDeleteEventDependencies = {
  relay_handler: RelayHandler;
  key_manager: KeyManager;
};

export type PublishDeleteEventResult = void;

export const publish_delete_event = async (
  { event }: PublishDeleteEventParams,
  { relay_handler, key_manager }: PublishDeleteEventDependencies
): Promise<PublishDeleteEventResult> => {
  console.log('publishing delete events');

  const d_tag = event.tags.find((tag: any) => tag[0] === 'd')?.[1];
  const unsigned_event = {
    kind: 5,
    pubkey: key_manager.getPublicKey(),
    created_at: 1743414645,
    content: '',
    tags: [
      ['e', event.id],
      ['e', '968c5..ad7a4'],
      ['a', `38388:${key_manager.getPublicKey()}:${d_tag}`],
      ['k', '38388'],
    ],
  };
  console.log({ unsigned_event });
  // Sign event with private key
  const signed_event = key_manager.signEvent(unsigned_event);
  // publish event to relay
  await relay_handler.publishEvent(signed_event);
};
