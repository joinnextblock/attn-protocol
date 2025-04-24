import type { KeyManager } from '@dvmcp/commons/nostr/key-manager';
import type { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import { ToolExecutor } from '@dvmcp/discovery/src/tool-executor';
import { ToolRegistry } from '@dvmcp/discovery/src/tool-registry';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'pino';
import get_metrics_by_billboard_id_tool from './tools/get-metrics-by-billboard-id.json';
export const get_tool_executor = async (
  { mcp_server, api_public_key }: GetToolExecutorParams,
  { logger, relay_handler, key_manager }: GetToolExecutorDependencies
): Promise<GetToolExecutorResponse> => {
  logger.trace('creating tool registry');
  const tool_registry = new ToolRegistry(mcp_server);

  logger.trace('registering tool');
  tool_registry.registerTool('get-metrics-by-billboard-id', get_metrics_by_billboard_id_tool as Tool, api_public_key);

  const tool_executor = new ToolExecutor(relay_handler, key_manager, tool_registry);

  return {
    tool_executor,
  };
};

export type GetToolExecutorParams = {
  mcp_server: McpServer;
  api_public_key: string;
};

export type GetToolExecutorDependencies = {
  logger: Logger;
  relay_handler: RelayHandler;
  key_manager: KeyManager;
};

export type GetToolExecutorResponse = {
  tool_executor: ToolExecutor;
};
