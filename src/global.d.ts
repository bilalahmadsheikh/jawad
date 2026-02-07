// Firefox WebExtension API type declarations
declare namespace browser {
  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>;
    function connect(connectInfo?: { name?: string }): Port;
    function getURL(path: string): string;
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => void | boolean | Promise<unknown>
      ): void;
      removeListener(callback: (...args: unknown[]) => void): void;
    };
    const onConnect: {
      addListener(callback: (port: Port) => void): void;
    };
  }

  interface Port {
    name: string;
    postMessage(message: unknown): void;
    onMessage: {
      addListener(callback: (message: unknown) => void): void;
    };
    onDisconnect: {
      addListener(callback: () => void): void;
    };
    disconnect(): void;
  }

  interface MessageSender {
    tab?: Tab;
    frameId?: number;
    id?: string;
    url?: string;
  }

  interface Tab {
    id?: number;
    url?: string;
    title?: string;
    active?: boolean;
    windowId?: number;
  }

  namespace tabs {
    function query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
      url?: string;
    }): Promise<Tab[]>;
    function create(createProperties: {
      url?: string;
      active?: boolean;
    }): Promise<Tab>;
    function update(
      tabId: number,
      updateProperties: { url?: string; active?: boolean }
    ): Promise<Tab>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
    function captureVisibleTab(
      windowId?: number,
      options?: { format?: string; quality?: number }
    ): Promise<string>;
    function remove(tabIds: number | number[]): Promise<void>;
      const onUpdated: {
          addListener(
            callback: (
              tabId: number,
              changeInfo: { status?: string; url?: string },
              tab: Tab
            ) => void
          ): void;
          removeListener(
            callback: (
              tabId: number,
              changeInfo: { status?: string; url?: string },
              tab: Tab
            ) => void
          ): void;
        };
  }

  namespace storage {
    namespace local {
      function get(
        keys?: string | string[] | null
      ): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
    }
  }
}

