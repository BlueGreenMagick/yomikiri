export interface AnkiInfo {
  decks: string[];
  notetypes: NotetypeInfo[];
}

export interface NotetypeInfo {
  name: string;
  fields: string[];
}
