import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get_metrics_by_billboard_id_handler } from './get-metrics-by-billboard-id/index.js';
import fs from 'fs';
import yaml from 'js-yaml';
import type { PROMO_PROTOCOL } from '../index.js';

if (!fs.existsSync('config.dvmcp.yml')) {
  throw new Error('config.dvmcp.yml does not exist');
}
// Load the config file
const api_config = yaml.load(fs.readFileSync('config.dvmcp.yml', 'utf8')) as PROMO_PROTOCOL.API.ApiConfig;

console.log(api_config);

const server = new McpServer(api_config.mcp);

server.tool(
  'get-metrics-by-billboard-id',
  'returns metrics for a billboard',
  {
    billboard_id: z.string(),
  },
  async ({ billboard_id }) =>
    get_metrics_by_billboard_id_handler({ billboard_id }, { relays: api_config.nostr.relayUrls })
);

const transport = new StdioServerTransport();
await server.connect(transport);

type ApiConfig = {
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
};
