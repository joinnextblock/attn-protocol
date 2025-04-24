import { PROMOTION_KIND } from '@promo-protocol/commons/constants';
import type { Event } from 'nostr-tools';

/**
 * Get the metrics for the promotion events
 */
export const get_promotion_metrics = (events: Event[] = []) => {
  const promotion_events = events.filter((event: Event) => event.kind === PROMOTION_KIND);
  const total_promotion = promotion_events.reduce((acc, event: Event) => {
    const duration = event.tags.find(tag => tag[0] === 'duration')?.[1];
    return acc + (duration ? parseInt(duration) : 0);
  }, 0);
  const avgerage_promotion_price =
    promotion_events.reduce((acc, event: Event) => {
      const sats_per_second = event.tags.find(tag => tag[0] === 'sats_per_second')?.[1];
      return acc + (sats_per_second ? parseInt(sats_per_second) : 0);
    }, 0) / promotion_events.length;

  const sats_per_second_max = Math.max(
    ...promotion_events.map((event: Event) =>
      parseInt(event.tags.find(tag => tag[0] === 'sats_per_second')?.[1] || '0')
    )
  );
  const sats_per_second_min = Math.min(
    ...promotion_events.map((event: Event) =>
      parseInt(event.tags.find(tag => tag[0] === 'sats_per_second')?.[1] || '0')
    )
  );

  return {
    count: promotion_events.length,
    total_seconds: total_promotion || 0,
    sats_per_second_average: Math.floor(avgerage_promotion_price) || 0,
    sats_per_second_max: sats_per_second_max || 0,
    sats_per_second_min: sats_per_second_min || 0,
  };
};
