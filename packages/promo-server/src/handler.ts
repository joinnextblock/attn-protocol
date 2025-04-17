  import { get_metrics } from "./lib/get-metrics";
import { publish_refresh_event } from "./lib/publish-refresh-event";
import type { Logger } from 'pino';
import type { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import type { KeyManager } from "@dvmcp/commons/nostr/key-manager";

export type HandlerParams = {
}

export type HandlerDependencies = {
  relay_handler: RelayHandler;
  logger: Logger;
  key_manager: KeyManager;
}

export const handler = async ({ }: HandlerParams, { key_manager, relay_handler, logger }: HandlerDependencies) => {
  const since = Math.floor(Date.now() / 1000) - 60;
  const until = Math.floor(Date.now() / 1000);
  logger.debug({ since, until });
  const metrics = await get_metrics({ since, until }, { key_manager, relay_handler, logger });
  logger.debug({ metrics }, 'metrics');
  await publish_refresh_event({ metrics }, { key_manager, relay_handler, logger });
};