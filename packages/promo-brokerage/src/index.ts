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

export type BrokerageConfig = {
  nostr: {
    private_key: string;
    relays: string[];
  };
};

/**
 * This is the main entry point for the match maker.
 */
(async () => {
  try {
    if (!fs.existsSync('config.brokerage.yml')) {
      throw new Error('config.brokerage.yml does not exist');
    }
    // Load the config file
    const config = yaml.load(fs.readFileSync('config.brokerage.yml', 'utf8')) as BrokerageConfig;

    logger({ config }, 'brokerage');

    const {
      nostr: { private_key, relays },
    } = config;

    relay_handler = new RelayHandler(relays);
    key_manager = createKeyManager(private_key);

    subscriptions = subscribe({ relay_handler, key_manager });
  } catch (error) {
    console.error('Error:', error);

    for (const subscription of subscriptions) {
      subscription.close();
    }
  }
})();
