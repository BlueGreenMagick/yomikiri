import Config from "./config";
import { Platform } from "@platform"
import Utils from "./utils";

/** If config['tts.voice'] is null, re-check if tts is available and update config */
export async function updateTTSAvailability(platform: Platform, config: Config): Promise<void> {
  Utils.log("updateTTS");
  if (config.get("tts.voice") !== null) return;
  const voices = await platform.japaneseTTSVoices();
  Utils.log(voices)
  if (voices.length === 0) return;
  // reverse order sort
  voices.sort((a, b) => b.quality - a.quality)
  config.set("tts.voice", voices[0])
}