import { For } from 'solid-js';
import './billboard.css';

interface Props {
  name: string;
  description: string;
  image: string;
  url: string;
  kinds?: number[];
  nips?: string[];
}

export function Billboard({ name, description, image, url, kinds = [1], nips = ['NIP-X1'] }: Props) {
  function handleMouseOver(e: any) {
    e.currentTarget.style.transform = 'translateY(-5px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
  }

  function handleMouseOut(e: any) {
    e.currentTarget.style.transform = 'none';
    e.currentTarget.style.boxShadow = 'none';
  }

  function handleClick(url: string) {
    // TODO: Open in new tab
    window.open(url, '_blank');
  }

  return (
    // <a href={url} target="_blank" rel="noopener noreferrer" class="billboard-link">
    <div class="billboard" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} onclick={() => handleClick(url)}>
      <img src={image} alt={name} class="billboard-image" />
      <div class="billboard-content">
        <p>
          <strong>{name}</strong>
          <br />
          {description}
        </p>
        <div class="kind-pills">
          <For each={kinds}>{(kind) => <span class="kind-pill">{kind}</span>}</For>
        </div>
        <div class="nip-pills">
          <For each={nips}>{(nip) => <span class="nip-pill">{nip}</span>}</For>
        </div>
      </div>
    </div>
    // </a>
  );
}
