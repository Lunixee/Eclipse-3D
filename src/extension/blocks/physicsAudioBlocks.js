const menu = items => ({acceptReporters: true, items});
export const PHYSICS_AUDIO_MENUS = {
    physicsType: menu(['static', 'kinematic', 'dynamic']),
    physicsVector: menu(['position', 'velocity']),
    physicsNumber: menu(['mass', 'restitution', 'friction', 'gravityScale']),
    physicsContactState: menu(['current', 'entered', 'exited']),
    physicsContactField: menu(['normal x', 'normal y', 'normal z', 'point x', 'point y', 'point z', 'penetration']),
    physicsBodyField: menu(['x', 'y', 'z', 'velocity x', 'velocity y', 'velocity z', 'mass', 'restitution', 'friction', 'gravityScale']),
    physicsMetric: menu(['steps', 'integrated', 'candidates', 'narrowTests', 'gridUpdates', 'droppedTime', 'contactOverflows']),
    audioMode: menu(['positional', 'global']),
    audioAction: menu(['play', 'pause', 'resume', 'stop']),
    audioNumber: menu(['volume', 'rate', 'refDistance', 'maxDistance', 'rolloff', 'coneInner', 'coneOuter', 'coneGain']),
    audioVector: menu(['position', 'direction']),
    audioReadNumber: menu(['time', 'duration', 'volume', 'rate', 'refDistance', 'maxDistance', 'rolloff', 'coneInner', 'coneOuter', 'coneGain']),
    audioMetric: menu(['contexts', 'decodes', 'voices', 'listenerUpdates', 'sourceUpdates'])
};

export const physicsAudioBlocks = Scratch => {
    const s = (defaultValue, menu) => ({type: Scratch.ArgumentType.STRING, defaultValue, ...(menu ? {menu} : {})});
    const n = defaultValue => ({type: Scratch.ArgumentType.NUMBER, defaultValue});
    const block = (opcode, text, args, type = 'COMMAND') => ({opcode, text, arguments: args, blockType: Scratch.BlockType[type]});
    const name = () => ({NAME: s('body')});
    const xyz = () => ({X: n(0), Y: n(0), Z: n(0)});
    const contact = () => ({...name(), STATE: s('current', 'physicsContactState')});
    const sound = () => ({NAME: s('source')});
    return [
        '---',
        block('createPhysicsBox', 'create [TYPE] physics box [NAME] width [WIDTH] height [HEIGHT] depth [DEPTH]', {...name(), TYPE: s('static', 'physicsType'), WIDTH: n(1), HEIGHT: n(1), DEPTH: n(1)}),
        block('createPhysicsSphere', 'create [TYPE] physics sphere [NAME] radius [RADIUS]', {...name(), TYPE: s('dynamic', 'physicsType'), RADIUS: n(0.5)}),
        block('setPhysicsVector', 'set physics body [NAME] [PROPERTY] x [X] y [Y] z [Z]', {...name(), PROPERTY: s('velocity', 'physicsVector'), ...xyz()}),
        block('setPhysicsGravity', 'set physics gravity x [X] y [Y] z [Z]', {X: n(0), Y: n(-9.81), Z: n(0)}),
        block('setPhysicsNumber', 'set physics body [NAME] [PROPERTY] [VALUE]', {...name(), PROPERTY: s('mass', 'physicsNumber'), VALUE: n(1)}),
        block('setPhysicsTrigger', 'set physics body [NAME] trigger [ENABLED]', {...name(), ENABLED: s('on', 'onOff')}),
        block('setPhysicsFilter', 'set physics body [NAME] layer bits [LAYER] mask bits [MASK]', {...name(), LAYER: n(1), MASK: n(4294967295)}),
        block('attachPhysicsBody', 'attach physics body [NAME] to object [OBJECT] offset x [X] y [Y] z [Z]', {...name(), OBJECT: s('cube'), ...xyz()}),
        block('deletePhysicsBody', 'delete physics body [NAME]', name()),
        block('physicsTouching', 'physics body [NAME] [STATE] touching [OTHER] ?', {...contact(), OTHER: s('')}, 'BOOLEAN'),
        block('physicsContactCount', 'physics body [NAME] [STATE] contact count', contact(), 'REPORTER'),
        block('physicsContactName', 'physics body [NAME] [STATE] contact [INDEX] name', {...contact(), INDEX: n(1)}, 'REPORTER'),
        block('physicsContactNumber', 'physics body [NAME] [STATE] contact [INDEX] [FIELD]', {...contact(), INDEX: n(1), FIELD: s('normal y', 'physicsContactField')}, 'REPORTER'),
        block('physicsBodyNumber', 'physics body [NAME] [FIELD]', {...name(), FIELD: s('velocity y', 'physicsBodyField')}, 'REPORTER'),
        block('physicsBodySleeping', 'physics body [NAME] sleeping?', name(), 'BOOLEAN'),
        block('physicsMetric', 'physics [METRIC]', {METRIC: s('steps', 'physicsMetric')}, 'REPORTER'),
        '---',
        block('loadAudioURL', 'load audio asset [ASSET] from URL or data URI [URL]', {ASSET: s('sound'), URL: s('data:audio/wav;base64,')}),
        block('loadAudioSound', 'load audio asset [ASSET] from this sprite sound [SOUND]', {ASSET: s('sound'), SOUND: s('sound')}),
        block('createAudioSource', 'create [MODE] audio source [NAME] asset [ASSET]', {...sound(), ASSET: s('sound'), MODE: s('positional', 'audioMode')}),
        block('controlAudioSource', '[ACTION] audio source [NAME]', {...sound(), ACTION: s('play', 'audioAction')}),
        block('setAudioNumber', 'set audio source [NAME] [PROPERTY] [VALUE]', {...sound(), PROPERTY: s('volume', 'audioNumber'), VALUE: n(1)}),
        block('setAudioLoop', 'set audio source [NAME] loop [ENABLED]', {...sound(), ENABLED: s('on', 'onOff')}),
        block('setAudioVector', 'set audio source [NAME] [PROPERTY] x [X] y [Y] z [Z]', {...sound(), PROPERTY: s('position', 'audioVector'), ...xyz()}),
        block('attachAudioSource', 'attach audio source [NAME] to object [OBJECT]', {...sound(), OBJECT: s('cube')}),
        block('deleteAudioSource', 'delete audio source [NAME]', sound()),
        block('deleteAudioAsset', 'delete audio asset [ASSET]', {ASSET: s('sound')}),
        block('audioSourceState', 'audio source [NAME] state', sound(), 'REPORTER'),
        block('audioSourceNumber', 'audio source [NAME] [PROPERTY]', {...sound(), PROPERTY: s('time', 'audioReadNumber')}, 'REPORTER'),
        block('audioAssetState', 'audio asset [ASSET] state', {ASSET: s('sound')}, 'REPORTER'),
        block('unlockAudio', 'unlock 3D audio', {}),
        block('audioMetric', 'audio [METRIC]', {METRIC: s('decodes', 'audioMetric')}, 'REPORTER')
    ];
};
