import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get_metrics_handler } from './get-metrics/index.js';
import fs from 'fs';
import yaml from 'js-yaml';



if (!fs.existsSync('config.dvmcp.yml')) {
  throw new Error('config.dvmcp.yml does not exist');
}
// Load the config file
const dvmcp_config = yaml.load(fs.readFileSync('config.dvmcp.yml', 'utf8')) as DvmcpConfig;

console.log(dvmcp_config);

const server = new McpServer(dvmcp_config.mcp);

server.tool(
  'get-metrics',
  'returns set of all metrics for all time',
  {
    pubkey: z.string(),
    since: z.number(),
    until: z.number(),
  },
  async ({ pubkey, since, until }) => get_metrics_handler({ pubkey, since, until }, { relays: dvmcp_config.nostr.relayUrls })
);

const transport = new StdioServerTransport();
await server.connect(transport);

type DvmcpConfig = {
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