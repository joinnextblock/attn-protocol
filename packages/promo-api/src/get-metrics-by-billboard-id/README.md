# get-metrics-by-billboard-id

Retrieves metrics for a specific billboard, including both all-time and interval-based statistics.

## Parameters

- `billboard_id` (string): BILLBOARD pubkey

## Dependencies
- `relays` (string[]): Array of Nostr relay URLs

## Example Call

```typescript
const result = await get_metrics_by_billboard_id_handler(
  {
    billboard_id: "billboard123"
  }: GetMetricsByBillboardIdHandlerParameters,
  {
    relays: ["wss://relay1.example.com", "wss://relay2.example.com"]
  }: GetMetricsByBillboardIdHandlerDependencies,
);
```

## Returns

Returns a JSON object containing:

- `all_time`: All-time metrics for the billboard

## Example Response

```json
{
  "all_time": {
    "attention": {
      "count": 150,
      "total_seconds": 3600,
      "sats_per_second_average": 100,
      "sats_per_second_max": 500,
      "sats_per_second_min": 10
    },
    "promotion": {
      "count": 75,
      "total_seconds": 1800,
      "sats_per_second_average": 200,
      "sats_per_second_max": 1000,
      "sats_per_second_min": 50
    },
    "match": {
      "count": 25
    }
  }
}
```

## Error Handling

Returns error message if metrics retrieval fails.

