import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('Echo Server', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', 'src/mcp-server.ts'],
    });

    client = new Client(
      {
        name: 'echo-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
  });

  test('should successfully connect to Echo server', () => {
    expect(client).toBeDefined();
    expect(transport).toBeDefined();
  });

  test('should have echo tool available', async () => {
    const tools = await client.listTools();
    console.log('tools!', tools);
    expect(tools).toBeDefined();
  });

  test('should echo text without modification', async () => {
    const testText = 'Hello, World!';
    const result = (await client.callTool({
      name: 'echo',
      arguments: {
        text: testText,
      },
    })) as CallToolResult;

    expect(result.content[0]).toEqual({
      type: 'text',
      text: testText,
    });
  }, 10000);

  test('should handle empty string', async () => {
    const result = (await client.callTool({
      name: 'echo',
      arguments: {
        text: '',
      },
    })) as CallToolResult;

    expect(result.content[0]).toEqual({
      type: 'text',
      text: '',
    });
  }, 10000);
});
