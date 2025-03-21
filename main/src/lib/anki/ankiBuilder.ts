import type { Token, TokenizeResult } from "@platform/backend";
import Config from "../config";
import { getReadingForForm, getWordEntryMainForm } from "../dicEntry";
import { RubyString } from "../japanese";
import { Platform } from "@platform";
import Utils, { escapeHTML } from "../utils";
import type {
  AnkiTemplateField,
  AnkiTemplateFieldContent,
  AnkiTemplateFieldTypes,
} from "./template";
import { YomikiriError } from "lib/error";
import type { SelectedMeaning } from "components/dictionary/dicEntriesModel";
import type { WordEntry } from "@platform/backend";

export interface LoadingAnkiNote {
  deck: string;
  notetype: string;
  fields: (LoadingField | Field)[];
  tags: string;
}

export interface AnkiNote extends LoadingAnkiNote {
  fields: Field[];
}

export interface Field {
  name: string;
  value: string;
}

export interface LoadingField {
  name: string;
  value: string | Utils.PromiseWithProgress<string, string>;
}

export interface AnkiBuilderContext {
  config: Config;
}

/** This data is saved in the history */
export interface AnkiBuilderData {
  tokenized: TokenizeResult;
  entry: WordEntry;
  selected?: SelectedMeaning | undefined;
  /** NFC normalized string */
  sentence: string;
  /** window.location.href */
  url: string;
  /** document.title */
  pageTitle: string;
}

export type AnkiFieldBuilder = (
  ctx: AnkiBuilderContext,
  data: AnkiBuilderData,
) => string | Utils.PromiseWithProgress<string, string>;

export async function waitForNoteToLoad(note: LoadingAnkiNote): Promise<void> {
  const promises = [];
  for (const field of note.fields) {
    if (field.value instanceof Promise) {
      promises.push(field.value);
    }
  }
  await Promise.allSettled(promises);
}

/** LoadingNoteData is in-place resolved to NoteData */
export async function resolveAnkiNote(
  note: LoadingAnkiNote,
): Promise<AnkiNote> {
  for (const field of note.fields) {
    field.value = await field.value;
  }
  return note as AnkiNote;
}

export function buildAnkiNote(
  ctx: AnkiBuilderContext,
  data: AnkiBuilderData,
): LoadingAnkiNote {
  const template = ctx.config.get("anki.anki_template");
  if (template === null) {
    throw new YomikiriError(
      "You need to set up Anki template in the extension settings first.",
    );
  }

  const note: LoadingAnkiNote = {
    ...template,
    fields: [],
  };
  for (const templateField of template.fields) {
    const fieldValue = buildAnkiField(ctx, data, templateField);
    note.fields.push(fieldValue);
  }
  return note;
}

type FieldBuilder<T extends AnkiTemplateFieldContent> = (
  template: AnkiTemplateFieldTypes[T],
  data: AnkiBuilderData,
  ctx: AnkiBuilderContext,
) => string | Utils.PromiseWithProgress<string, string>;

const fieldBuilders: Partial<{
  [K in AnkiTemplateFieldContent]: FieldBuilder<K>;
}> = {};

export function buildAnkiField(
  ctx: AnkiBuilderContext,
  data: AnkiBuilderData,
  template: AnkiTemplateField,
): LoadingField | Field {
  const builder = fieldBuilders[template.content];
  if (builder === undefined) {
    throw new YomikiriError(
      `Invalid Anki template field type: '${template.content}'`,
    );
  }
  // @ts-expect-error -- template type is correct
  const value = builder(template, data, ctx);

  return {
    name: template.name,
    value,
  };
}

function addBuilder<T extends AnkiTemplateFieldContent>(
  type: T,
  builder: (typeof fieldBuilders)[T],
) {
  fieldBuilders[type] = builder;
}

addBuilder("", () => "");

addBuilder("word", (opts, data) => {
  const token = data.tokenized.tokens[data.tokenized.tokenIdx];

  let word: string;
  let reading: string;
  if (opts.form === "as-is") {
    word = token.text;
    reading = token.reading;
  } else if (opts.form === "dict-form") {
    word = token.base;
    reading = getReadingForForm(data.entry, word, false).reading;
  } else if (opts.form === "main-dict-form") {
    word = getWordEntryMainForm(data.entry);
    reading = getReadingForForm(data.entry, word, false).reading;
  } else {
    throw new YomikiriError(
      `Invalid Anki template field option value for 'form': '${opts.form}'`,
    );
  }

  word = escapeHTML(word);
  reading = escapeHTML(reading);

  if (opts.style === "basic") {
    return word;
  } else if (opts.style === "furigana-anki") {
    const rubied = RubyString.generate(word, reading);
    return RubyString.toAnki(rubied);
  } else if (opts.style === "furigana-html") {
    const rubied = RubyString.generate(word, reading);
    return RubyString.toHtml(rubied);
  } else if (opts.style === "kana-only") {
    return reading;
  } else {
    throw new YomikiriError(
      `Invalid Anki template field option value for 'style': '${opts.style}`,
    );
  }
});

addBuilder("meaning", (opts, data) => {
  if (data.selected === undefined) {
    const format = opts.full_format;
    if (
      !["numbered", "unnumbered", "line", "div", "yomichan"].includes(format)
    ) {
      throw new YomikiriError(
        `Invalid Anki template field option value for 'full_format': '${format}`,
      );
    }

    let indent = 0;
    const lines: string[] = [];

    const addLine = (text: string) => {
      lines.push("  ".repeat(indent) + text);
    };

    if (format === "div") {
      addLine('<div class="yomi-entry">');
      indent += 1;
    } else if (format === "yomichan") {
      addLine('<div style="text-align: left;">');
      indent += 1;
      addLine("<ol>");
      indent += 1;
    }

    for (const group of data.entry.groupedSenses) {
      if (format === "div") {
        addLine('<div class="yomi-group">');
        indent += 1;
      } else if (format === "yomichan") {
        addLine("<li>");
        indent += 1;
      }

      // used for 'line' meaning
      let lineMeaning = "";

      if (opts.full_pos) {
        const poss = escapeHTML(group.pos.join(", "));
        if (format === "yomichan") {
          addLine(`<i>(${poss})</i>`);
        } else if (format === "line") {
          lineMeaning += `(${poss}) `;
        } else {
          addLine(`<div class="yomi-pos">(${poss})</div>`);
        }
      }

      if (format === "numbered") {
        addLine("<ol>");
        indent += 1;
      } else if (format === "unnumbered" || format === "yomichan") {
        addLine("<ul>");
        indent += 1;
      } else if (format === "div") {
        addLine('<div class="yomi-meanings">');
        indent += 1;
      }

      const lineMeanings: string[] = [];

      for (const sense of group.senses) {
        let items;
        if (opts.full_max_item > 0) {
          items = sense.meanings.slice(0, opts.full_max_item);
        } else {
          items = sense.meanings;
        }
        if (format === "yomichan") {
          for (const item of items) {
            addLine(`<li>${escapeHTML(item)}</li>`);
          }
        } else {
          const itemsLine = escapeHTML(items.join(", "));
          if (format === "numbered" || format === "unnumbered") {
            addLine(`<li>${itemsLine}</li>`);
          } else if (format === "div") {
            addLine(`<div class="yomi-meaning">${itemsLine}</div>`);
          } else if (format === "line") {
            lineMeanings.push(itemsLine);
          }
        }
      }
      if (format === "line") {
        lineMeaning += lineMeanings.join("; ");
        addLine(lineMeaning);
      }

      if (format === "numbered") {
        indent -= 1;
        addLine("</ol>");
      } else if (format === "unnumbered") {
        indent -= 1;
        addLine("</ul>");
      } else if (format === "div") {
        indent -= 1;
        addLine("</div>");
        indent -= 1;
        addLine("</div>");
      } else if (format === "yomichan") {
        indent -= 1;
        addLine("</ul>");
        indent -= 1;
        addLine("</li>");
      }
    }

    if (format === "div") {
      indent -= 1;
      addLine("</div>");
    } else if (format === "yomichan") {
      indent -= 1;
      addLine("</ol>");
      indent -= 1;
      addLine("</div>");
    }

    if (indent !== 0) {
      throw new YomikiriError(
        "An unexpected error occured while building Anki field content for meaning. Indentation level is not valid.",
      );
    }

    if (format === "line") {
      return lines.join("; ");
    } else {
      return lines.join("\n");
    }
  } else {
    const selected = data.selected;
    const sense = selected.sense;
    let line = "";
    if (opts.single_pos) {
      const poss = selected.partOfSpeech.join(", ");
      line += `(${escapeHTML(poss)}) `;
    }

    let items: string[];
    if (opts.single_max_item > 0) {
      items = sense.meanings.slice(0, opts.single_max_item);
    } else {
      items = sense.meanings;
    }

    line += escapeHTML(items.join(", "));
    return line;
  }
});

addBuilder("sentence", (opts, data) => {
  const tokenized = data.tokenized;
  const tokens = tokenized.tokens;
  const wordToken = tokens[tokenized.tokenIdx];
  const optStyle = opts.style;
  const optWord = opts.word;

  let rubiesToString: (ruby: RubyString) => string;
  if (optStyle === "furigana-html") {
    rubiesToString = RubyString.toHtml;
  } else {
    rubiesToString = RubyString.toAnki;
  }

  let getText: (token: Token) => RubyString;
  if (optStyle === "basic") {
    getText = (token) => RubyString.generate(token.text);
  } else if (optStyle === "furigana-anki" || optStyle === "furigana-html") {
    getText = (token) => RubyString.generate(token.text, token.reading);
  } else if (optStyle === "kana-only") {
    getText = (token) => RubyString.generate(token.reading);
  } else {
    throw new YomikiriError(
      `Invalid Anki template field option value for 'style': '${optStyle}`,
    );
  }

  let wrapWord: (word: string) => string;
  if (optWord === "none") {
    wrapWord = (word) => word;
  } else if (optWord === "bold") {
    wrapWord = (word) => `<b>${word}</b>`;
  } else if (optWord === "cloze") {
    wrapWord = (word) => `{{c1::${word}}}`;
  } else if (optWord === "span") {
    wrapWord = (word) => `<span class="yomi-word">${word}</span>`;
  } else {
    throw new YomikiriError(
      `Invalid Anki template field option value for 'word': '${optWord}`,
    );
  }

  let rubies: RubyString = [];
  for (let i = 0; i < tokenized.tokenIdx; i++) {
    rubies.push(...getText(tokens[i]));
  }
  const pre = Utils.escapeHTML(rubiesToString(rubies));

  const tokenRuby = getText(wordToken);
  const wordString = Utils.escapeHTML(rubiesToString(tokenRuby));
  const mid = wrapWord(wordString);

  rubies = [];
  for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
    rubies.push(...getText(tokens[i]));
  }
  const suf = Utils.escapeHTML(rubiesToString(rubies));

  const sentence = pre + mid + suf;
  return sentence.trim();
});

addBuilder("translated-sentence", (_opts, data) => {
  const translatePromise = Platform.translate(data.sentence);
  const promise = Utils.PromiseWithProgress.fromPromise(
    translatePromise.then((result) => result.translated.trim()),
    "Translating Sentence...",
  );
  return promise;
});

addBuilder("url", (_opts, data) => {
  return data.url;
});

addBuilder("link", (_opts, data) => {
  const el = document.createElement("a");
  el.textContent = data.pageTitle;
  el.href = data.url;
  return el.outerHTML;
});
