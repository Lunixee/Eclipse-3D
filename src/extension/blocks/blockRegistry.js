import {organizeBlockPalette} from './blockNavigation.js';
import {consolidateBlockPalette} from './blockSurface.js';
import {customRenderingBlocks} from './customRenderingBlocks.js';
import {physicsAudioBlocks} from './physicsAudioBlocks.js';
import {apiExpansionBlocks} from './apiExpansionBlocks.js';

export const createBlockRegistry = Scratch => organizeBlockPalette(consolidateBlockPalette([
    {
        opcode: 'initializeEngine',
        blockType: Scratch.BlockType.COMMAND,
        text: 'initialize 3D engine using [BACKEND]',
        arguments: {
            BACKEND: {type: Scratch.ArgumentType.STRING, menu: 'backend', defaultValue: 'auto'}
        }
    },
    {opcode: 'resetEngine', blockType: Scratch.BlockType.COMMAND, text: 'reset 3D engine'},
    {opcode: 'disposeEngine', blockType: Scratch.BlockType.COMMAND, text: 'dispose 3D engine'},
    {opcode: 'renderOneFrame', blockType: Scratch.BlockType.COMMAND, text: 'render one 3D frame'},
    {opcode: 'engineInitialized', blockType: Scratch.BlockType.BOOLEAN, text: '3D engine initialized?'},
    {opcode: 'rendererBackend', blockType: Scratch.BlockType.REPORTER, text: '3D renderer backend'},
    {opcode: 'currentFps', blockType: Scratch.BlockType.REPORTER, text: '3D current FPS'},
    {opcode: 'averageFps', blockType: Scratch.BlockType.REPORTER, text: '3D average FPS'},
    {opcode: 'drawCalls', blockType: Scratch.BlockType.REPORTER, text: '3D draw calls'},
    '---',
    {
        opcode: 'setRenderQuality',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set render quality [QUALITY]',
        arguments: {QUALITY: {type: Scratch.ArgumentType.STRING, menu: 'renderQuality', defaultValue: 'medium'}}
    },
    {opcode: 'renderQuality', blockType: Scratch.BlockType.REPORTER, text: 'render quality'},
    {
        opcode: 'setRenderResolutionScale',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set render resolution scale to [PERCENT] %',
        arguments: {PERCENT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}}
    },
    {opcode: 'renderResolutionScale', blockType: Scratch.BlockType.REPORTER, text: 'render resolution scale'},
    {
        opcode: 'setMaxPixelRatio',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set maximum pixel ratio [RATIO]',
        arguments: {RATIO: {type: Scratch.ArgumentType.STRING, menu: 'pixelRatio', defaultValue: 'automatic'}}
    },
    {opcode: 'maxPixelRatio', blockType: Scratch.BlockType.REPORTER, text: 'maximum pixel ratio'},
    {
        opcode: 'setAntialiasing',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set antialiasing [MODE]',
        arguments: {MODE: {type: Scratch.ArgumentType.STRING, menu: 'antialias', defaultValue: 'off'}}
    },
    {opcode: 'antialiasing', blockType: Scratch.BlockType.REPORTER, text: 'antialiasing mode'},
    {
        opcode: 'setRenderDistance',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set render distance [DISTANCE]',
        arguments: {DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}
    },
    {opcode: 'renderDistance', blockType: Scratch.BlockType.REPORTER, text: 'render distance'},
    {
        opcode: 'setFrustumCulling',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set scene frustum culling [ENABLED]',
        arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}
    },
    {opcode: 'frustumCullingEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'scene frustum culling enabled?'},
    {
        opcode: 'setGlobalTextureQuality',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set texture quality [QUALITY]',
        arguments: {QUALITY: {type: Scratch.ArgumentType.STRING, menu: 'textureQuality', defaultValue: 'custom'}}
    },
    {opcode: 'globalTextureQuality', blockType: Scratch.BlockType.REPORTER, text: 'texture quality'},
    {
        opcode: 'setGlobalEnvironmentQuality',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set environment quality [QUALITY]',
        arguments: {QUALITY: {type: Scratch.ArgumentType.STRING, menu: 'environmentQuality', defaultValue: 'custom'}}
    },
    {opcode: 'globalEnvironmentQuality', blockType: Scratch.BlockType.REPORTER, text: 'environment quality'},
    {
        opcode: 'setMaximumLocalLights',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set maximum local lights per draw [COUNT]',
        arguments: {COUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 8}}
    },
    {opcode: 'maximumLocalLights', blockType: Scratch.BlockType.REPORTER, text: 'maximum local lights per draw'},
    {opcode: 'internalRenderWidth', blockType: Scratch.BlockType.REPORTER, text: 'internal render width'},
    {opcode: 'internalRenderHeight', blockType: Scratch.BlockType.REPORTER, text: 'internal render height'},
    {opcode: 'effectivePixelRatio', blockType: Scratch.BlockType.REPORTER, text: 'effective pixel ratio'},
    {opcode: 'internalRenderPixels', blockType: Scratch.BlockType.REPORTER, text: 'internal render pixel count'},
    {
        opcode: 'setAdaptiveResolution',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set adaptive resolution [ENABLED]',
        arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}}
    },
    {opcode: 'adaptiveResolutionEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'adaptive resolution enabled?'},
    {
        opcode: 'setAdaptiveTargetFps',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set adaptive resolution target to [FPS] FPS',
        arguments: {FPS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 60}}
    },
    {opcode: 'adaptiveTargetFps', blockType: Scratch.BlockType.REPORTER, text: 'adaptive resolution target FPS'},
    {
        opcode: 'setAdaptiveScaleRange',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set adaptive resolution range [MINIMUM] % to [MAXIMUM] %',
        arguments: {
            MINIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 50},
            MAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}
        }
    },
    '---',
    {opcode: 'setPostProcessing', blockType: Scratch.BlockType.COMMAND, text: 'set post processing [ENABLED]', arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'setBloom', blockType: Scratch.BlockType.COMMAND, text: 'set bloom [ENABLED]', arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'setBloomIntensity', blockType: Scratch.BlockType.COMMAND, text: 'set bloom intensity [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.8}}},
    {opcode: 'setBloomThreshold', blockType: Scratch.BlockType.COMMAND, text: 'set bloom threshold [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.8}}},
    {opcode: 'setBloomQuality', blockType: Scratch.BlockType.COMMAND, text: 'set bloom radius / quality [QUALITY]', arguments: {QUALITY: {type: Scratch.ArgumentType.STRING, menu: 'bloomQuality', defaultValue: 'medium'}}},
    {opcode: 'setPostBrightness', blockType: Scratch.BlockType.COMMAND, text: 'set post brightness [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setPostContrast', blockType: Scratch.BlockType.COMMAND, text: 'set post contrast [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setPostSaturation', blockType: Scratch.BlockType.COMMAND, text: 'set post saturation [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setVignetteIntensity', blockType: Scratch.BlockType.COMMAND, text: 'set vignette intensity [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.4}}},
    {opcode: 'setVignetteRadius', blockType: Scratch.BlockType.COMMAND, text: 'set vignette radius [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.75}}},
    {opcode: 'setVignetteSoftness', blockType: Scratch.BlockType.COMMAND, text: 'set vignette softness [VALUE]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.35}}},
    {opcode: 'setFxaa', blockType: Scratch.BlockType.COMMAND, text: 'set post FXAA [ENABLED]', arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}}},
    {opcode: 'resetPostProcessing', blockType: Scratch.BlockType.COMMAND, text: 'reset post-processing settings'},
    {opcode: 'postProcessingEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'post processing enabled?'},
    {opcode: 'bloomEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'bloom enabled?'},
    {opcode: 'bloomIntensity', blockType: Scratch.BlockType.REPORTER, text: 'bloom intensity'},
    {opcode: 'postProcessingPassCount', blockType: Scratch.BlockType.REPORTER, text: 'post-processing pass count'},
    {opcode: 'postFullscreenDraws', blockType: Scratch.BlockType.REPORTER, text: 'post fullscreen draws'},
    {opcode: 'renderTargetAllocations', blockType: Scratch.BlockType.REPORTER, text: 'render-target allocations this frame'},
    {opcode: 'renderTargetResizes', blockType: Scratch.BlockType.REPORTER, text: 'render-target resizes this frame'},
    {opcode: 'renderTargetBytes', blockType: Scratch.BlockType.REPORTER, text: 'estimated render-target GPU bytes'},
    {opcode: 'bloomPasses', blockType: Scratch.BlockType.REPORTER, text: 'bloom passes this frame'},
    {opcode: 'postShaderCompiles', blockType: Scratch.BlockType.REPORTER, text: 'post shader compiles'},
    {opcode: 'offscreenCameraRenders', blockType: Scratch.BlockType.REPORTER, text: 'offscreen camera renders this frame'},
    '---',
    {opcode: 'createRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'create render target [TARGET] width [WIDTH] height [HEIGHT]', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}, WIDTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 320}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 180}}},
    {opcode: 'deleteRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'delete render target [TARGET]', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'resizeRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'resize render target [TARGET] to [WIDTH] by [HEIGHT]', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}, WIDTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 320}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 180}}},
    {opcode: 'renderSceneToRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'render current scene to render target [TARGET]', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'renderCameraToRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'render scene from camera [CAMERA] to render target [TARGET]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'security'}, TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'clearRenderTarget', blockType: Scratch.BlockType.COMMAND, text: 'clear render target [TARGET]', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'renderTargetExists', blockType: Scratch.BlockType.BOOLEAN, text: 'render target [TARGET] exists?', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'renderTargetWidth', blockType: Scratch.BlockType.REPORTER, text: 'render target [TARGET] width', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    {opcode: 'renderTargetHeight', blockType: Scratch.BlockType.REPORTER, text: 'render target [TARGET] height', arguments: {TARGET: {type: Scratch.ArgumentType.STRING, defaultValue: 'monitor'}}},
    '---',
    {
        opcode: 'createScene',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create 3D scene [SCENE]',
        arguments: {SCENE: {type: Scratch.ArgumentType.STRING, defaultValue: 'world'}}
    },
    {
        opcode: 'setActiveScene',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set active 3D scene [SCENE]',
        arguments: {SCENE: {type: Scratch.ArgumentType.STRING, defaultValue: 'world'}}
    },
    '---',
    {
        opcode: 'createCamera',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create camera [NAME] field of view [FOV]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'},
            FOV: {type: Scratch.ArgumentType.NUMBER, defaultValue: 60}
        }
    },
    {opcode: 'setActiveCamera', blockType: Scratch.BlockType.COMMAND, text: 'set active camera [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}}},
    {
        opcode: 'createCube',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create cube [NAME]',
        arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}
    },
    {
        opcode: 'createSprite', blockType: Scratch.BlockType.COMMAND,
        text: 'create sprite [NAME] using texture [TEXTURE]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'}
        }
    },
    {
        opcode: 'createParticleEmitter', blockType: Scratch.BlockType.COMMAND,
        text: 'create particle emitter [NAME] texture [TEXTURE] maximum [MAXIMUM]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'},
            MAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}
        }
    },
    {
        opcode: 'createDecal', blockType: Scratch.BlockType.COMMAND,
        text: 'create surface decal [NAME] using texture [TEXTURE]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'decal'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'}
        }
    },
    {opcode: 'effectKind', blockType: Scratch.BlockType.REPORTER, text: 'effect kind of [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'effectExists', blockType: Scratch.BlockType.BOOLEAN, text: 'effect [NAME] exists?', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'setEffectVisible', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] visible [VISIBLE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, VISIBLE: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'effectVisible', blockType: Scratch.BlockType.BOOLEAN, text: 'effect [NAME] visible?', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'setSpriteBillboardMode', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] facing [MODE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, MODE: {type: Scratch.ArgumentType.STRING, menu: 'billboardMode', defaultValue: 'full'}}},
    {opcode: 'spriteBillboardMode', blockType: Scratch.BlockType.REPORTER, text: 'billboard mode of sprite [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'setEffectSize', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] width [WIDTH] height [HEIGHT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, WIDTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}}},
    {opcode: 'setSpritePivot', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] pivot [PIVOT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, PIVOT: {type: Scratch.ArgumentType.STRING, menu: 'spritePivot', defaultValue: 'center'}}},
    {opcode: 'setSpriteCustomPivot', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] custom pivot x [X] y [Y]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}}},
    {opcode: 'setEffectTint', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] tint [COLOR] opacity [OPACITY] brightness [BRIGHTNESS]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}, OPACITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}, BRIGHTNESS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}}},
    {opcode: 'setEffectAlphaMode', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] alpha [MODE] cutoff [CUTOFF]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, MODE: {type: Scratch.ArgumentType.STRING, menu: 'effectAlphaMode', defaultValue: 'blend'}, CUTOFF: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}}},
    {opcode: 'setEffectLighting', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] lighting [MODE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, MODE: {type: Scratch.ArgumentType.STRING, menu: 'effectLighting', defaultValue: 'unlit'}}},
    {opcode: 'setEffectDepth', blockType: Scratch.BlockType.COMMAND, text: 'set effect [NAME] depth test [TEST] write [WRITE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, TEST: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}, WRITE: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}}},
    {opcode: 'setSpriteSheet', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] sheet columns [COLUMNS] rows [ROWS]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, COLUMNS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 4}, ROWS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}}},
    {opcode: 'setSpriteFrame', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] frame [FRAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, FRAME: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'playSpriteFrames', blockType: Scratch.BlockType.COMMAND, text: 'play sprite [NAME] frames [FIRST] to [LAST] at [FPS] FPS looping [LOOPING]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, FIRST: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, LAST: {type: Scratch.ArgumentType.NUMBER, defaultValue: 8}, FPS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 8}, LOOPING: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'pauseSpriteFrames', blockType: Scratch.BlockType.COMMAND, text: 'pause sprite animation [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'resumeSpriteFrames', blockType: Scratch.BlockType.COMMAND, text: 'resume sprite animation [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    {opcode: 'stopSpriteFrames', blockType: Scratch.BlockType.COMMAND, text: 'stop sprite animation [NAME] reset [RESET]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, RESET: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}}},
    {opcode: 'setSpriteDirectionalViews', blockType: Scratch.BlockType.COMMAND, text: 'set sprite [NAME] directional views [COUNT] facing [ANGLE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, COUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 8}, ANGLE: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}}},
    {opcode: 'setSpriteDirectionalFrame', blockType: Scratch.BlockType.COMMAND, text: 'map sprite [NAME] direction [DIRECTION] to frame [FRAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}, DIRECTION: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, FRAME: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'spriteCurrentFrame', blockType: Scratch.BlockType.REPORTER, text: 'current frame of sprite [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sprite'}}},
    '---',
    {opcode: 'setParticleEmissionRate', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] rate [RATE] per second', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, RATE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}}},
    {opcode: 'setParticleMaximum', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] maximum particles [MAXIMUM]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, MAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}}},
    {opcode: 'setParticleSpawnShape', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] shape [SHAPE] extents x [X] y [Y] z [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, SHAPE: {type: Scratch.ArgumentType.STRING, menu: 'particleSpawnShape', defaultValue: 'point'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setParticleVelocity', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] velocity x [X] y [Y] z [Z] spread [SPREAD]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 3}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, SPREAD: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setParticleAcceleration', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] acceleration x [X] y [Y] z [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: -4}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setParticleLifetime', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] lifetime [MINIMUM] to [MAXIMUM] seconds', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, MINIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, MAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}}},
    {opcode: 'setParticleSizeOverLife', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] size [START] to [END]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, START: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}, END: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setParticleAlphaOverLife', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] alpha [START] to [END] %', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, START: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}, END: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setParticleColorOverLife', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] color [START] to [END]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, START: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}, END: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ff8000'}}},
    {opcode: 'setParticleRotation', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] rotation [MINIMUM] to [MAXIMUM] angular speed [ANGULARMINIMUM] to [ANGULARMAXIMUM]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, MINIMUM: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}, MAXIMUM: {type: Scratch.ArgumentType.ANGLE, defaultValue: 360}, ANGULARMINIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: -90}, ANGULARMAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 90}}},
    {opcode: 'setParticleFrameRate', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] sprite-sheet FPS [FPS]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, FPS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setParticleSeed', blockType: Scratch.BlockType.COMMAND, text: 'set emitter [NAME] random seed [SEED]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}, SEED: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'startParticleEmitter', blockType: Scratch.BlockType.COMMAND, text: 'start emitter [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'stopParticleEmitter', blockType: Scratch.BlockType.COMMAND, text: 'stop emitter [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'pauseParticleEmitter', blockType: Scratch.BlockType.COMMAND, text: 'pause emitter [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'resumeParticleEmitter', blockType: Scratch.BlockType.COMMAND, text: 'resume emitter [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'clearParticleEmitter', blockType: Scratch.BlockType.COMMAND, text: 'clear emitter [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'burstParticles', blockType: Scratch.BlockType.COMMAND, text: 'burst [COUNT] particles from [NAME]', arguments: {COUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}, NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'activeParticleCount', blockType: Scratch.BlockType.REPORTER, text: 'active particles in [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'particleEmitterEmitting', blockType: Scratch.BlockType.BOOLEAN, text: 'emitter [NAME] emitting?', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    {opcode: 'particleEmitterPaused', blockType: Scratch.BlockType.BOOLEAN, text: 'emitter [NAME] paused?', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'particles'}}},
    '---',
    {opcode: 'setDecalNormal', blockType: Scratch.BlockType.COMMAND, text: 'set decal [NAME] normal x [X] y [Y] z [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'decal'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setDecalOffset', blockType: Scratch.BlockType.COMMAND, text: 'set decal [NAME] surface offset [OFFSET]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'decal'}, OFFSET: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.01}}},
    {opcode: 'setDecalLifetime', blockType: Scratch.BlockType.COMMAND, text: 'set decal [NAME] lifetime [SECONDS] seconds (0 persistent)', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'decal'}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    '---',
    {
        opcode: 'loadModelFromSource',
        blockType: Scratch.BlockType.COMMAND,
        text: 'load glTF model [MODEL] from [SOURCE]',
        arguments: {
            MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'},
            SOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'https://example.com/model.glb'}
        }
    },
    {
        opcode: 'importModelFile',
        blockType: Scratch.BlockType.COMMAND,
        text: 'import 3D model file as [MODEL]',
        arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'model'}}
    },
    {
        opcode: 'loadModelFromFile',
        blockType: Scratch.BlockType.COMMAND,
        text: 'load glTF model [MODEL] from local file',
        arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}
    },
    {
        opcode: 'deleteModelAsset',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete model asset [MODEL]',
        arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}
    },
    {
        opcode: 'createModelInstance',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create model instance [NAME] from [MODEL]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'},
            MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}
        }
    },
    {
        opcode: 'createModelInstances',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create [COUNT] instances of model [MODEL] named [PREFIX]',
        arguments: {
            COUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10},
            MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'},
            PREFIX: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}
        }
    },
    {
        opcode: 'setModelNodePosition',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set node [NODE] of model instance [NAME] position x [X] y [Y] z [Z]',
        arguments: {
            NODE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'playAnimation',
        blockType: Scratch.BlockType.COMMAND,
        text: 'play animation [CLIP] on model instance [INSTANCE] looping [LOOPING]',
        arguments: {
            CLIP: {type: Scratch.ArgumentType.STRING, defaultValue: '1'},
            INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'},
            LOOPING: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {opcode: 'pauseAnimation', blockType: Scratch.BlockType.COMMAND, text: 'pause animation on [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'resumeAnimation', blockType: Scratch.BlockType.COMMAND, text: 'resume animation on [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'stopAnimation', blockType: Scratch.BlockType.COMMAND, text: 'stop animation on [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'resetModelPose', blockType: Scratch.BlockType.COMMAND, text: 'reset pose of model instance [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'setAnimationTime', blockType: Scratch.BlockType.COMMAND, text: 'set animation time of [INSTANCE] to [SECONDS] seconds', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'setAnimationSpeed', blockType: Scratch.BlockType.COMMAND, text: 'set animation speed of [INSTANCE] to [SPEED]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, SPEED: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setAnimationLooping', blockType: Scratch.BlockType.COMMAND, text: 'set animation looping of [INSTANCE] to [LOOPING]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, LOOPING: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'crossfadeAnimation', blockType: Scratch.BlockType.COMMAND, text: 'crossfade [INSTANCE] to animation [CLIP] over [SECONDS] seconds', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, CLIP: {type: Scratch.ArgumentType.STRING, defaultValue: '2'}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.25}}},
    {opcode: 'animationCount', blockType: Scratch.BlockType.REPORTER, text: 'animation count of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'animationName', blockType: Scratch.BlockType.REPORTER, text: 'animation name [INDEX] of model [MODEL]', arguments: {INDEX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'animationDuration', blockType: Scratch.BlockType.REPORTER, text: 'animation duration [CLIP] of model [MODEL]', arguments: {CLIP: {type: Scratch.ArgumentType.STRING, defaultValue: '1'}, MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'currentAnimation', blockType: Scratch.BlockType.REPORTER, text: 'current animation of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationTime', blockType: Scratch.BlockType.REPORTER, text: 'animation time of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationProgress', blockType: Scratch.BlockType.REPORTER, text: 'animation progress of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationPlaying', blockType: Scratch.BlockType.BOOLEAN, text: 'animation playing on [INSTANCE]?', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationPaused', blockType: Scratch.BlockType.BOOLEAN, text: 'animation paused on [INSTANCE]?', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationFinished', blockType: Scratch.BlockType.BOOLEAN, text: 'animation finished on [INSTANCE]?', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'animationSpeed', blockType: Scratch.BlockType.REPORTER, text: 'animation speed of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {
        opcode: 'setResourceFrustumCulling',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set frustum culling of [RESOURCE] [ENABLED]',
        arguments: {
            RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {opcode: 'resourceFrustumCullingEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'frustum culling of [RESOURCE] enabled?', arguments: {RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    '---',
    {opcode: 'createLodGroup', blockType: Scratch.BlockType.COMMAND, text: 'create LOD group [GROUP]', arguments: {GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'}}},
    {opcode: 'deleteLodGroup', blockType: Scratch.BlockType.COMMAND, text: 'delete LOD group [GROUP]', arguments: {GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'}}},
    {
        opcode: 'addLodLevel',
        blockType: Scratch.BlockType.COMMAND,
        text: 'add model [MODEL] to LOD group [GROUP] at distance [DISTANCE]',
        arguments: {
            MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot low'},
            GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'},
            DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 30}
        }
    },
    {opcode: 'assignModelLodGroup', blockType: Scratch.BlockType.COMMAND, text: 'set LOD group of model instance [INSTANCE] to [GROUP]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'}}},
    {opcode: 'clearModelLodGroup', blockType: Scratch.BlockType.COMMAND, text: 'clear LOD group of model instance [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'setModelLodEnabled', blockType: Scratch.BlockType.COMMAND, text: 'set LOD of model instance [INSTANCE] [ENABLED]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}},
    {opcode: 'setModelLodHysteresis', blockType: Scratch.BlockType.COMMAND, text: 'set LOD hysteresis of [INSTANCE] to [DISTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'forceModelLodLevel', blockType: Scratch.BlockType.COMMAND, text: 'force LOD level of [INSTANCE] to [LEVEL]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}, LEVEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'auto'}}},
    {opcode: 'currentModelLodLevel', blockType: Scratch.BlockType.REPORTER, text: 'current LOD level of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'modelLodGroup', blockType: Scratch.BlockType.REPORTER, text: 'LOD group of [INSTANCE]', arguments: {INSTANCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot1'}}},
    {opcode: 'lodGroupLevelCount', blockType: Scratch.BlockType.REPORTER, text: 'level count of LOD group [GROUP]', arguments: {GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'}}},
    {opcode: 'lodGroupExists', blockType: Scratch.BlockType.BOOLEAN, text: 'LOD group [GROUP] exists?', arguments: {GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot lod'}}},
    {opcode: 'modelExists', blockType: Scratch.BlockType.BOOLEAN, text: 'model [MODEL] exists?', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelState', blockType: Scratch.BlockType.REPORTER, text: 'state of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelError', blockType: Scratch.BlockType.REPORTER, text: 'error of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelNodeCount', blockType: Scratch.BlockType.REPORTER, text: 'node count of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelPrimitiveCount', blockType: Scratch.BlockType.REPORTER, text: 'primitive count of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelTriangleCount', blockType: Scratch.BlockType.REPORTER, text: 'triangle count of model [MODEL]', arguments: {MODEL: {type: Scratch.ArgumentType.STRING, defaultValue: 'robot'}}},
    {opcode: 'modelAssetCount', blockType: Scratch.BlockType.REPORTER, text: 'loaded model asset count'},
    {opcode: 'loadedGeometryCount', blockType: Scratch.BlockType.REPORTER, text: 'loaded model geometry count'},
    {opcode: 'geometryGpuBytes', blockType: Scratch.BlockType.REPORTER, text: 'geometry GPU bytes'},
    {opcode: 'geometryUploads', blockType: Scratch.BlockType.REPORTER, text: 'geometry GPU uploads'},
    {opcode: 'spriteCount', blockType: Scratch.BlockType.REPORTER, text: 'sprite count'},
    {opcode: 'visibleSpriteCount', blockType: Scratch.BlockType.REPORTER, text: 'visible sprite count'},
    {opcode: 'spriteDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'sprite draw calls'},
    {opcode: 'spriteInstanceUploadBytes', blockType: Scratch.BlockType.REPORTER, text: 'sprite/effect instance upload bytes'},
    {opcode: 'directionalFrameChanges', blockType: Scratch.BlockType.REPORTER, text: 'directional sprite frame changes'},
    {opcode: 'activeParticleEmitters', blockType: Scratch.BlockType.REPORTER, text: 'active particle emitters'},
    {opcode: 'totalActiveParticles', blockType: Scratch.BlockType.REPORTER, text: 'total active particles'},
    {opcode: 'particlesSpawned', blockType: Scratch.BlockType.REPORTER, text: 'particles spawned this tick'},
    {opcode: 'particlesExpired', blockType: Scratch.BlockType.REPORTER, text: 'particles expired this tick'},
    {opcode: 'particleSimulationTime', blockType: Scratch.BlockType.REPORTER, text: 'particle simulation time'},
    {opcode: 'visibleParticleEmitters', blockType: Scratch.BlockType.REPORTER, text: 'visible particle emitters'},
    {opcode: 'culledParticleEmitters', blockType: Scratch.BlockType.REPORTER, text: 'culled particle emitters'},
    {opcode: 'particleInstanceUploadBytes', blockType: Scratch.BlockType.REPORTER, text: 'particle instance upload bytes'},
    {opcode: 'particleDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'particle draw calls'},
    {opcode: 'decalCount', blockType: Scratch.BlockType.REPORTER, text: 'decal count'},
    {opcode: 'visibleDecalCount', blockType: Scratch.BlockType.REPORTER, text: 'visible decal count'},
    {opcode: 'decalDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'decal draw calls'},
    {opcode: 'activeAnimationPlayers', blockType: Scratch.BlockType.REPORTER, text: 'active animation players'},
    {opcode: 'sampledAnimationChannels', blockType: Scratch.BlockType.REPORTER, text: 'sampled animation channels'},
    {opcode: 'animationSamplingTime', blockType: Scratch.BlockType.REPORTER, text: 'animation sampling time'},
    {opcode: 'jointPaletteUploads', blockType: Scratch.BlockType.REPORTER, text: 'joint palette uploads'},
    {opcode: 'jointPaletteUploadBytes', blockType: Scratch.BlockType.REPORTER, text: 'joint palette upload bytes'},
    {opcode: 'skinnedDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'skinned draw calls'},
    {opcode: 'skinnedShadowDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'skinned shadow draw calls'},
    {opcode: 'totalRenderables', blockType: Scratch.BlockType.REPORTER, text: 'total renderables'},
    {opcode: 'visibilityCandidates', blockType: Scratch.BlockType.REPORTER, text: 'visibility candidates'},
    {opcode: 'spatialCandidates', blockType: Scratch.BlockType.REPORTER, text: 'spatial candidates'},
    {opcode: 'frustumTests', blockType: Scratch.BlockType.REPORTER, text: 'frustum tests'},
    {opcode: 'frustumRejected', blockType: Scratch.BlockType.REPORTER, text: 'frustum rejected'},
    {opcode: 'renderDistanceRejected', blockType: Scratch.BlockType.REPORTER, text: 'render distance rejected'},
    {opcode: 'visibleRenderables', blockType: Scratch.BlockType.REPORTER, text: 'visible renderables'},
    {opcode: 'visibleInstances', blockType: Scratch.BlockType.REPORTER, text: 'visible instances'},
    {opcode: 'culledInstances', blockType: Scratch.BlockType.REPORTER, text: 'culled instances'},
    {opcode: 'visibilityCpuTime', blockType: Scratch.BlockType.REPORTER, text: 'visibility CPU time'},
    {opcode: 'spatialQueryCpuTime', blockType: Scratch.BlockType.REPORTER, text: 'spatial query CPU time'},
    {opcode: 'spatialIndexEntries', blockType: Scratch.BlockType.REPORTER, text: 'spatial index entries'},
    {opcode: 'spatialIndexUpdates', blockType: Scratch.BlockType.REPORTER, text: 'spatial index updates'},
    {opcode: 'spatialIndexRebuilds', blockType: Scratch.BlockType.REPORTER, text: 'spatial index rebuilds'},
    {opcode: 'dirtyBounds', blockType: Scratch.BlockType.REPORTER, text: 'dirty bounds updated'},
    {opcode: 'animatedBounds', blockType: Scratch.BlockType.REPORTER, text: 'animated bounds updated'},
    {opcode: 'visibleInstanceUploadBytes', blockType: Scratch.BlockType.REPORTER, text: 'visible instance upload bytes'},
    {opcode: 'lodEvaluations', blockType: Scratch.BlockType.REPORTER, text: 'LOD evaluations'},
    {opcode: 'lodSwitches', blockType: Scratch.BlockType.REPORTER, text: 'LOD switches'},
    {opcode: 'lodLevelInstanceCount', blockType: Scratch.BlockType.REPORTER, text: 'instances using LOD level [LEVEL]', arguments: {LEVEL: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'shadowVisibilityCandidates', blockType: Scratch.BlockType.REPORTER, text: 'shadow visibility candidates'},
    {opcode: 'shadowFrustumRejected', blockType: Scratch.BlockType.REPORTER, text: 'shadow frustum rejected'},
    {opcode: 'shadowVisibleCasters', blockType: Scratch.BlockType.REPORTER, text: 'visible shadow casters'},
    {
        opcode: 'createDirectionalLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create directional light [NAME] intensity [INTENSITY]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setDirectionalLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set directional light [LIGHT] color [COLOR] intensity [INTENSITY]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setAmbientLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set ambient light color [COLOR] intensity [INTENSITY]',
        arguments: {
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.03}
        }
    },
    '---',
    {
        opcode: 'createPointLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create point light [NAME]',
        arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}
    },
    {
        opcode: 'createSpotLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create spot light [NAME]',
        arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'spot'}}
    },
    {
        opcode: 'deleteLocalLight',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete local light [LIGHT]',
        arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}
    },
    {
        opcode: 'setLocalLightPosition',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] position x [X] y [Y] z [Z]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 3},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'setLocalLightColor',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] color [COLOR]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ff8844'}
        }
    },
    {
        opcode: 'setLocalLightIntensity',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] intensity [INTENSITY]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 20}
        }
    },
    {
        opcode: 'setLocalLightRange',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] range [RANGE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'},
            RANGE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}
        }
    },
    {
        opcode: 'setLocalLightEnabled',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] enabled [ENABLED]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setSpotLightDirection',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set spot light [LIGHT] direction x [X] y [Y] z [Z]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'spot'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: -1},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'pointSpotLightToward',
        blockType: Scratch.BlockType.COMMAND,
        text: 'point spot light [LIGHT] toward x [X] y [Y] z [Z]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'spot'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'setSpotLightInnerAngle',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set spot light [LIGHT] inner angle [DEGREES]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'spot'},
            DEGREES: {type: Scratch.ArgumentType.ANGLE, defaultValue: 20}
        }
    },
    {
        opcode: 'setSpotLightOuterAngle',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set spot light [LIGHT] outer angle [DEGREES]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'spot'},
            DEGREES: {type: Scratch.ArgumentType.ANGLE, defaultValue: 30}
        }
    },
    {opcode: 'localLightExists', blockType: Scratch.BlockType.BOOLEAN, text: 'local light [LIGHT] exists?', arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}},
    {opcode: 'localLightType', blockType: Scratch.BlockType.REPORTER, text: 'type of local light [LIGHT]', arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}},
    {
        opcode: 'localLightPosition',
        blockType: Scratch.BlockType.REPORTER,
        text: '[AXIS] position of local light [LIGHT]',
        arguments: {
            AXIS: {type: Scratch.ArgumentType.STRING, menu: 'localLightAxis', defaultValue: 'x'},
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}
        }
    },
    {opcode: 'localLightIntensity', blockType: Scratch.BlockType.REPORTER, text: 'intensity of local light [LIGHT]', arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}},
    {opcode: 'localLightRange', blockType: Scratch.BlockType.REPORTER, text: 'range of local light [LIGHT]', arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}},
    {opcode: 'localLightEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'local light [LIGHT] enabled?', arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'lamp'}}},
    {opcode: 'activeLocalLightCount', blockType: Scratch.BlockType.REPORTER, text: 'active local light count'},
    {opcode: 'selectedLocalLightCount', blockType: Scratch.BlockType.REPORTER, text: 'selected local lights per draw'},
    {opcode: 'localLightListRebuilds', blockType: Scratch.BlockType.REPORTER, text: 'local light list rebuilds'},
    {opcode: 'localLightGpuUploads', blockType: Scratch.BlockType.REPORTER, text: 'local light GPU uploads'},
    {opcode: 'localLightDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'local-light-capable draw calls'},
    {opcode: 'localLightSelectionTime', blockType: Scratch.BlockType.REPORTER, text: 'local light selection time'},
    {
        opcode: 'createCubeInstances',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create instance group [GROUP] with [COUNT] cubes spacing [SPACING]',
        arguments: {
            GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'cubes'},
            COUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000},
            SPACING: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1.5}
        }
    },
    {
        opcode: 'deleteResource',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete 3D resource [NAME]',
        arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}
    },
    '---',
    {
        opcode: 'setPosition',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [NAME] position x [X] y [Y] z [Z]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'setRotation',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [NAME] rotation x [X] y [Y] z [Z]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            X: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0},
            Z: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}
        }
    },
    {
        opcode: 'setScale',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [NAME] scale x [X] y [Y] z [Z]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setMaterialColor',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [NAME] material color [COLOR]',
        arguments: {
            NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#3388ee'}
        }
    },
    {
        opcode: 'setInstancePosition',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set instance [INDEX] of [GROUP] position x [X] y [Y] z [Z]',
        arguments: {
            INDEX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1},
            GROUP: {type: Scratch.ArgumentType.STRING, defaultValue: 'cubes'},
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    '---',
    {
        opcode: 'setShadowsEnabled',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set shadows [ENABLED]',
        arguments: {ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}}
    },
    {
        opcode: 'setShadowQuality',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set shadow quality [QUALITY]',
        arguments: {QUALITY: {type: Scratch.ArgumentType.STRING, menu: 'shadowQuality', defaultValue: 'medium'}}
    },
    {
        opcode: 'setLightCastsShadows',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] cast shadows [ENABLED]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setResourceCastsShadows',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [RESOURCE] cast shadows [ENABLED]',
        arguments: {
            RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setResourceReceivesShadows',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [RESOURCE] receive shadows [ENABLED]',
        arguments: {
            RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setShadowMapSize',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow map size [SIZE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            SIZE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1024}
        }
    },
    {
        opcode: 'setShadowBias',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow bias [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.0015}
        }
    },
    {
        opcode: 'setShadowNormalBias',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow normal bias [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.02}
        }
    },
    {
        opcode: 'setShadowFilter',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow filtering [FILTER]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            FILTER: {type: Scratch.ArgumentType.STRING, menu: 'shadowFilter', defaultValue: 'pcf-4'}
        }
    },
    {
        opcode: 'setShadowDistance',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow distance [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 40}
        }
    },
    {
        opcode: 'setShadowCameraNear',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow camera near [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setShadowCameraFar',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow camera far [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}
        }
    },
    {
        opcode: 'setShadowBounds',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set light [LIGHT] shadow bounds [VALUE]',
        arguments: {
            LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 25}
        }
    },
    {opcode: 'shadowsEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'shadows enabled?'},
    {opcode: 'shadowQuality', blockType: Scratch.BlockType.REPORTER, text: 'shadow quality'},
    {
        opcode: 'shadowMapSize',
        blockType: Scratch.BlockType.REPORTER,
        text: 'shadow map size of [LIGHT]',
        arguments: {LIGHT: {type: Scratch.ArgumentType.STRING, defaultValue: 'sun'}}
    },
    {opcode: 'shadowRenderTime', blockType: Scratch.BlockType.REPORTER, text: 'shadow rendering time'},
    {opcode: 'shadowDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'shadow draw calls'},
    {opcode: 'shadowTriangles', blockType: Scratch.BlockType.REPORTER, text: 'shadow triangles'},
    {opcode: 'shadowCasters', blockType: Scratch.BlockType.REPORTER, text: 'shadow casters'},
    {opcode: 'shadowMapsUpdated', blockType: Scratch.BlockType.REPORTER, text: 'shadow maps updated this frame'},
    '---',
    {
        opcode: 'createMaterial',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create material [MATERIAL] type [TYPE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            TYPE: {type: Scratch.ArgumentType.STRING, menu: 'materialType', defaultValue: 'basic-lit'}
        }
    },
    {
        opcode: 'createPbrMaterial',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create PBR material [MATERIAL]',
        arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'}}
    },
    {
        opcode: 'cloneMaterial',
        blockType: Scratch.BlockType.COMMAND,
        text: 'clone material [SOURCE] as [MATERIAL]',
        arguments: {
            SOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface copy'}
        }
    },
    {
        opcode: 'deleteMaterial',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete material [MATERIAL]',
        arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}}
    },
    {
        opcode: 'setResourceMaterial',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [RESOURCE] material [MATERIAL]',
        arguments: {
            RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}
        }
    },
    {
        opcode: 'setMaterialBaseColor',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] base color [COLOR]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}
        }
    },
    {
        opcode: 'setMaterialOpacity',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] opacity [OPACITY] %',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            OPACITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 100}
        }
    },
    {
        opcode: 'setMaterialTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] texture [TEXTURE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}
        }
    },
    {
        opcode: 'setPbrMetallic',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set PBR material [MATERIAL] metallic [VALUE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setPbrRoughness',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set PBR material [MATERIAL] roughness [VALUE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}
        }
    },
    {
        opcode: 'setPbrMapTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set PBR material [MATERIAL] [MAP] texture [TEXTURE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'},
            MAP: {type: Scratch.ArgumentType.STRING, menu: 'pbrMap', defaultValue: 'normal'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface map'}
        }
    },
    {
        opcode: 'removePbrMapTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'remove [MAP] texture from PBR material [MATERIAL]',
        arguments: {
            MAP: {type: Scratch.ArgumentType.STRING, menu: 'pbrMap', defaultValue: 'normal'},
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'}
        }
    },
    {
        opcode: 'setPbrNormalStrength',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set PBR material [MATERIAL] normal strength [VALUE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setPbrAoStrength',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set PBR material [MATERIAL] AO strength [VALUE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'},
            VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setMaterialEmissive',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] emissive color [COLOR] intensity [INTENSITY]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#000000'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
        }
    },
    {
        opcode: 'setMaterialDoubleSided',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] double sided [ENABLED]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}
        }
    },
    {
        opcode: 'setMaterialDepthTest',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] depth test [ENABLED]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setMaterialDepthWrite',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] depth write [ENABLED]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
        }
    },
    {
        opcode: 'setMaterialAlphaMode',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] alpha mode [MODE]',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            MODE: {type: Scratch.ArgumentType.STRING, menu: 'alphaMode', defaultValue: 'opaque'}
        }
    },
    {
        opcode: 'setMaterialAlphaCutoff',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set material [MATERIAL] alpha cutoff [CUTOFF] %',
        arguments: {
            MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'},
            CUTOFF: {type: Scratch.ArgumentType.NUMBER, defaultValue: 50}
        }
    },
    {opcode: 'materialExists', blockType: Scratch.BlockType.BOOLEAN, text: 'material [MATERIAL] exists?', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}}},
    {opcode: 'materialOfResource', blockType: Scratch.BlockType.REPORTER, text: 'material of [RESOURCE]', arguments: {RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}},
    {opcode: 'materialType', blockType: Scratch.BlockType.REPORTER, text: 'type of material [MATERIAL]', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}}},
    {opcode: 'materialUsers', blockType: Scratch.BlockType.REPORTER, text: 'material [MATERIAL] users', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}}},
    {opcode: 'materialCount', blockType: Scratch.BlockType.REPORTER, text: 'material count'},
    {opcode: 'materialPrograms', blockType: Scratch.BlockType.REPORTER, text: 'active material shader programs'},
    {opcode: 'materialShaderCompiles', blockType: Scratch.BlockType.REPORTER, text: 'material shader compiles'},
    {opcode: 'materialProgramSwitches', blockType: Scratch.BlockType.REPORTER, text: 'material program switches'},
    {opcode: 'materialSwitches', blockType: Scratch.BlockType.REPORTER, text: 'material switches'},
    {opcode: 'textureSwitches', blockType: Scratch.BlockType.REPORTER, text: 'texture switches'},
    {opcode: 'pbrMetallic', blockType: Scratch.BlockType.REPORTER, text: 'metallic of PBR material [MATERIAL]', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'}}},
    {opcode: 'pbrRoughness', blockType: Scratch.BlockType.REPORTER, text: 'roughness of PBR material [MATERIAL]', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'}}},
    {opcode: 'warmMaterialShader', blockType: Scratch.BlockType.COMMAND, text: 'prepare shader for material [MATERIAL]', arguments: {MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'metal'}}},
    {opcode: 'pbrPrograms', blockType: Scratch.BlockType.REPORTER, text: 'active PBR shader programs'},
    {opcode: 'pbrDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'PBR draw calls'},
    '---',
    {
        opcode: 'createSolidEnvironment',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create environment [ENVIRONMENT] with solid color [COLOR]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'studio'},
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#7aa5d8'}
        }
    },
    {
        opcode: 'createEnvironmentFromTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create environment [ENVIRONMENT] from equirectangular texture [TEXTURE]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'environmentMap'}
        }
    },
    {
        opcode: 'setEnvironmentTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set environment [ENVIRONMENT] source texture [TEXTURE]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'environmentMap'}
        }
    },
    {
        opcode: 'deleteEnvironment',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete environment [ENVIRONMENT]',
        arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}
    },
    {
        opcode: 'setSceneEnvironment',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set scene environment [ENVIRONMENT]',
        arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}
    },
    {opcode: 'clearSceneEnvironment', blockType: Scratch.BlockType.COMMAND, text: 'clear scene environment'},
    {
        opcode: 'setEnvironmentIntensity',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set environment [ENVIRONMENT] intensity [INTENSITY]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'},
            INTENSITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}
        }
    },
    {
        opcode: 'setEnvironmentRotation',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set environment [ENVIRONMENT] rotation [ROTATION]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'},
            ROTATION: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}
        }
    },
    {
        opcode: 'setEnvironmentBackground',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set environment [ENVIRONMENT] background [ENABLED]',
        arguments: {
            ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'},
            ENABLED: {type: Scratch.ArgumentType.STRING, menu: 'onOff', defaultValue: 'off'}
        }
    },
    {opcode: 'environmentExists', blockType: Scratch.BlockType.BOOLEAN, text: 'environment [ENVIRONMENT] exists?', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'environmentState', blockType: Scratch.BlockType.REPORTER, text: 'environment [ENVIRONMENT] state', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'activeEnvironment', blockType: Scratch.BlockType.REPORTER, text: 'active scene environment'},
    {opcode: 'environmentUsers', blockType: Scratch.BlockType.REPORTER, text: 'environment [ENVIRONMENT] users', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'environmentIntensity', blockType: Scratch.BlockType.REPORTER, text: 'environment [ENVIRONMENT] intensity', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'environmentRotation', blockType: Scratch.BlockType.REPORTER, text: 'environment [ENVIRONMENT] rotation', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'environmentBackgroundEnabled', blockType: Scratch.BlockType.BOOLEAN, text: 'environment [ENVIRONMENT] background enabled?', arguments: {ENVIRONMENT: {type: Scratch.ArgumentType.STRING, defaultValue: 'outdoors'}}},
    {opcode: 'environmentPreprocessTime', blockType: Scratch.BlockType.REPORTER, text: 'environment preprocessing time'},
    {opcode: 'environmentPreprocesses', blockType: Scratch.BlockType.REPORTER, text: 'environments preprocessed this frame'},
    {opcode: 'environmentResources', blockType: Scratch.BlockType.REPORTER, text: 'GPU environment resource sets'},
    {opcode: 'environmentIblDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'environment-lit PBR draw calls'},
    {opcode: 'environmentBackgroundDrawCalls', blockType: Scratch.BlockType.REPORTER, text: 'environment background draw calls'},
    '---',
    {
        opcode: 'createGeneratedTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'create texture [TEXTURE] preset [PRESET] color [PRIMARY] second [SECONDARY] size [SIZE]',
        arguments: {
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'},
            PRESET: {type: Scratch.ArgumentType.STRING, menu: 'texturePreset', defaultValue: 'checker'},
            PRIMARY: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'},
            SECONDARY: {type: Scratch.ArgumentType.COLOR, defaultValue: '#202020'},
            SIZE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 64}
        }
    },
    {
        opcode: 'loadTextureFromSource',
        blockType: Scratch.BlockType.COMMAND,
        text: 'load texture [TEXTURE] from URL or data URI [SOURCE]',
        arguments: {
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'},
            SOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'data:image/png;base64,...'}
        }
    },
    {
        opcode: 'loadTextureFromCostume',
        blockType: Scratch.BlockType.COMMAND,
        text: 'load texture [TEXTURE] from costume [COSTUME]',
        arguments: {
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'costumeTexture'},
            COSTUME: {type: Scratch.ArgumentType.STRING, defaultValue: 'costume1'}
        }
    },
    {
        opcode: 'loadTextureFromFile',
        blockType: Scratch.BlockType.COMMAND,
        text: 'load texture [TEXTURE] from selected image file',
        arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'localTexture'}}
    },
    {
        opcode: 'deleteTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'delete texture [TEXTURE]',
        arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'}}
    },
    {
        opcode: 'setResourceTexture',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set [RESOURCE] texture [TEXTURE]',
        arguments: {
            RESOURCE: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'},
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}
        }
    },
    {
        opcode: 'setTextureOption',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set texture [TEXTURE] option [OPTION] to [VALUE]',
        arguments: {
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'},
            OPTION: {type: Scratch.ArgumentType.STRING, menu: 'textureOption', defaultValue: 'min-filter'},
            VALUE: {type: Scratch.ArgumentType.STRING, defaultValue: 'linear-mipmap-linear'}
        }
    },
    {
        opcode: 'setTextureUV',
        blockType: Scratch.BlockType.COMMAND,
        text: 'set texture [TEXTURE] UV offset [OFFSET_X] [OFFSET_Y] repeat [REPEAT_X] [REPEAT_Y] rotation [ROTATION]',
        arguments: {
            TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'},
            OFFSET_X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            OFFSET_Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            REPEAT_X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1},
            REPEAT_Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1},
            ROTATION: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}
        }
    },
    {opcode: 'textureExists', blockType: Scratch.BlockType.BOOLEAN, text: 'texture [TEXTURE] exists?', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}}},
    {opcode: 'textureState', blockType: Scratch.BlockType.REPORTER, text: 'texture [TEXTURE] state', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}}},
    {opcode: 'textureError', blockType: Scratch.BlockType.REPORTER, text: 'texture [TEXTURE] error', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'image'}}},
    {opcode: 'textureWidth', blockType: Scratch.BlockType.REPORTER, text: 'texture [TEXTURE] width', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}}},
    {opcode: 'textureHeight', blockType: Scratch.BlockType.REPORTER, text: 'texture [TEXTURE] height', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}}},
    {opcode: 'textureUsers', blockType: Scratch.BlockType.REPORTER, text: 'texture [TEXTURE] users', arguments: {TEXTURE: {type: Scratch.ArgumentType.STRING, defaultValue: 'checker'}}},
    '---',
    {opcode: 'setRaycastBackface', blockType: Scratch.BlockType.COMMAND, text: 'set raycast backfaces [POLICY]', arguments: {POLICY: {type: Scratch.ArgumentType.STRING, menu: 'raycastBackface', defaultValue: 'both'}}},
    {
        opcode: 'castWorldRay', blockType: Scratch.BlockType.COMMAND,
        text: 'cast ray from [X] [Y] [Z] direction [DX] [DY] [DZ] distance [DISTANCE] filter [FILTER]',
        arguments: {
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            DX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, DY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, DZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: -1},
            DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}, FILTER: {type: Scratch.ArgumentType.STRING, defaultValue: 'all'}
        }
    },
    {
        opcode: 'castStageRay', blockType: Scratch.BlockType.COMMAND,
        text: 'pick from camera [CAMERA] at stage x [X] y [Y] distance [DISTANCE] filter [FILTER]',
        arguments: {
            CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
            DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}, FILTER: {type: Scratch.ArgumentType.STRING, defaultValue: 'all'}
        }
    },
    {
        opcode: 'castCameraForwardRay', blockType: Scratch.BlockType.COMMAND,
        text: 'cast camera [CAMERA] forward ray distance [DISTANCE] filter [FILTER]',
        arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}, FILTER: {type: Scratch.ArgumentType.STRING, defaultValue: 'all'}}
    },
    {opcode: 'rayHit', blockType: Scratch.BlockType.BOOLEAN, text: 'ray hit?'},
    {opcode: 'rayHitValue', blockType: Scratch.BlockType.REPORTER, text: 'ray hit [FIELD]', arguments: {FIELD: {type: Scratch.ArgumentType.STRING, menu: 'raycastResultField', defaultValue: 'object'}}},
    {opcode: 'raycastCount', blockType: Scratch.BlockType.REPORTER, text: 'raycasts this update'},
    {opcode: 'raycastBroadPhaseCandidates', blockType: Scratch.BlockType.REPORTER, text: 'raycast broad-phase candidates'},
    {opcode: 'raycastBoundsTests', blockType: Scratch.BlockType.REPORTER, text: 'raycast bounds tests'},
    {opcode: 'raycastTriangleTests', blockType: Scratch.BlockType.REPORTER, text: 'raycast triangle tests'},
    {opcode: 'raycastHits', blockType: Scratch.BlockType.REPORTER, text: 'raycast hits this update'},
    {opcode: 'raycastTime', blockType: Scratch.BlockType.REPORTER, text: 'raycast CPU milliseconds'},
    '---',
    {
        opcode: 'worldToStageValue', blockType: Scratch.BlockType.REPORTER,
        text: 'world [X] [Y] [Z] from camera [CAMERA] as [VALUE]',
        arguments: {
            X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: -5},
            CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, VALUE: {type: Scratch.ArgumentType.STRING, menu: 'coordinateValue', defaultValue: 'stage x'}
        }
    },
    {
        opcode: 'worldPointInFront', blockType: Scratch.BlockType.BOOLEAN,
        text: 'world [X] [Y] [Z] in front of camera [CAMERA]?',
        arguments: {X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: -5}, CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}}
    },
    {
        opcode: 'worldPointVisible', blockType: Scratch.BlockType.BOOLEAN,
        text: 'world [X] [Y] [Z] visible by camera [CAMERA]?',
        arguments: {X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: -5}, CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}}
    },
    {
        opcode: 'stageRayDirection', blockType: Scratch.BlockType.REPORTER,
        text: 'camera [CAMERA] stage x [X] y [Y] ray direction [AXIS]',
        arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'z'}}
    },
    '---',
    {
        opcode: 'lookCameraAt', blockType: Scratch.BlockType.COMMAND, text: 'point camera [CAMERA] at world [X] [Y] [Z]',
        arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}
    },
    {opcode: 'setCameraFov', blockType: Scratch.BlockType.COMMAND, text: 'set camera [CAMERA] FOV [FOV]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, FOV: {type: Scratch.ArgumentType.NUMBER, defaultValue: 60}}},
    {opcode: 'changeCameraFov', blockType: Scratch.BlockType.COMMAND, text: 'change camera [CAMERA] FOV by [AMOUNT]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, AMOUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 5}}},
    {opcode: 'setCameraNearClip', blockType: Scratch.BlockType.COMMAND, text: 'set camera [CAMERA] near clip [DISTANCE]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.1}}},
    {opcode: 'setCameraFarClip', blockType: Scratch.BlockType.COMMAND, text: 'set camera [CAMERA] far clip [DISTANCE]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1000}}},
    {opcode: 'moveCameraLocal', blockType: Scratch.BlockType.COMMAND, text: 'move camera [CAMERA] [BASIS] by [DISTANCE]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, BASIS: {type: Scratch.ArgumentType.STRING, menu: 'basisAxis', defaultValue: 'forward'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'rotateCamera', blockType: Scratch.BlockType.COMMAND, text: 'rotate camera [CAMERA] [AXIS] by [DEGREES] degrees', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'cameraRotationAxis', defaultValue: 'yaw'}, DEGREES: {type: Scratch.ArgumentType.NUMBER, defaultValue: 5}}},
    {opcode: 'cameraBasisComponent', blockType: Scratch.BlockType.REPORTER, text: 'camera [CAMERA] [BASIS] [AXIS]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, BASIS: {type: Scratch.ArgumentType.STRING, menu: 'basisAxis', defaultValue: 'forward'}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'z'}}},
    {opcode: 'moveObjectLocal', blockType: Scratch.BlockType.COMMAND, text: 'move [NAME] [BASIS] by [DISTANCE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}, BASIS: {type: Scratch.ArgumentType.STRING, menu: 'basisAxis', defaultValue: 'forward'}, DISTANCE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'objectBasisComponent', blockType: Scratch.BlockType.REPORTER, text: '[NAME] [BASIS] [AXIS]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}, BASIS: {type: Scratch.ArgumentType.STRING, menu: 'basisAxis', defaultValue: 'forward'}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'z'}}},
    '---',
    {opcode: 'distance3D', blockType: Scratch.BlockType.REPORTER, text: '3D distance from [AX] [AY] [AZ] to [BX] [BY] [BZ]', arguments: {AX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'vectorLength3D', blockType: Scratch.BlockType.REPORTER, text: 'length of vector [X] [Y] [Z]', arguments: {X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'dotProduct3D', blockType: Scratch.BlockType.REPORTER, text: 'dot [AX] [AY] [AZ] with [BX] [BY] [BZ]', arguments: {AX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, AY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'crossProduct3D', blockType: Scratch.BlockType.REPORTER, text: 'cross [AX] [AY] [AZ] with [BX] [BY] [BZ] component [AXIS]', arguments: {AX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, AY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'z'}}},
    {opcode: 'vectorNormalizedComponent', blockType: Scratch.BlockType.REPORTER, text: 'normalized [X] [Y] [Z] component [AXIS]', arguments: {X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'x'}}},
    {opcode: 'directionComponent3D', blockType: Scratch.BlockType.REPORTER, text: 'direction from [AX] [AY] [AZ] to [BX] [BY] [BZ] component [AXIS]', arguments: {AX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'x'}}},
    {opcode: 'angleBetweenVectors', blockType: Scratch.BlockType.REPORTER, text: 'angle between [AX] [AY] [AZ] and [BX] [BY] [BZ]', arguments: {AX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, AY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, AZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, BY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, BZ: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'lerpNumber', blockType: Scratch.BlockType.REPORTER, text: 'lerp [START] to [END] by [AMOUNT]', arguments: {START: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, END: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}, AMOUNT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5}}},
    {opcode: 'clampNumber', blockType: Scratch.BlockType.REPORTER, text: 'clamp [VALUE] between [MINIMUM] and [MAXIMUM]', arguments: {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 5}, MINIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, MAXIMUM: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}}},
    '---',
    {opcode: 'tweenResourcePosition', blockType: Scratch.BlockType.COMMAND, text: 'tween [NAME] position to [X] [Y] [Z] over [SECONDS] seconds [EASING]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: -5}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, EASING: {type: Scratch.ArgumentType.STRING, menu: 'tweenEasing', defaultValue: 'ease-in-out'}}},
    {opcode: 'tweenResourceRotation', blockType: Scratch.BlockType.COMMAND, text: 'tween [NAME] rotation to [X] [Y] [Z] degrees over [SECONDS] seconds [EASING]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}, X: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}, Y: {type: Scratch.ArgumentType.ANGLE, defaultValue: 90}, Z: {type: Scratch.ArgumentType.ANGLE, defaultValue: 0}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, EASING: {type: Scratch.ArgumentType.STRING, menu: 'tweenEasing', defaultValue: 'ease-in-out'}}},
    {opcode: 'tweenResourceScale', blockType: Scratch.BlockType.COMMAND, text: 'tween [NAME] scale to [X] [Y] [Z] over [SECONDS] seconds [EASING]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, EASING: {type: Scratch.ArgumentType.STRING, menu: 'tweenEasing', defaultValue: 'ease-in-out'}}},
    {opcode: 'tweenCameraFov', blockType: Scratch.BlockType.COMMAND, text: 'tween camera [CAMERA] FOV to [FOV] over [SECONDS] seconds [EASING]', arguments: {CAMERA: {type: Scratch.ArgumentType.STRING, defaultValue: 'main'}, FOV: {type: Scratch.ArgumentType.NUMBER, defaultValue: 75}, SECONDS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, EASING: {type: Scratch.ArgumentType.STRING, menu: 'tweenEasing', defaultValue: 'ease-in-out'}}},
    {opcode: 'pauseTween', blockType: Scratch.BlockType.COMMAND, text: 'pause tweens on [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}},
    {opcode: 'resumeTween', blockType: Scratch.BlockType.COMMAND, text: 'resume tweens on [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}},
    {opcode: 'stopTween', blockType: Scratch.BlockType.COMMAND, text: 'stop tweens on [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}},
    {opcode: 'tweenActive', blockType: Scratch.BlockType.BOOLEAN, text: '[NAME] has active tween?', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'cube'}}},
    {opcode: 'activeTweens', blockType: Scratch.BlockType.REPORTER, text: 'active tweens'},
    {opcode: 'tweenUpdates', blockType: Scratch.BlockType.REPORTER, text: 'tween updates this frame'},
    {opcode: 'completedTweens', blockType: Scratch.BlockType.REPORTER, text: 'tweens completed this frame'},
    {opcode: 'tweenUpdateTime', blockType: Scratch.BlockType.REPORTER, text: 'tween update milliseconds'},
    '---',
    {opcode: 'createTerrain', blockType: Scratch.BlockType.COMMAND, text: 'create terrain [NAME] width [WIDTH] depth [DEPTH] segments [X_SEGMENTS] by [Z_SEGMENTS]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, WIDTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 20}, DEPTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 20}, X_SEGMENTS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 16}, Z_SEGMENTS: {type: Scratch.ArgumentType.NUMBER, defaultValue: 16}}},
    {opcode: 'deleteTerrain', blockType: Scratch.BlockType.COMMAND, text: 'delete terrain [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}}},
    {opcode: 'setTerrainHeight', blockType: Scratch.BlockType.COMMAND, text: 'set terrain [NAME] grid x [X] z [Z] height [HEIGHT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setTerrainFlat', blockType: Scratch.BlockType.COMMAND, text: 'set terrain [NAME] flat height [HEIGHT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'generateTerrainHills', blockType: Scratch.BlockType.COMMAND, text: 'generate terrain [NAME] hills amplitude [AMPLITUDE] frequency [FREQUENCY] seed [SEED]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, AMPLITUDE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}, FREQUENCY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}, SEED: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'setTerrainMaterial', blockType: Scratch.BlockType.COMMAND, text: 'set terrain [NAME] material [MATERIAL]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, MATERIAL: {type: Scratch.ArgumentType.STRING, defaultValue: 'surface'}}},
    {opcode: 'terrainHeightAt', blockType: Scratch.BlockType.REPORTER, text: 'terrain [NAME] height at world x [X] z [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'terrainNormalAt', blockType: Scratch.BlockType.REPORTER, text: 'terrain [NAME] normal [AXIS] at world x [X] z [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'ground'}, AXIS: {type: Scratch.ArgumentType.STRING, menu: 'vectorAxis', defaultValue: 'y'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'terrainCount', blockType: Scratch.BlockType.REPORTER, text: 'terrain count'},
    {opcode: 'terrainTriangles', blockType: Scratch.BlockType.REPORTER, text: 'terrain triangles'},
    {opcode: 'terrainGeometryBuilds', blockType: Scratch.BlockType.REPORTER, text: 'terrain geometry builds'},
    {opcode: 'terrainGpuUploads', blockType: Scratch.BlockType.REPORTER, text: 'terrain GPU uploads'},
    {opcode: 'terrainGpuUploadBytes', blockType: Scratch.BlockType.REPORTER, text: 'terrain GPU upload bytes'},
    {opcode: 'visibleTerrainChunks', blockType: Scratch.BlockType.REPORTER, text: 'visible terrain chunks'},
    {opcode: 'culledTerrainChunks', blockType: Scratch.BlockType.REPORTER, text: 'culled terrain chunks'},
    '---',
    {opcode: 'create3DText', blockType: Scratch.BlockType.COMMAND, text: 'create 3D text [NAME] text [TEXT] font [FONT] size [FONT_SIZE] resolution [RESOLUTION] height [HEIGHT] facing [MODE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, TEXT: {type: Scratch.ArgumentType.STRING, defaultValue: 'Hello 3D'}, FONT: {type: Scratch.ArgumentType.STRING, menu: 'textFont', defaultValue: 'sans-serif'}, FONT_SIZE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 64}, RESOLUTION: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}, MODE: {type: Scratch.ArgumentType.STRING, menu: 'billboardMode', defaultValue: 'full'}}},
    {opcode: 'set3DText', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] to [TEXT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, TEXT: {type: Scratch.ArgumentType.STRING, defaultValue: 'Updated'}}},
    {opcode: 'set3DTextPosition', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] position [X] [Y] [Z]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}, Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 2}, Z: {type: Scratch.ArgumentType.NUMBER, defaultValue: -5}}},
    {opcode: 'set3DTextSize', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] width [WIDTH] height [HEIGHT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, WIDTH: {type: Scratch.ArgumentType.NUMBER, defaultValue: 3}, HEIGHT: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'set3DTextBillboard', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] facing [MODE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, MODE: {type: Scratch.ArgumentType.STRING, menu: 'billboardMode', defaultValue: 'full'}}},
    {opcode: 'set3DTextPivot', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] pivot [PIVOT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, PIVOT: {type: Scratch.ArgumentType.STRING, menu: 'spritePivot', defaultValue: 'center'}}},
    {opcode: 'set3DTextColor', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] color [COLOR]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}}},
    {opcode: 'set3DTextFont', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] font [FONT] size [SIZE]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, FONT: {type: Scratch.ArgumentType.STRING, menu: 'textFont', defaultValue: 'sans-serif'}, SIZE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 64}}},
    {opcode: 'set3DTextAlignment', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] alignment [ALIGNMENT]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, ALIGNMENT: {type: Scratch.ArgumentType.STRING, menu: 'textAlignment', defaultValue: 'center'}}},
    {opcode: 'set3DTextBackground', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] background [COLOR] opacity [OPACITY] %', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#000000'}, OPACITY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}}},
    {opcode: 'set3DTextResolution', blockType: Scratch.BlockType.COMMAND, text: 'set 3D text [NAME] resolution [RESOLUTION]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}, RESOLUTION: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}}},
    {opcode: 'delete3DText', blockType: Scratch.BlockType.COMMAND, text: 'delete 3D text [NAME]', arguments: {NAME: {type: Scratch.ArgumentType.STRING, defaultValue: 'label'}}},
    {opcode: 'textLabelCount', blockType: Scratch.BlockType.REPORTER, text: '3D text label count'},
    {opcode: 'textRasterizations', blockType: Scratch.BlockType.REPORTER, text: '3D text rasterizations'},
    {opcode: 'textTextureUploads', blockType: Scratch.BlockType.REPORTER, text: '3D text texture uploads'},
    {opcode: 'sharedTextTextures', blockType: Scratch.BlockType.REPORTER, text: 'shared 3D text textures'},
    {opcode: 'renderedTextInstances', blockType: Scratch.BlockType.REPORTER, text: 'rendered 3D text instances'},
    {opcode: 'textDrawCalls', blockType: Scratch.BlockType.REPORTER, text: '3D text draw calls'},
    '---',
    ...customRenderingBlocks(Scratch),
    ...physicsAudioBlocks(Scratch),
    ...apiExpansionBlocks(Scratch),
    {opcode: 'lastError', blockType: Scratch.BlockType.REPORTER, text: 'last 3D error'},
    {opcode: 'clearError', blockType: Scratch.BlockType.COMMAND, text: 'clear 3D error'}
], Scratch), Scratch);
