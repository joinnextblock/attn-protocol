import { get_metrics } from "./lib/get-metrics";
import { publish_refresh_event } from "./lib/publish-refresh-event";
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
import type { Logger } from 'pino';
import { ToolRegistry } from "@dvmcp/discovery/src/tool-registry";
import { ToolExecutor } from "@dvmcp/discovery/src/tool-executor";

/**
 * This function is the main handler for the billboard.
 * It gets the metrics from the database and publishes a refresh event to the billboard.
 * @param param0 
 * @param param1 
 */
export const handler = async ({
  since,
  until,
}: HandlerParams,
  {
    tool_registry,
    key_manager,
    relay_handler,
    logger
  }: HandlerDependencies
): Promise<void> => {

  const tool_executor = new ToolExecutor(relay_handler, key_manager, tool_registry);
  logger.debug({ since, until });
  logger.trace('getting metrics');
  const metrics = await get_metrics({ since, until }, { tool_executor, logger });
  logger.debug({ metrics }, 'metrics');
  logger.trace('publishing refresh event');
  await publish_refresh_event({ metrics }, { key_manager, relay_handler, logger });
  logger.trace('refresh event published');
};

export type HandlerParams = {
  since: number;
  until: number;
}

export type HandlerDependencies = {
  tool_registry: ToolRegistry;
  relay_handler: RelayHandler;
  logger: Logger;
  key_manager: KeyManager;
}