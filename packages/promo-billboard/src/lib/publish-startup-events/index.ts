// project dependencies
import type { Logger } from 'pino';
import type { KeyManager } from '@dvmcp/commons/nostr/key-manager';
import type { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import { ToolExecutor } from '@dvmcp/discovery/src/tool-executor';

// dependencies
import type { PROMO_PROTOCOL } from '../../..';
import { publish_kind_38088_event } from '../nostr/publish-kind-38088-event';
import { publish_kind_1_event } from '../nostr/publish-kind-1-event';
import { publish_kind_10002_event } from '../nostr/publish-kind-10002-event';
/**
 * This function publishes the startup events for the billboard.
 */
export const publish_startup_events = async (
  { billboard_config }: PublishStartupEventsParams,
  { key_manager, relay_handler, logger, tool_executor }: PublishStartupEventsDependencies
): Promise<PublishStartupEventsResponse> => {
  logger.trace('calling publish_announcement_event');
  const { event_id: kind_38088_event_id } = await publish_kind_38088_event(
    {
      name: billboard_config.billboard.name,
      about: billboard_config.billboard.about,
      image: billboard_config.billboard.image,
      url: billboard_config.billboard.url,
      kinds: billboard_config.billboard.kinds,
    },
    {
      key_manager,
      relay_handler,
      logger,
    }
  );
  logger.debug({ kind_38088_event_id }, 'kind_38088_event_id');

  logger.trace('calling publish_kind_1_event');
  const { event_id: kind_1_event_id } = await publish_kind_1_event(
    {
      name: billboard_config.billboard.name,
      about: billboard_config.billboard.about,
      picture: billboard_config.billboard.image,
      display_name: billboard_config.billboard.name,
      website: billboard_config.billboard.url,
      banner: billboard_config.billboard.image,
    },
    { key_manager, relay_handler, logger }
  );
  logger.debug({ kind_1_event_id }, 'kind_1_event_id');

  // TODO: publish kind 10002 event
  const { event_id: kind_10002_event_id } = await publish_kind_10002_event(
    {
      relays: billboard_config.nostr.relays,
    },
    {
      key_manager,
      relay_handler,
      logger,
    }
  );
  logger.debug({ kind_10002_event_id }, 'kind_10002_event_id');

  return {
    kind_38088_event_id,
    kind_1_event_id,
    kind_10002_event_id,
  };
};

export type PublishStartupEventsParams = {
  metrics: any;
  billboard_config: PROMO_PROTOCOL.BILLBOARD.BillboardConfig;
};
export type PublishStartupEventsDependencies = {
  key_manager: KeyManager;
  relay_handler: RelayHandler;
  tool_executor: ToolExecutor;
  logger: Logger;
};
export type PublishStartupEventsResponse = {
  kind_38088_event_id: string;
  kind_1_event_id: string;
  kind_10002_event_id: string;
};
