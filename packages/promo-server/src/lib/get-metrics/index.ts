import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type pino from 'pino';
import type { Event } from "nostr-tools";
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";
export type GetMetricsParams = {
  since: number;
  until: number;
}

export type GetMetricsDependencies = {
  relay_handler: RelayHandler;
  logger: pino.Logger;
  key_manager: KeyManager;
}

export const get_metrics = async (
  { since, until }: GetMetricsParams,
  { key_manager, relay_handler, logger }: GetMetricsDependencies
) => {
  const pubkey = key_manager.getPublicKey();

  const unsigned_event = {
    kind: 5910,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: pubkey,
    content: JSON.stringify({
      name: 'get-metrics',
      parameters: {
        pubkey,
        since,
        until,
      },
    }),
    tags: [
      ['c', 'execute-tool'],
      ['p', '0002bb00b8e64bb2a03388209b6b9a25c8d745e059abca9b83d166a3fe1edf2c'],
      ['output', 'application/json'],
    ],
  };

  logger.debug({ unsigned_event });
  const signed_event = key_manager.signEvent(unsigned_event);
  logger.debug({ signed_event });


  let status = 'processing';

  await relay_handler.publishEvent(signed_event);

  while (status === 'processing') {
    // logger.debug({ status });

    const job_events = await relay_handler.queryEvents({
      kinds: [7000],
      "#e": [signed_event.id],
      // "#p": [pubkey],
    });

    if (job_events.length > 0) {
      const event = job_events[0] as Event;
      status = event.tags.find(tag => tag[0] === 'status')?.[1] ?? 'processing';
      logger.debug({ status });
    }

    continue
  }

  if (status === 'error') {
    throw new Error('Error getting metrics');
  }

  if (status === 'payment-required') {
    throw new Error('Payment required');
  }

  if (['success', 'partial'].includes(status)) {
    const [job_result_event] = await relay_handler.queryEvents({
      kinds: [6910],
      "#e": [signed_event.id],
      "#p": [pubkey],
    });

    logger.debug({ job_result_event }, 'job_result_event');

    const parsed_content = JSON.parse(job_result_event?.content ?? '{}');

    logger.debug({ parsed_content }, 'parsed_content');

    const { text } = parsed_content.content[0];

    const metrics = JSON.parse(text);

    logger.debug({ metrics }, 'metrics');

    return metrics;
  }

  throw new Error('Unknown status');
};