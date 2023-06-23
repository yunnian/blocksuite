import type { DocProviderCreator } from '@blocksuite/store';
import { createAsyncCallRPCProviderCreator } from '@blocksuite/store/providers/async-call-rpc.js';
import type { EventBasedChannel } from 'async-call-rpc';
import { BSON_Serialization } from 'async-call-rpc/utils/web/bson.js';
import { deserialize, serialize } from 'bson';

class WebSocketMessageChannel extends WebSocket implements EventBasedChannel {
  on(listener: (data: unknown) => void) {
    const f = (e: MessageEvent) => {
      listener(e.data);
    };
    this.addEventListener('message', f);
    return () => this.removeEventListener('message', f);
  }

  override send(data: any): void {
    if (this.readyState === this.CONNECTING) {
      this.addEventListener('open', () => this.send(data), { once: true });
    } else super.send(data);
  }
}

export const createWebSocketClientProvider: DocProviderCreator = (
  id,
  doc,
  options
) => {
  const channel = new WebSocketMessageChannel('ws://localhost:8081/' + id);
  const creator = createAsyncCallRPCProviderCreator(
    'websocket-client',
    channel,
    {
      cleanup: () => {
        channel.close();
      },
      asyncCallOptions: {
        log: 'all',
        serializer: BSON_Serialization({
          serialize,
          deserialize,
        }),
      },
    }
  );
  return creator(id, doc, options);
};
