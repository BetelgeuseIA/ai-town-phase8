'use strict';

var core = require('@pixi/core');
var assets = require('@pixi/assets');
var supported = require('./utils/supported.js');
var Sound = require('./Sound.js');
var instance = require('./instance.js');

const getAlias = (asset) => {
  const url = asset.src;
  return asset?.alias?.[0] ?? core.utils.path.basename(url, core.utils.path.extname(url));
};
const soundAsset = {
  extension: core.ExtensionType.Asset,
  detection: {
    test: async () => true,
    add: async (formats) => [...formats, ...supported.extensions.filter((ext) => supported.supported[ext])],
    remove: async (formats) => formats.filter((ext) => formats.includes(ext))
  },
  loader: {
    extension: {
      type: [core.ExtensionType.LoadParser],
      priority: assets.LoaderParserPriority.High
    },
    /** Should we attempt to load this file? */
    test(url) {
      const ext = core.utils.path.extname(url).slice(1);
      return !!supported.supported[ext] || supported.mimes.some((mime) => url.startsWith(`data:${mime}`));
    },
    /** Load the sound file, this is mostly handled by Sound.from() */
    async load(url, asset) {
      const sound = await new Promise((resolve, reject) => Sound.Sound.from({
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
      instance.getInstance().add(getAlias(asset), sound);
      return sound;
    },
    /** Remove the sound from the library */
    async unload(_sound, asset) {
      instance.getInstance().remove(getAlias(asset));
    }
  }
};
core.extensions.add(soundAsset);

exports.soundAsset = soundAsset;
//# sourceMappingURL=soundAsset.js.map
