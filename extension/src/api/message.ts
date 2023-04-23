import type { Entry } from "../dictionary";

/// type map for `{ key: [resquest, response] }`
export interface MessageMap {
    "searchTerm": [string, Entry[]];
}