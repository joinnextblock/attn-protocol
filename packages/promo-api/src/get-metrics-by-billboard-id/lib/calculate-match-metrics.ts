import { MATCH_KIND } from '@promo-protocol/commons/constants';
import type { Event } from 'nostr-tools';

export const calculate_match_metrics = (events: Event[] = []) => {
  const match_events = events.filter((event: Event) => event.kind === MATCH_KIND);
  return {
    count: match_events.length,
  };
};
