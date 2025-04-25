import { ATTENTION_KIND } from '@promo-protocol/commons/constants';
import type { Event } from 'nostr-tools';

export const calculate_attention_metrics = (events: Event[] = []) => {
  const attention_events = events.filter((event: Event) => event.kind === ATTENTION_KIND);
  const total_attention = attention_events.reduce((acc, event: Event) => {
    const max_duration = event.tags.find(tag => tag[0] === 'max_duration')?.[1];
    return acc + (max_duration ? parseInt(max_duration) : 0);
  }, 0);
  const avgerage_attention_price =
    attention_events.reduce((acc, event: Event) => {
      const sats_per_second = event.tags.find(tag => tag[0] === 'sats_per_second')?.[1];
      return acc + (sats_per_second ? parseInt(sats_per_second) : 0);
    }, 0) / attention_events.length;

  const sats_per_second_max = Math.max(
    ...attention_events.map((event: Event) =>
      parseInt(event.tags.find(tag => tag[0] === 'sats_per_second')?.[1] || '0')
    )
  );
  const sats_per_second_min = Math.min(
    ...attention_events.map((event: Event) =>
      parseInt(event.tags.find(tag => tag[0] === 'sats_per_second')?.[1] || '0')
    )
  );

  return {
    count: attention_events.length,
    total_seconds: total_attention || 0,
    sats_per_second_average: Math.floor(avgerage_attention_price) || 0,
    sats_per_second_max: sats_per_second_max || 0,
    sats_per_second_min: sats_per_second_min || 0,
  };
};
