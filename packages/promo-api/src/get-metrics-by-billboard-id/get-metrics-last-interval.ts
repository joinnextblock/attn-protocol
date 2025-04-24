import type { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import type pino from 'pino';
import { ATTENTION_KIND, PROMOTION_KIND, MATCH_KIND } from '@promo-protocol/commons/constants';
import type { Filter } from 'nostr-tools';
import { get_attention_metrics } from './lib/get-attention-metrics';
import { get_promotion_metrics } from './lib/get-promotion-metrics';
import { get_match_metrics } from './lib/get-match-metrics';

export type MetricsLastInterval = {
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

export type GetMetricsLastIntervalParams = {
  billboard_id: string;
  since: number;
  until: number;
};

export type GetMetricsLastIntervalDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
};

export const get_metrics_last_interval = async (
  { billboard_id, since, until }: GetMetricsLastIntervalParams,
  { relay_handler, logger }: GetMetricsLastIntervalDependencies
): Promise<MetricsLastInterval> => {
  logger.debug({ billboard_id, since, until });
  const filter: Filter = {
    since,
    until,
    kinds: [ATTENTION_KIND, PROMOTION_KIND, MATCH_KIND],
    '#p': [billboard_id],
  };
  logger.debug({ filter });
  const events = await relay_handler.queryEvents(filter);
  logger.debug({ events });

  const attention_events = events.filter(event => event.kind === ATTENTION_KIND);
  const promotion_events = events.filter(event => event.kind === PROMOTION_KIND);
  const match_events = events.filter(event => event.kind === MATCH_KIND);

  const attention_metrics = get_attention_metrics(attention_events);
  const promotion_metrics = get_promotion_metrics(promotion_events);
  const match_metrics = get_match_metrics(match_events);

  const metrics = {
    attention: attention_metrics,
    promotion: promotion_metrics,
    match: match_metrics,
  };
  return metrics;
};
