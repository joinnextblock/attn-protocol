/**
 * Mock WebSocket implementation for SDK testing
 */

export class MockWebSocket {
  public url: string;
  public ready_state: number = WebSocket.CONNECTING;
  public listeners: Map<string, Set<Function>> = new Map();
  public sent_messages: string[] = [];
  public closed: boolean = false;
  public close_code?: number;
  public close_reason?: string;

  // WebSocket constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string | URL) {
    this.url = typeof url === 'string' ? url : url.toString();
  }

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler?: Function): void {
    if (!this.listeners.has(event)) return;
    if (handler) {
      this.listeners.get(event)!.delete(handler);
    } else {
      this.listeners.get(event)!.clear();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  send(data: string): void {
    if (this.ready_state !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sent_messages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = true;
    this.close_code = code;
    this.close_reason = reason;
    this.ready_state = WebSocket.CLOSED;
    this._emit('close', code, reason);
  }

  // Test helper methods
  _simulate_open(): void {
    this.ready_state = WebSocket.OPEN;
    this._emit('open');
  }

  _simulate_message(data: string): void {
    this._emit('message', data);
  }

  _simulate_error(error: Error): void {
    this._emit('error', error);
  }

  _simulate_close(code?: number, reason?: string): void {
    this.ready_state = WebSocket.CLOSED;
    this.closed = true;
    this.close_code = code;
    this.close_reason = reason;
    this._emit('close', code, reason);
  }

  private _emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in WebSocket ${event} handler:`, error);
        }
      });
    }
  }

  // Get last sent message
  get_last_message(): string | undefined {
    return this.sent_messages[this.sent_messages.length - 1];
  }

  // Get all sent messages
  get_all_messages(): string[] {
    return [...this.sent_messages];
  }

  // Clear sent messages
  clear_messages(): void {
    this.sent_messages = [];
  }
}

