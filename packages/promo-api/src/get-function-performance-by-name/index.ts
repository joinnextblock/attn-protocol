import { RelayHandler } from '@dvmcp/commons/nostr/relay-handler';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import pino from 'pino';
import { DVM_NOTICE_KIND, TOOL_REQUEST_KIND, TOOL_RESPONSE_KIND } from '@dvmcp/commons/constants';
import type { KeyManager } from '@dvmcp/commons/nostr/key-manager';
import type { Filter } from 'nostr-tools';

export const get_function_perfomance_by_name_handler: GetFunctionPerfomanceByNameHandler = async (
  { name }: GetFunctionPerfomanceByNameHandlerParameters,
  { key_manager, relays }: GetFunctionPerfomanceByNameHandlerDependencies
): Promise<CallToolResult> => {
  try {
    const relay_handler = new RelayHandler(relays);
    const logger = pino();

    const filter: Filter = {
      kinds: [TOOL_REQUEST_KIND],
      '#p': [key_manager.getPublicKey()],
    };
    logger.debug({ filter });
    console.time('queryEvents');
    const events = await relay_handler.queryEvents(filter);
    console.timeEnd('queryEvents');
    console.log({ events });

    const invocations = events.filter(
      ({ kind, content }) => kind === TOOL_REQUEST_KIND && JSON.parse(content).name === name
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            all_time: {
              invocations: invocations.length,
            },
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Echo failed:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
};

export type GetFunctionPerfomanceByNameHandlerParameters = {
  name: string;
};

export type GetFunctionPerfomanceByNameHandlerDependencies = {
  relays: string[];
  key_manager: KeyManager;
};

export type GetFunctionPerfomanceByNameHandler = (
  parameters: GetFunctionPerfomanceByNameHandlerParameters,
  dependencies: GetFunctionPerfomanceByNameHandlerDependencies
) => Promise<CallToolResult>;
