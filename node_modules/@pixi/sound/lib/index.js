'use strict';

var instance = require('./instance.js');
var SoundLibrary = require('./SoundLibrary.js');
var index = require('./htmlaudio/index.js');
var index$1 = require('./filters/index.js');
var index$2 = require('./webaudio/index.js');
var index$3 = require('./utils/index.js');
var Sound = require('./Sound.js');
var soundAsset = require('./soundAsset.js');
var Filterable = require('./Filterable.js');
var Filter = require('./filters/Filter.js');
var SoundSprite = require('./SoundSprite.js');

const sound = instance.setInstance(new SoundLibrary.SoundLibrary());

exports.SoundLibrary = SoundLibrary.SoundLibrary;
exports.htmlaudio = index;
exports.filters = index$1;
exports.webaudio = index$2;
exports.utils = index$3;
exports.Sound = Sound.Sound;
exports.soundAsset = soundAsset.soundAsset;
exports.Filterable = Filterable.Filterable;
exports.Filter = Filter.Filter;
exports.SoundSprite = SoundSprite.SoundSprite;
exports.sound = sound;
//# sourceMappingURL=index.js.map
