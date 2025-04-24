namespace PROMO_PROTOCOL {
  export namespace COMMONS {
    export type BillboardMetrics = {
      all_time: BillboardMetricsAllTime;
    };
    export type BillboardMetricsAllTime = {
      attention: AttentionMetrics;
      promotion: PromotionMetrics;
      match: MatchMetrics;
    };
    export type AttentionMetrics = {
      count: number;
      total_seconds: number;
      sats_per_second_average: number;
      sats_per_second_max: number;
      sats_per_second_min: number;
    };
    export type PromotionMetrics = {
      count: number;
      total_seconds: number;
      sats_per_second_average: number;
      sats_per_second_max: number;
      sats_per_second_min: number;
    };
    export type MatchMetrics = {
      count: number;
    };
  }
}
