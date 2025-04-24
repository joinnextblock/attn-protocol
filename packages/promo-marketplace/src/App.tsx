import './App.css';
import { For, from, onCleanup, onMount } from 'solid-js';
import { eventStore, queryStore } from './stores';
import { SimplePool } from 'nostr-tools/pool';
import { v4 as uuid } from 'uuid';
import { ProfileQuery } from 'applesauce-core/queries';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { Attention } from './components/attention/Attention';
import { Promotion } from './components/promotion/Promotion';

const BILLBOARD_PUBKEY = import.meta.env.VITE_BILLBOARD_PUBKEY;

function App() {
  let pool: SimplePool;
  let relays = ['ws://localhost:10547'];

  onMount(async () => {
    console.log('onMount');
    console.log({ BILLBOARD_PUBKEY });

    pool = new SimplePool();

    const filters = [
      { kinds: [38888], '#p': [BILLBOARD_PUBKEY] }, // all ATTENTION events for BILLBOARD
      { kinds: [38188], '#p': [BILLBOARD_PUBKEY] }, // all PROMOTION events for BILLBOARD
      { kinds: [38388], '#p': [BILLBOARD_PUBKEY] }, // all MATCH events for BILLBOARD
    ];
    const handlers = {
      onevent: (event: any) => {
        // console.log('onevent', event);
        eventStore.add(event);
      },
      onclose: () => {
        console.log('onclose');
      },
      oneose: () => {
        console.log('oneose');
      },
    };

    const subscription = await pool.subscribeMany(relays, filters, handlers);

    console.log({ subscription });
  });

  onCleanup(async () => {
    console.log('onCleanup');
  });

  const publish_attention_event = async () => {
    console.log('publish_attention_event');
    const private_key = await generateSecretKey();

    const pubkey = getPublicKey(private_key);

    const unsigned_event = {
      kind: 38888,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      content: '',
      tags: [
        ['d', BILLBOARD_PUBKEY],
        ['p', BILLBOARD_PUBKEY],
        ['p', pubkey],
        ['max_duration', `${Math.floor(Math.random() * 45) + 15}`],
        ['sats_per_second', `${Math.floor(Math.random() * 10) + 1}`],
        ['billboard_pubkey', BILLBOARD_PUBKEY],
      ],
    };
    console.log({ unsigned_event });
    // Sign event with private key
    const signed_event = finalizeEvent(unsigned_event, private_key);
    // publish event to relay
    await pool.publish(relays, signed_event);
  };

  const publish_promotion_event = async () => {
    console.log('publish_attention_event');
    const private_key = generateSecretKey();
    const pubkey = getPublicKey(private_key);
    const promoted_event_id = uuid();

    const unsigned_event = {
      kind: 38188,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      content: '',
      tags: [
        ['d', BILLBOARD_PUBKEY],
        ['e', promoted_event_id],
        ['p', BILLBOARD_PUBKEY],
        ['p', pubkey],
        ['duration', `${Math.floor(Math.random() * 45) + 15}`],
        ['sats_per_second', `${Math.floor(Math.random() * 10) + 1}`],
        ['billboard_pubkey', BILLBOARD_PUBKEY],
        ['promoted_event_id', promoted_event_id],
      ],
    };
    console.log({ unsigned_event });
    // Sign event with private key
    const signed_event = finalizeEvent(unsigned_event, private_key);
    // publish event to relay
    await pool.publish(relays, signed_event);
    console.log('published promotion event');
  };

  // Subscribe to fiatjaf's profile from the query store
  const billboard_profile = from(queryStore.createQuery(ProfileQuery, BILLBOARD_PUBKEY));

  const sortedAttentionEvents = () => {
    const events = attention_events();
    if (!events) return [];

    return events.sort((a, b) => {
      const parsed_a =
        a.tags.find((tag) => tag[0] === 'max_duration')?.[1] * a.tags.find((tag) => tag[0] === 'sats_per_second')?.[1];
      const parsed_b =
        b.tags.find((tag) => tag[0] === 'max_duration')?.[1] * b.tags.find((tag) => tag[0] === 'sats_per_second')?.[1];

      // Sort by max_duration * sats_per_second descending
      const a_value = parsed_a;
      const b_value = parsed_b;
      return b_value - a_value;
    });
  };

  const sortedPromotionEvents = () => {
    const events = promotion_events();
    if (!events) return [];

    return events.sort((a, b) => {
      const parsed_a =
        a.tags.find((tag) => tag[0] === 'duration')?.[1] * a.tags.find((tag) => tag[0] === 'sats_per_second')?.[1];
      const parsed_b =
        b.tags.find((tag) => tag[0] === 'duration')?.[1] * b.tags.find((tag) => tag[0] === 'sats_per_second')?.[1];

      // Sort by duration * sats_per_second descending
      const a_value = parsed_a;
      const b_value = parsed_b;
      return b_value - a_value;
    });
  };

  const promotion_events = from(queryStore.timeline({ kinds: [38188] }));
  const attention_events = from(queryStore.timeline({ kinds: [38888] }));
  const match_events = from(queryStore.timeline({ kinds: [38388] }));

  const total_attention_duration = () =>
    attention_events()?.reduce((sum, event) => {
      const max_duration = parseInt(event.tags.find((tag) => tag[0] === 'max_duration')?.[1]);
      return sum + max_duration;
    }, 0);

  const total_promotion_duration = () =>
    promotion_events()?.reduce((sum, event) => {
      const duration = parseInt(event.tags.find((tag) => tag[0] === 'duration')?.[1]);
      return sum + duration;
    }, 0);

  return (
    <div>
      <h1>The Marketplace</h1>
      <div
        style={{
          display: 'grid',
          'grid-template-columns': 'repeat(3, 33.33%)',
          gap: '1rem',
          width: '100%',
        }}
      >
        <div class="column">
          <div class="card">
            <h2>Total Attention</h2>
            <p>{total_attention_duration()} seconds</p>

            <button onClick={publish_attention_event}>Add Attention</button>
          </div>
          <div class="card">
            <div>
              <For each={sortedAttentionEvents()}>
                {(attention_event) => <Attention attention_event={attention_event} />}
              </For>
            </div>
          </div>
        </div>

        <div class="column">
          <div class="card">
            <h2>Total Matches</h2>
            <p>{match_events()?.length} matches</p>
          </div>
          <div class="card">
            <div>
              <For each={match_events()}>
                {({ tags = [] }) => (
                  <div
                    style={{
                      border: '1px solid #ccc',
                      padding: '10px',
                      margin: '5px',
                    }}
                  >
                    {tags.find((tag) => tag[0] === 'attention_event_id')?.[1].slice(0, 8)}
                    {'<==>'}
                    {tags.find((tag) => tag[0] === 'promotion_event_id')?.[1].slice(0, 8)}
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="column">
          <div class="card">
            <h2>Total Promotion</h2>
            <p>{total_promotion_duration()} seconds</p>
            <button onClick={publish_promotion_event}>Add Promotion</button>
          </div>
          <div class="card">
            <div>
              <For each={sortedPromotionEvents()}>
                {(promotion_event) => <Promotion promotion_event={promotion_event} />}
              </For>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <h1>{billboard_profile()?.name}</h1>
        <img src={billboard_profile()?.picture} class="logo" />
        <h2>Billboard Relays</h2>
        <p>{relays.join(', ')}</p>
      </div>
    </div>
  );
}

export default App;
