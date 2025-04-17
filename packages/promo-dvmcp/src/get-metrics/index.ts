import { get_metrics_all_time, type MetricsAllTime } from "./get-metrics-all-time";
import { get_metrics_last_interval, type MetricsLastInterval } from "./get-metrics-last-interval";
import { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import { logger } from "../../../promo-commons/logger";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import pino from "pino";

export type GetMetricsHandlerArgs = {
  pubkey: string,
  since: number,
  until: number,
}

export type GetMetricsHandlerDependencies = {
  relays: string[];
}

export type GetMetricsHandler = ( 
  args: GetMetricsHandlerArgs,
  dependencies: GetMetricsHandlerDependencies
) => Promise<CallToolResult>

export type Metrics = {
  all_time: MetricsAllTime;
  last_interval: MetricsLastInterval;
}

export const get_metrics_handler: GetMetricsHandler = async (
  { pubkey,
    since,
    until
  }: GetMetricsHandlerArgs,
  { relays }: GetMetricsHandlerDependencies
): Promise<CallToolResult> => {
  console.log({ pubkey, since, until });

  try {
    const relay_handler = new RelayHandler(relays);
    const logger = pino();

    const metrics_all_time = await get_metrics_all_time({ pubkey }, { relay_handler, logger });
    const metrics_last_interval = await get_metrics_last_interval({ pubkey, since, until }, { relay_handler, logger });

    const metrics: Metrics = {
      all_time: metrics_all_time,
      last_interval: metrics_last_interval,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metrics),
        }
      ],
    };
  } catch (error) {
    console.error('Echo failed:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      ],
      isError: true,
    };
  }
}