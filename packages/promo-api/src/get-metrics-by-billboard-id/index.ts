import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ATTENTION_KIND } from '@promo-protocol/commons/constants';
import pino from 'pino';
import { calculate_match_metrics } from './lib/calculate-match-metrics';
import { PROMOTION_KIND } from '@promo-protocol/commons/constants';
import { MATCH_KIND } from '@promo-protocol/commons/constants';
import { calculate_promotion_metrics } from './lib/calculate-promotion-metrics';
import { calculate_attention_metrics } from './lib/calculate-attention-metrics';
import type { Filter } from 'nostr-tools';

export type Metrics = {
  all_time: {
    attention: {
      count: number;
      total_seconds: number;
      sats_per_second_average: number;
      sats_per_second_max: number;
      sats_per_second_min: number;
    };
    promotion: {
      count: number;
      total_seconds: number;
      sats_per_second_average: number;
      sats_per_second_max: number;
      sats_per_second_min: number;
    };
    match: {
      count: number;
    };
  };
};

export const get_metrics_by_billboard_id_handler: GetMetricsByBillboardIdHandler = async (
  { billboard_id }: GetMetricsByBillboardIdHandlerParameters,
  { relays }: GetMetricsByBillboardIdHandlerDependencies
): Promise<CallToolResult> => {
  try {
    const relay_handler = new RelayHandler(relays);
    const logger = pino();

    const filter: Filter = {
      kinds: [ATTENTION_KIND, PROMOTION_KIND, MATCH_KIND],
      '#p': [billboard_id],
    };
    logger.debug({ filter });
    console.time('queryEvents');
    const events = await relay_handler.queryEvents(filter);
    console.timeEnd('queryEvents');
    console.log({ events });

    const attention_events = events.filter(event => event.kind === ATTENTION_KIND);
    const promotion_events = events.filter(event => event.kind === PROMOTION_KIND);
    const match_events = events.filter(event => event.kind === MATCH_KIND);

    const attention_metrics = calculate_attention_metrics(attention_events);
    const promotion_metrics = calculate_promotion_metrics(promotion_events);
    const match_metrics = calculate_match_metrics(match_events);
    const metrics_all_time = {
      attention: attention_metrics,
      promotion: promotion_metrics,
      match: match_metrics,
    };

    const metrics: Metrics = {
      all_time: metrics_all_time,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metrics),
        },
      ],
    };
  } catch (error) {
    console.error('Echo failed:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
};

export type GetMetricsByBillboardIdHandlerParameters = {
  billboard_id: string;
};

export type GetMetricsByBillboardIdHandlerDependencies = {
  relays: string[];
};

export type GetMetricsByBillboardIdHandler = (
  parameters: GetMetricsByBillboardIdHandlerParameters,
  dependencies: GetMetricsByBillboardIdHandlerDependencies
) => Promise<CallToolResult>;
