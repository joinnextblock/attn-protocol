export namespace PROMO_PROTOCOL {
  export namespace API {
    export type ApiConfig = {
      nostr: ApiNostrConfig;
      mcp: ApiMcpConfig;
      whitelist: ApiWhitelistConfig;
    };
    export type ApiNostrConfig = {
      privateKey: string;
      relays: string[];
    };
    export type ApiMcpConfig = {
      version: string;
      name: string;
      about: string;
      clientName: string;
      clientVersion: string;
    };
    export type ApiWhitelistConfig = {
      allowedDVMs: string[];
    };
  }
}
