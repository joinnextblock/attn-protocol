// project dependencies
import type { Logger } from 'pino';
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
import { ToolExecutor } from "@dvmcp/discovery/src/tool-executor";

// dependencies
import {
  get_metrics_by_billboard_id,
  type GetMetricsByBillboardIdDependencies,
  type GetMetricsByBillboardIdParams,
  type GetMetricsByBillboardIdResponse
} from "./lib/get-metrics";
import {
  publish_kind_28888_event,
  type PublishKind28888EventDependencies,
  type PublishKind28888EventParams,
  type PublishKind28888EventResponse
} from "./lib/nostr/publish-kind-28888-event";

/**
 * This function is the main handler for the billboard. It should be called every 60 seconds. 
 */
export const handler = async (
  {
    billboard_id,
  }: HandlerParams,
  {
    tool_executor,
    key_manager,
    relay_handler,
    logger
  }: HandlerDependencies
): Promise<void> => {

  logger.trace('getting metrics');
  const { metrics } = await get_metrics_by_billboard_id(
    { billboard_id } as GetMetricsByBillboardIdParams,
    { tool_executor, logger } as GetMetricsByBillboardIdDependencies
  ) as GetMetricsByBillboardIdResponse;
  logger.debug({ metrics }, 'metrics');

  logger.trace('publishing refresh event');
  const { event_id: refresh_event_id } = await publish_kind_28888_event(
    { metrics } as PublishKind28888EventParams,
    { key_manager, relay_handler, logger } as PublishKind28888EventDependencies
  ) as PublishKind28888EventResponse;
  logger.debug({ refresh_event_id }, 'refresh event published');

  logger.trace('done');
};

export type HandlerParams = {
  billboard_id: string;
}

export type HandlerDependencies = {
  tool_executor: ToolExecutor;
  relay_handler: RelayHandler;
  logger: Logger;
  key_manager: KeyManager;
}