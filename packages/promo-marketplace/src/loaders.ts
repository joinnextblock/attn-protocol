import { ReplaceableLoader, TimelineLoader } from 'applesauce-loaders';
import { rxNostr } from './nostr';
import { eventStore } from './stores';

const BILLBOARD_RELAY = import.meta.env.VITE_BILLBOARD_RELAY;

export const replaceableLoader = new ReplaceableLoader(rxNostr);
// Start the loader and send any events to the event store
replaceableLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});

export const attentionLoader = new TimelineLoader(
  rxNostr,
  TimelineLoader.simpleFilterMap([BILLBOARD_RELAY], [{ kinds: [38888] }])
);

// start the loader by subscribing to it
attentionLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});
