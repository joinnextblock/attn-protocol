# get-function-performance-by-name

Retrieves performance metrics for a specific function by name.

## Parameters

- `name` (string): Function name to get performance metrics for

## Dependencies

- `relays` (string[]): Array of Nostr relay URLs

## Example Call

```typescript
const result = await get_function_performance_by_name_handler(
  {
    name: "function_name"
  }: GetFunctionPerformanceByNameHandlerParameters,
  {
    relays: ["wss://relay1.example.com", "wss://relay2.example.com"]
  }: GetFunctionPerformanceByNameHandlerDependencies,
);
```

## Returns

Returns a JSON object containing:

- `all_time`: All-time performance metrics for the function

## Example Response

```json
{
  "all_time": {
    "invocations": 9999
  }
}
```

## Error Handling

Returns error message if performance metrics retrieval fails.
