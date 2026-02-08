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
      function remove(keys: string | string[]): Promise<void>;
    }
    function addListener(
      callback: (
        changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
        areaName: string
      ) => void
    ): void;
    function removeListener(
      callback: (
        changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
        areaName: string
      ) => void
    ): void;
    const onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
        ) => void
      ): void;
      removeListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
        ) => void
      ): void;
    };
  }
}

// ---------- Web Speech API type declarations ----------
// Used by the content script for voice input relay

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

// eslint-disable-next-line no-var
declare var SpeechRecognition: {
  new (): SpeechRecognition;
};

// eslint-disable-next-line no-var
declare var webkitSpeechRecognition: {
  new (): SpeechRecognition;
};
