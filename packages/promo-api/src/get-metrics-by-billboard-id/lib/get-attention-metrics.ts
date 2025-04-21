import { ATTENTION_KIND } from "@promo-protocol/commons/constants";
import type { Event } from "nostr-tools";

export const get_attention_metrics = (events: Event[] = []) => {
  const attention_events = events.filter((event: Event) => event.kind === ATTENTION_KIND);
  const total_attention = attention_events.reduce((acc, event: Event) => {
    const { max_duration } = JSON.parse(event.content);
    return acc + max_duration;
  }, 0);
  const avgerage_attention_price = attention_events.reduce((acc, event: Event) => {
    const { sats_per_second } = JSON.parse(event.content);
    return acc + sats_per_second;
  }, 0) / attention_events.length;

  return {
    count: attention_events.length,
    total_seconds: total_attention || 0,
    sats_per_second_average: Math.floor(avgerage_attention_price) || 0,
    sats_per_second_max: Math.max(...attention_events.map((event: Event) => JSON.parse(event.content).sats_per_second)) || 0,
    sats_per_second_min: Math.min(...attention_events.map((event: Event) => JSON.parse(event.content).sats_per_second)) || 0,
  };
}