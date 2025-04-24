import { createRxNostr, noopVerifier } from 'rx-nostr';

export const rxNostr = createRxNostr({
  // skip verification here because we are going to verify events at the event store
  skipVerify: true,
  verifier: noopVerifier,
});
