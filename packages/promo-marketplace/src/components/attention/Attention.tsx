export type AttentionProps = {
  attention_event: any;
};
export function Attention({ attention_event }: AttentionProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '5px' }}>
      <div>id: {attention_event.id.slice(0, 8)}</div>
      <div>max_duration: {attention_event.tags.find((tag: any) => tag[0] === 'max_duration')?.[1]} seconds</div>
      <div>
        sats_per_second: {attention_event.tags.find((tag: any) => tag[0] === 'sats_per_second')?.[1]} sats/second
      </div>
    </div>
  );
}
