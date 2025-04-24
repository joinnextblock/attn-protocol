// dependencies
import assert from 'assert';
import pino, { type Logger } from 'pino';
import yaml from 'js-yaml';
import fs from 'fs';
import { CronJob } from 'cron';

// project dependencies
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import { createKeyManager, type KeyManager } from '@dvmcp/commons/nostr/key-manager';
import { ToolRegistry } from '@dvmcp/discovery/src/tool-registry';
import { ToolExecutor } from '@dvmcp/discovery/src/tool-executor';

import { handler, type HandlerParams, type HandlerDependencies } from './handler';
import { publish_kind_38088_event } from './lib/nostr/publish-kind-38088-event';
import { publish_kind_1_event } from './lib/nostr/publish-kind-1-event';
import type { PROMO_PROTOCOL } from '..';
import { get_tool_executor } from './lib/get-tool-executor';
import { publish_startup_events } from './lib/publish-startup-events';

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
  assert.ok(fs.existsSync('config.billboard.yml'), 'config.billboard.yml does not exist');

  default_logger = pino({
    level: 'info',
    redact: ['billboard_config.nostr.privateKey'],
  });
  try {
    default_logger.trace('loading ./config.billboard.yml');
    const billboard_config = yaml.load(
      fs.readFileSync('config.billboard.yml', 'utf8')
    ) as PROMO_BILLBOARD.BillboardConfig;

    logger = default_logger.child({});
    logger.level = billboard_config.environment.log_level;

    logger.trace('creating relay handler');
    relay_handler = new RelayHandler(billboard_config.nostr.relays);
    logger.trace('creating key manager');
    key_manager = createKeyManager(billboard_config.nostr.private_key);

    const mcp_server = new McpServer(billboard_config.mcp);

    const { tool_executor } = await get_tool_executor(
      { mcp_server, api_public_key: billboard_config.api.public_key },
      { logger, relay_handler, key_manager }
    );

    mcp_server.connect(new StdioServerTransport());

    // Publish the announcement event to the billboard
    logger.trace('publishing startup events');
    const publish_startup_events_response = await publish_startup_events(
      { metrics: {}, billboard_config },
      { tool_executor, key_manager, relay_handler, logger }
    );
    logger.debug({ publish_startup_events_response }, 'startup events published');
    // Refresh the billboard every 60 seconds
    const job = CronJob.from({
      cronTime: '0 * * * * *',
      runOnInit: true,
      onTick: () =>
        handler(
          {
            billboard_id: key_manager.getPublicKey(),
          } as HandlerParams,
          {
            tool_executor,
            key_manager,
            relay_handler,
            logger,
          } as HandlerDependencies
        ),
      onComplete: () => {
        logger.info('Cron job completed');
      },
      errorHandler: (error) => {
        logger.error('Cron job error:', error);
      },
      start: true,
      timeZone: 'America/New_York',
    });
  } catch (err: any) {
    default_logger.error({ err });
  }
})();
