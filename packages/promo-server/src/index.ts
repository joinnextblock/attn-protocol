import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pino, { type Logger } from 'pino';
import yaml from 'js-yaml';
import fs from 'fs';
import { CronJob } from 'cron';
import { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import { createKeyManager, type KeyManager } from "@dvmcp/commons/nostr/key-manager";
import { handler } from './handler';
import { publish_announcement_event } from './lib/publish-announcement-event';
import { ToolRegistry } from '@dvmcp/discovery/src/tool-registry';
import assert from 'assert';


let relay_handler: RelayHandler;
let key_manager: KeyManager;
let default_logger: Logger;
let logger: Logger;
/**
 * This function is the main entry point for the promo server.
 * It loads the config file, creates the MCP server, and publishes the announcement event.
 * It then creates a cron job to refresh the billboard every 60 seconds.
 */
(async () => {
  assert.ok(fs.existsSync('config.promo-server.yaml'), 'config.promo-server.yaml does not exist');
  assert.ok(fs.existsSync('config.dvmcp.yml'), 'config.dvmcp.yml does not exist');

  default_logger = pino({ level: 'info' });
  try {
    default_logger.trace('loading dvmcp config');
    const dvmcp_config = yaml.load(fs.readFileSync('config.dvmcp.yml', 'utf8')) as DvmcpConfig;
    default_logger.trace('loading promo server config');
    const promo_server_config = yaml.load(fs.readFileSync('config.promo-server.yaml', 'utf8')) as PromoServerConfig;

    logger = default_logger.child({});
    logger.level = promo_server_config.environment.log_level;

    logger.trace('creating relay handler');
    relay_handler = new RelayHandler(dvmcp_config.nostr.relayUrls);
    logger.trace('creating key manager');
    key_manager = createKeyManager(promo_server_config.nostr.private_key);
    logger.debug({ dvmcp_config }, 'dvmcp_config');
    const mcp_server = new McpServer(dvmcp_config.mcp);
    logger.trace('creating tool registry');
    const tool_registry = new ToolRegistry(mcp_server);
    logger.trace('listing tools');
    const tools = tool_registry.listTools();
    logger.debug({ tools }, 'tools');

    // Publish the announcement event to the billboard
    logger.trace('calling publish_announcement_event');
    const announcement_event_id = await publish_announcement_event(
      {
        name: promo_server_config.server.name,
        description: promo_server_config.server.description,
        image: promo_server_config.server.image,
        url: promo_server_config.server.url,
        kinds: promo_server_config.server.kinds,
      },
      {
        key_manager,
        relay_handler,
        logger
      }
    );
    logger.debug({ announcement_event_id }, 'announcement_event_id');
    // // Refresh the billboard every 60 seconds
    // const since = Date.now();
    // const until = Date.now() + 60 * 1000;
    // const job = CronJob.from({
    //   cronTime: '0 * * * * *',
    //   runOnInit: true,
    //   onTick: () => handler({ since, until }, { tool_registry, key_manager, relay_handler, logger }),
    //   onComplete: () => {
    //     logger.info('Cron job completed');
    //   },
    //   errorHandler: (error) => {
    //     logger.error('Cron job error:', error);
    //   },
    //   start: true,
    //   timeZone: 'America/New_York'
    // });
  }
  catch (err: any) {
    default_logger.error({ err });
  }
})();

// Types
export type PromoServerConfig = {
  nostr: {
    private_key: string;
    relays: string[];
  };
  server: {
    name: string;
    description: string;
    image: string;
    url: string;
    kinds: number[];
  };
  environment: {
    log_level: string;
  }
}

export type DvmcpConfig = {
  nostr: {
    privateKey: string;
    relayUrls: string[];
  };
  mcp: {
    version: string;
    name: string;
    about: string;
    clientName: string;
    clientVersion: string;
  };
  whitelist: {
    allowedDVMs: string[];
  };
}