export const options: OptionsGroup[] = [
  {
    name: "Anki",
    options: [
      {
        type: "number",
        key: "anki.connect_port",
        title: "AnkiConnect port number",
        description: "This is the AnkiConnect config `webBindPort`.",
      },
      {
        type: "click",
        title: "Setup Anki template",
        onClick: () => {
          console.log("Setup Anki Template");
        },
      },
    ],
  },
];

export interface OptionsGroup {
  name: string;
  options: Option[];
}

export type Option = ClickOptions | NumberOptions;

interface BaseOption {
  title: string;
  description?: string;
}

export interface ClickOptions extends BaseOption {
  type: "click";
  onClick: () => void;
}

export interface NumberOptions extends BaseOption {
  key: string;
  type: "number";
}
