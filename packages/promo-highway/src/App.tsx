import './App.css';
import { For, from, onCleanup, onMount } from 'solid-js';
import { eventStore, queryStore } from './stores';
import { SimplePool, SubCloser } from 'nostr-tools/pool';

import { Billboard } from './components/billboard';

import { relays } from '../config.json';

function App() {
  const pool = new SimplePool();

  onMount(async () => {
    console.log('onMount');

    init(pool);
  });

  function init(pool: SimplePool): SubCloser {
    const filters = [
      { kinds: [38088, 38888, 38188, 38388] }, // BILLBOARD specific events
    ];
    const handlers = {
      onevent: (event: any) => {
        console.log('onevent', event);
        eventStore.add(event);
      },
      onclose: () => {
        console.log('onclose');
      },
      oneose: () => {
        console.log('oneose');
      },
    };

    const subscription = pool.subscribeMany(relays, filters, handlers);

    return subscription;
  }

  onCleanup(async () => {
    console.log('onCleanup');
  });

  const billboard_events = from(queryStore.timeline({ kinds: [38088] }));

  return (
    <>
      <div>
        <div class="header">The Billboard Index</div>
        <For each={billboard_events()}>
          {(event) => {
            const { tags = [] } = event;
            const name = tags.find(([key]) => key === 'name')?.[1] || '';
            const description = tags.find(([key]) => key === 'description')?.[1] || '';
            const image = tags.find(([key]) => key === 'image')?.[1] || '';
            const url = tags.find(([key, _value, priority]) => key === 'url' && priority === 'primary')?.[1] || '';
            const nips = tags.filter(([key]) => key === 'nip').map(([_, value]) => value);
            const kinds = tags
              .filter(([key]) => key === 'k')
              .map(([_, value]) => parseInt(value))
              .sort((a, b) => a - b);
            return (
              <Billboard name={name} description={description} image={image} url={url} nips={nips} kinds={kinds} />
            );
          }}
        </For>
        <div class="footer"></div>
      </div>
    </>
  );
}

export default App;
