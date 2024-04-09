import type {DesktopAnkiApi, IosAnkiApi} from "../common/anki"

export type * from "../common/anki"

export declare const AnkiApi: DesktopAnkiApi | IosAnkiApi
export type AnkiApi = DesktopAnkiApi | IosAnkiApi