import { get_metrics_all_time, type MetricsAllTime } from "./get-metrics-all-time";
import { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import pino from "pino";

export type GetMetricsByBillboardIdHandlerParameters = {
  billboard_id: string,
}

export type GetMetricsByBillboardIdHandlerDependencies = {
  relays: string[];
}

export type GetMetricsByBillboardIdHandler = ( 
  parameters: GetMetricsByBillboardIdHandlerParameters,
  dependencies: GetMetricsByBillboardIdHandlerDependencies
) => Promise<CallToolResult>

export type Metrics = {
  all_time: MetricsAllTime;
}

export const get_metrics_by_billboard_id_handler: GetMetricsByBillboardIdHandler = async (
  { billboard_id }: GetMetricsByBillboardIdHandlerParameters,
  { relays }: GetMetricsByBillboardIdHandlerDependencies
): Promise<CallToolResult> => {
  try {
    const relay_handler = new RelayHandler(relays);
    const logger = pino();

    const metrics_all_time = await get_metrics_all_time({ billboard_id }, { relay_handler, logger });

    const metrics: Metrics = {
      all_time: metrics_all_time
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