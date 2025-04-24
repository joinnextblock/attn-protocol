export type PromotionProps = {
  promotion_event: any;
};
export function Promotion({ promotion_event }: PromotionProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '5px' }}>
      <div>id: {promotion_event.id.slice(0, 8)}</div>
      <div>duration: {promotion_event.tags.find((tag: any) => tag[0] === 'duration')?.[1]} seconds</div>
      <div>
        sats_per_second: {promotion_event.tags.find((tag: any) => tag[0] === 'sats_per_second')?.[1]} sats/second
      </div>
    </div>
  );
}
