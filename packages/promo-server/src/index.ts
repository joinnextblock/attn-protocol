import pino from 'pino';
import yaml from 'js-yaml';
import fs from 'fs';
import { CronJob } from 'cron';
import { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import { createKeyManager, type KeyManager } from "@dvmcp/commons/nostr/key-manager";
import { handler } from './handler'; 
import { publish_announcement_event } from './lib/publish-announcement-event';


let logger: pino.Logger;
let relay_handler: RelayHandler;
let key_manager: KeyManager;
export type BillboardConfig = {
  nostr: {
    private_key: string;
    relays: string[];
  };
  billboard: {
    name: string;
    description: string;
    image: string;
    url: string;
    kinds: number[];
  };
}
// This cron job publishes an announcement event to the billboard 
// and then refreshes the billboard  
(async () => {
  logger = pino({
    level: 'trace',
  });

  try {
    if (!fs.existsSync('billboard.config.yaml')) {
      throw new Error('billboard.config.yaml does not exist');
    }
    // Load the config file
    const billboard_config = yaml.load(fs.readFileSync('billboard.config.yaml', 'utf8')) as BillboardConfig;

    logger.debug({ billboard_config });

    const {
      nostr: {
        private_key,
        relays,
      },
      billboard: {
        name,
        description,
        image,
        url,
        kinds,
      }
    } = billboard_config;

    relay_handler = new RelayHandler(relays);
    key_manager = createKeyManager(private_key);
    // console.log({ key_manager });

    // Publish the announcement event to the billboard
    logger.trace('calling publish_announcement_event');
    await publish_announcement_event({ name, description, image, url, kinds }, { key_manager, relay_handler, logger });
    // Refresh the billboard every 60 seconds
    const job = CronJob.from({
      cronTime: '0 * * * * *',
      runOnInit: true,
      onTick: () => handler({ }, { key_manager, relay_handler, logger }),
      onComplete: () => {
        logger.info('Cron job completed');
      },
      errorHandler: (error) => {
        logger.error('Cron job error:', error);
      },
      start: true,
      timeZone: 'America/New_York'
    });
  }
  catch (err: any) {
    logger.error({ err });
  }
})();