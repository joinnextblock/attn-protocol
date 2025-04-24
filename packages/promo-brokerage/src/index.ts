import { subscribe } from './lib/subscribe';
import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import { createKeyManager, type KeyManager } from '@dvmcp/commons/nostr/key-manager';
import fs from 'fs';
import yaml from 'js-yaml';
import { logger } from '@dvmcp/commons/logger';
import { SubCloser } from 'nostr-tools/pool';

let relay_handler: RelayHandler;
let key_manager: KeyManager;
let subscriptions: SubCloser[] = [];

export type PromoMatchMakerConfig = {
  nostr: {
    privateKey: string;
    relayUrls: string[];
  };
};

/**
 * This is the main entry point for the match maker.
 */
(async () => {
  try {
    if (!fs.existsSync('promo-match-maker.config.yaml')) {
      throw new Error('promo-match-maker.config.yaml does not exist');
    }
    // Load the config file
    const config = yaml.load(fs.readFileSync('promo-match-maker.config.yaml', 'utf8')) as PromoMatchMakerConfig;

    logger({ config }, 'promo-match-maker');

    const {
      nostr: { privateKey, relayUrls: relays },
    } = config;

    console.log({ privateKey, relays });

    relay_handler = new RelayHandler(relays);
    key_manager = createKeyManager(privateKey);

    subscriptions = subscribe({ relay_handler, key_manager });
  } catch (error) {
    console.error('Error:', error);

    for (const subscription of subscriptions) {
      subscription.close();
    }
  }
})();
