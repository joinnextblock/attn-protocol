import { Event, SimplePool } from 'nostr-tools';
import { EventStore, QueryStore } from 'applesauce-core';
import { verifyEvent } from 'nostr-tools';
// import { SimpleSigner } from "applesauce-signers";
// import { EventFactory } from "applesauce-factory";
// import { includeSingletonTag } from "applesauce-factory/operations/event";
// import { AccountManager, } from "applesauce-accounts";
// import { registerCommonAccountTypes, SimpleAccount } from "applesauce-accounts/accounts";
// export const replaceableLoader = new ReplaceableLoader(rxNostr);
const RELAY_URL = import.meta.env.VITE_RELAY_URL;
console.log(RELAY_URL);

export const eventStore = new EventStore();
export const queryStore = new QueryStore(eventStore);

// verify the events when they are added to the store
eventStore.verifyEvent = verifyEvent;

// let web_socket: WebSocket;
// let event_factory: EventFactory;
// let nostr_account_manager: AccountManager;
// let nostr_accounts;
// let active_nostr_account;
let pool: SimplePool;
let relays = ['ws://localhost:10547'];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ON_MOUNT') {
    pool = new SimplePool();

    const filters = [
      {
        kinds: [28888],
        authors: ['00075ef0b8f72be6f48ea54c9e726c4969e885c85f434ed8ee1bc0443ba635dd'],
      },
    ];

    const handlers = {
      onevent(event: Event) {
        eventStore.add(event, RELAY_URL);
        chrome.runtime.sendMessage({ type: 'REFRESH' }).catch(console.error);
      },
      oneose() {
        console.log('oneose');
      },
      onclose() {
        console.log('onclose');
      },
    };

    pool.subscribeMany(relays, filters, handlers);

    return sendResponse({ success: true });
    // return true; // Keep the message channel open for async response
  }
});
