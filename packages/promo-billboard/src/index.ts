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
import path from 'path';
import type { PROMO_BILLBOARD } from '../index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolExecutor } from '@dvmcp/discovery/src/tool-executor';
import { get_metrics } from './lib/get-metrics';
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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
  const config_dir = path.join(__dirname, '..', '..');
  assert.ok(fs.existsSync(path.join(config_dir, 'config.billboard.yaml')), 'config.billboard.yaml does not exist');
  assert.ok(fs.existsSync(path.join(config_dir, 'config.api.yml')), 'config.dvmcp.yml does not exist');

  default_logger = pino({ 
    level: 'info',
    redact: ['dvmcp_config.nostr.privateKey']

  });
  try {
    default_logger.trace('loading dvmcp config');
    const api_config = yaml.load(fs.readFileSync(path.join(config_dir, 'config.api.yml'), 'utf8')) as PROMO_API.ApiConfig;
    default_logger.trace('loading promo server config');
    const billboard_config = yaml.load(fs.readFileSync(path.join(config_dir, 'config.billboard.yaml'), 'utf8')) as PROMO_BILLBOARD.BillboardConfig;

    logger = default_logger.child({});
    logger.level = billboard_config.environment.log_level;

    logger.trace('creating relay handler');
    relay_handler = new RelayHandler(api_config.nostr.relayUrls);
    logger.trace('creating key manager');
    key_manager = createKeyManager(api_config.nostr.privateKey);
    logger.debug({ api_config }, 'api_config');
    const mcp_server = new McpServer(api_config.mcp);
    
    logger.trace('creating tool registry');
    const tool_registry = new ToolRegistry(mcp_server);

    const tool: Tool = {
      name: "get-metrics-by-billboard-id",
      description: "Get metrics for a specific billboard by billboard id",
      inputSchema: {
        type: 'object',
        properties: {
          billboard_id: { type: 'string' },
          since: { type: 'number' },
          until: { type: 'number' },
        },
      },
    };
    tool_registry.registerTool('get-metrics-by-billboard-id', tool, key_manager.getPublicKey());

    mcp_server.connect(new StdioServerTransport());
    
    const tool_executor = new ToolExecutor(relay_handler, key_manager, tool_registry);

    // Publish the announcement event to the billboard
    logger.trace('calling publish_announcement_event');
    const announcement_event_id = await publish_announcement_event(
      {
        name: billboard_config.server.name,
        description: billboard_config.server.description,
        image: billboard_config.server.image,
        url: billboard_config.server.url,
        kinds: billboard_config.server.kinds,
      },
      {
        key_manager,
        relay_handler,
        logger
      }
    );
    logger.debug({ announcement_event_id }, 'announcement_event_id');
    // Refresh the billboard every 60 seconds
    const since = Date.now();
    const until = Date.now() + 60 * 1000;
    const job = CronJob.from({
      cronTime: '0 * * * * *',
      runOnInit: true,
      onTick: () => handler({ billboard_id: key_manager.getPublicKey(), since, until }, { tool_executor, key_manager, relay_handler, logger }),
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
    default_logger.error({ err });
  }
})();