import { PROMOTION_KIND } from "@promo-protocol/commons/constants";
import type { Event } from "nostr-tools";

/**
 * Get the metrics for the promotion events
 * @param events - The events to get the metrics for
 * @returns The metrics for the promotion events
 */
export const get_promotion_metrics = (events: Event[] = []) => {
  const promotion_events = events.filter((event: Event) => event.kind === PROMOTION_KIND);
  const total_promotion = promotion_events.reduce((acc, event: Event) => {
    const { duration } = JSON.parse(event.content);
    return acc + duration;
  }, 0);
  const avgerage_promotion_price = promotion_events.reduce((acc, event: Event) => {
    const { sats_per_second } = JSON.parse(event.content);
    return acc + sats_per_second;
  }, 0) / promotion_events.length;
  return {
    count: promotion_events.length,
    total_seconds: total_promotion || 0,
    sats_per_second_average: Math.floor(avgerage_promotion_price) || 0,
    sats_per_second_max: Math.max(...promotion_events.map((event: Event) => JSON.parse(event.content).sats_per_second)) || 0,
    sats_per_second_min: Math.min(...promotion_events.map((event: Event) => JSON.parse(event.content).sats_per_second)) || 0,
  };
}