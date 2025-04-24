import type { Logger } from 'pino';
import { ToolExecutor } from '@dvmcp/discovery/src/tool-executor';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Calls the promo-api function 'get-metrics-by-billboard-id' to get the metrics for the billboard.
 * The metrics are returned as a JSON object.
 */
export const get_metrics_by_billboard_id = async (
  { billboard_id }: GetMetricsByBillboardIdParams,
  { tool_executor, logger }: GetMetricsByBillboardIdDependencies
): Promise<GetMetricsByBillboardIdResponse> => {
  const tool: Tool = {
    name: 'get-metrics-by-billboard-id',
    description: 'Get metrics for a specific BILLBOARD',
    inputSchema: {
      type: 'object',
      properties: {
        billboard_id: { type: 'string' },
      },
    },
  };

  const get_metrics_by_billboard_id_response = (await tool_executor.executeTool('get-metrics-by-billboard-id', tool, {
    billboard_id,
  })) as Object[];
  logger.debug({ get_metrics_by_billboard_id_response }, 'get-metrics-by-billboard-id');
  const { type, text } = get_metrics_by_billboard_id_response[0];
  const metrics = JSON.parse(text);
  logger.debug({ metrics }, 'metrics');
  return { metrics };
};

export type GetMetricsByBillboardIdParams = {
  billboard_id: string;
};

export type GetMetricsByBillboardIdDependencies = {
  tool_executor: ToolExecutor;
  logger: Logger;
};

export type GetMetricsByBillboardIdResponse = {
  metrics: any;
};
