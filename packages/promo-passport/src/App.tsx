import { from, onMount } from 'solid-js';
import './App.css';
import { queryStore } from './background';
import { ProfileQuery } from 'applesauce-core/queries';

function App() {
  const nextblock_profile = from(
    queryStore.createQuery(ProfileQuery, 'f32184ee7b85d2d768fffddbc32c75bbed6d92e2dd437142af5c50086d1c17bf')
  );

  onMount(async () => {
    console.log('onMount');

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'REFRESH') {
        chrome.windows.create({
          url: chrome.runtime.getURL('dist/index.html'),
          type: 'popup',
          width: 400,
          height: 600,
        });
      }
      sendResponse({ success: true });
    });

    await chrome.runtime.sendMessage({ type: 'ON_MOUNT' });
  });

  const handle_login_click = () => {
    console.log('login');
  };

  return (
    <>
      <div>
        <img src={nextblock_profile()?.banner} class="logo" />
      </div>
      <div class="card">
        <button onClick={handle_login_click}>go to billboard</button>
      </div>
    </>
  );
}

export default App;
