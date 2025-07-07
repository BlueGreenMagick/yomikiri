/** list of keys that is used for connection */
type ConnectionKey = "updateDictionary";
type ConnectionHandler = (port: chrome.runtime.Port) => void;

export function handleConnection(
  name: ConnectionKey,
  handler: ConnectionHandler,
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== name) return;
    handler(port);
  });
}

export function createConnection(name: ConnectionKey) {
  return chrome.runtime.connect({ name });
}
