import { EventStore, QueryStore } from 'applesauce-core';
import { verifyEvent } from 'nostr-tools';

export const eventStore = new EventStore();
// verify the events when they are added to the store
eventStore.verifyEvent = verifyEvent;

export const queryStore = new QueryStore(eventStore);
