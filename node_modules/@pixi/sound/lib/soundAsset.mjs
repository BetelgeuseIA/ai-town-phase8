import { ExtensionType, utils, extensions as extensions$1 } from '@pixi/core';
import { LoaderParserPriority } from '@pixi/assets';
import { extensions, supported, mimes } from './utils/supported.mjs';
import { Sound } from './Sound.mjs';
import { getInstance } from './instance.mjs';

const getAlias = (asset) => {
  const url = asset.src;
  return asset?.alias?.[0] ?? utils.path.basename(url, utils.path.extname(url));
};
const soundAsset = {
  extension: ExtensionType.Asset,
  detection: {
    test: async () => true,
    add: async (formats) => [...formats, ...extensions.filter((ext) => supported[ext])],
    remove: async (formats) => formats.filter((ext) => formats.includes(ext))
  },
  loader: {
    extension: {
      type: [ExtensionType.LoadParser],
      priority: LoaderParserPriority.High
    },
    /** Should we attempt to load this file? */
    test(url) {
      const ext = utils.path.extname(url).slice(1);
      return !!supported[ext] || mimes.some((mime) => url.startsWith(`data:${mime}`));
    },
    /** Load the sound file, this is mostly handled by Sound.from() */
    async load(url, asset) {
      const sound = await new Promise((resolve, reject) => Sound.from({
        ...asset.data,
        url,
        preload: true,
        loaded(err, sound2) {
          if (err) {
            reject(err);
          } else {
            resolve(sound2);
          }
          asset.data?.loaded?.(err, sound2);
        }
      }));
      getInstance().add(getAlias(asset), sound);
      return sound;
    },
    /** Remove the sound from the library */
    async unload(_sound, asset) {
      getInstance().remove(getAlias(asset));
    }
  }
};
extensions$1.add(soundAsset);

export { soundAsset };
//# sourceMappingURL=soundAsset.mjs.map
