export namespace PROMO_PROTOCOL {
  export namespace BILLBOARD {
    export type BillboardConfig = {
      environment: BillboardEnvironmentConfig;
      nostr: BillboardNostrConfig;
      billboard: BillboardServerConfig;
      api: BillboardApiConfig;
      mcp: BillboardMcpConfig;
    }

    export type BillboardNostrConfig = {
      private_key: string;
      relays: string[];
    }

    export type BillboardEnvironmentConfig = {
      log_level: string;
    }

    export type BillboardServerConfig = {
      name: string;
      about: string;
      image: string;
      url: string;
      kinds: number[];
    }

    export type BillboardApiConfig = {
      public_key: string;
    }

    export type BillboardMcpConfig = {
      version: string;
      name: string;
      about: string;
      clientName: string;
      clientVersion: string;
      picture: string;
      website: string;
    }
  }
}
