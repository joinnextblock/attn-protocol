import { RelayHandler } from "@dvmcp/commons/nostr/relay-handler";
import { KeyManager } from "@dvmcp/commons/nostr/key-manager";
import { SubCloser } from "nostr-tools/pool";
import { publish_match_event } from "../publish_match_event";
import { Event } from "nostr-tools";
export type SubscribeArgs = {
    relay_handler: RelayHandler,
    key_manager: KeyManager
}

export type SubscribeResult = SubCloser[]

export const subscribe = ({ relay_handler, key_manager }: SubscribeArgs): SubscribeResult => {
    const attention_event_subscription = relay_handler.subscribeToRequests(
        async (attention_event: Event) => {
            // console.log('onevent', event);
            const attention_billboard_pubkey = attention_event.tags.find((tag: any) => tag[0] === "billboard_pubkey")?.[1];
            const attention_max_duration = parseFloat(attention_event.tags.find((tag: any) => tag[0] === "max_duration")?.[1] || '0');
            const attention_sats_per_second = parseFloat(attention_event.tags.find((tag: any) => tag[0] === "sats_per_second")?.[1] || '0');

            const promotion_events = await relay_handler.queryEvents({ kinds: [38188], "#p": [attention_billboard_pubkey || ''] })

            // TODO: if there are promotion events, filter list to only promotion with sats_per_second >= event.sats_per_second
            for (const promotion_event of promotion_events) {
                const promotion_billboard_pubkey = promotion_event.tags.find((tag: any) => tag[0] === "billboard_pubkey")?.[1];

                // if the promotion event is for the same billboard as the attention event, attempt to match
                if (promotion_billboard_pubkey === attention_billboard_pubkey) {

                    const promotion_duration = parseFloat(promotion_event.tags.find((tag: any) => tag[0] === "duration")?.[1] || '0');
                    const promotion_sats_per_second = parseFloat(promotion_event.tags.find((tag: any) => tag[0] === "sats_per_second")?.[1] || '0');
                    // console.log('promotion_sats_per_second', promotion_sats_per_second, 'attention_sats_per_second', attention_sats_per_second);
                    // console.log('promotion_duration', promotion_duration, 'attention_max_duration', attention_max_duration);
                    if (promotion_sats_per_second >= attention_sats_per_second && promotion_duration <= attention_max_duration) {
                        // console.log('promotion_event', promotion_event);
                        await publish_match_event({ attention_event, promotion_event, billboard_pubkey: attention_billboard_pubkey }, { relay_handler, key_manager });
                    }
                }
            }
        },
        { kinds: [38888], }, // all ATTENTION events for BILLBOARD
    );

    const promotion_event_subscription = relay_handler.subscribeToRequests(
        async (promotion_event: Event) => {
            const promotion_billboard_pubkey = promotion_event.tags.find((tag: any) => tag[0] === "billboard_pubkey")?.[1];
            const promotion_duration = parseFloat(promotion_event.tags.find((tag: any) => tag[0] === "duration")?.[1] || '0');
            const promotion_sats_per_second = parseFloat(promotion_event.tags.find((tag: any) => tag[0] === "sats_per_second")?.[1] || '0');

            const attention_events = await relay_handler.queryEvents({ kinds: [38888], "#p": [promotion_billboard_pubkey] })

            // TODO: if there are promotion events, filter list to only promotion with sats_per_second >= event.sats_per_second
            for (const attention_event of attention_events) {
                const attention_billboard_pubkey = attention_event.tags.find((tag: any) => tag[0] === "billboard_pubkey")?.[1];

                // if the promotion event is for the same billboard as the attention event, attempt to match
                if (promotion_billboard_pubkey === attention_billboard_pubkey) {

                    const attention_max_duration = parseFloat(attention_event.tags.find((tag: any) => tag[0] === "max_duration")?.[1] || '0');
                    const attention_sats_per_second = parseFloat(attention_event.tags.find((tag: any) => tag[0] === "sats_per_second")?.[1] || '0');
                    console.log('promotion_sats_per_second', promotion_sats_per_second, 'attention_sats_per_second', attention_sats_per_second);
                    console.log('promotion_duration', promotion_duration, 'attention_max_duration', attention_max_duration);
                    if (promotion_sats_per_second >= attention_sats_per_second && promotion_duration <= attention_max_duration) {
                        console.log({ attention_event, promotion_event }, 'its a match');
                        await publish_match_event({ attention_event, promotion_event, billboard_pubkey: promotion_billboard_pubkey }, { relay_handler, key_manager });
                    }
                }
            }
        },
        { kinds: [38188] }, // all PROMOTION events for BILLBOARD
    );

    const match_event_subscription = relay_handler.subscribeToRequests(
        (event: any) => {
            // console.log('onevent', event);
        },
        { kinds: [38388] }, // all MATCH events for BILLBOARD
    );

    return [
        attention_event_subscription,
        promotion_event_subscription,
        match_event_subscription,
    ]
}