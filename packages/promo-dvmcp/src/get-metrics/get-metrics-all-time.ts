import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type pino from 'pino';
import { ATTENTION_KIND, PROMOTION_KIND, MATCH_KIND } from "../../../promo-commons/constants";
import type { Event, Filter } from "nostr-tools";
import { get_attention_metrics } from "./lib/get-attention-metrics";
import { get_promotion_metrics } from "./lib/get-promotion-metrics";
import { get_match_metrics } from "./lib/get-match-metrics";

export type MetricsAllTime = {
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
}

export type GetMetricsAllTimeParams = {
  pubkey: string;
}

export type GetMetricsAllTimeDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
}

export const get_metrics_all_time = async (
  { pubkey}: GetMetricsAllTimeParams,
  { relay_handler, logger }: GetMetricsAllTimeDependencies
): Promise<MetricsAllTime> => {
  const filter: Filter = {
    kinds: [ATTENTION_KIND, PROMOTION_KIND, MATCH_KIND],
    "#p": [pubkey],
  };
  logger.debug({ filter });
  console.time('queryEvents');
  const events = await relay_handler.queryEvents(filter);
  console.timeEnd('queryEvents');
  logger.debug({ events });

  const attention_events = events.filter((event) => event.kind === ATTENTION_KIND);
  const promotion_events = events.filter((event) => event.kind === PROMOTION_KIND);
  const match_events = events.filter((event) => event.kind === MATCH_KIND);

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




