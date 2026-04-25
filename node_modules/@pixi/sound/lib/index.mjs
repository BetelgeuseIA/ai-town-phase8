import { setInstance } from './instance.mjs';
import { SoundLibrary } from './SoundLibrary.mjs';
import * as index from './htmlaudio/index.mjs';
export { index as htmlaudio };
import * as index$1 from './filters/index.mjs';
export { index$1 as filters };
import * as index$2 from './webaudio/index.mjs';
export { index$2 as webaudio };
import * as index$3 from './utils/index.mjs';
export { index$3 as utils };
export { Sound } from './Sound.mjs';
export { soundAsset } from './soundAsset.mjs';
export { Filterable } from './Filterable.mjs';
export { Filter } from './filters/Filter.mjs';
export { SoundSprite } from './SoundSprite.mjs';

const sound = setInstance(new SoundLibrary());

export { SoundLibrary, sound };
//# sourceMappingURL=index.mjs.map
