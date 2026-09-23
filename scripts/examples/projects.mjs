import {makeRotorGlb, sparkSvg} from './assets.mjs';

export const command = (opcode, args = {}) => ({opcode, args});
const c = command;
const position = (NAME,X,Y,Z) => c('setPosition',{NAME,X,Y,Z});
const scale = (NAME,X,Y,Z) => c('setScale',{NAME,X,Y,Z});
const material = (MATERIAL,COLOR,TYPE='basic-lit') => [c('createMaterial',{MATERIAL,TYPE}),c('setMaterialBaseColor',{MATERIAL,COLOR})];
const assign = (RESOURCE,MATERIAL) => c('setResourceMaterial',{RESOURCE,MATERIAL});
const cube = (NAME,p,s,MATERIAL) => [c('createCube',{NAME}),position(NAME,...p),scale(NAME,...s),assign(NAME,MATERIAL)];
const base = () => [c('resetEngine'),c('initializeEngine'),c('createScene'),c('setSceneBackground',{COLOR:'#152239',OPACITY:100}),
    c('createCamera',{NAME:'main',FOV:48}),position('main',5,3.8,7),c('lookCameraAt',{CAMERA:'main',X:0,Y:0.8,Z:0})];
const studio = () => [...material('floor','#293b58'),...cube('floor',[0,-0.2,0],[6,0.3,4],'floor'),
    c('setAmbientLight',{COLOR:'#b8d4ed',INTENSITY:0.35}),c('createDirectionalLight',{NAME:'sun',INTENSITY:1.3}),
    c('setRotation',{NAME:'sun',X:-35,Y:-30,Z:0})];
const environment = () => [c('createSolidEnvironment',{ENVIRONMENT:'studio',COLOR:'#b6d5e6'}),c('setSceneEnvironment',{ENVIRONMENT:'studio'}),c('setEnvironmentBackground',{ENVIRONMENT:'studio',ENABLED:'off'})];

const hello = [c('resetEngine'),c('initializeEngine'),c('createScene'),c('setSceneBackground',{COLOR:'#152239'}),c('createCamera'),
    position('main',3,2,5),c('lookCameraAt'),c('createCube'),c('setRotation',{NAME:'cube',X:15,Y:30,Z:0}),
    c('setMaterialColor',{NAME:'cube',COLOR:'#a8dadc'}),c('setAmbientLight',{COLOR:'#ffffff',INTENSITY:0.4}),c('createDirectionalLight')];
const lit = [...base(),...studio(),...environment(),...material('ceramic','#a8dadc','pbr'),c('setPbrFactor',{MATERIAL:'ceramic',PROPERTY:'roughness',VALUE:0.75}),
    ...material('metal','#b1c2e4','pbr'),c('setPbrFactor',{MATERIAL:'metal',PROPERTY:'metallic',VALUE:0.9}),c('setPbrFactor',{MATERIAL:'metal',PROPERTY:'roughness',VALUE:0.2}),
    ...cube('ceramic',[-1.2,0.55,0],[1.15,1.15,1.15],'ceramic'),...cube('metal',[1.2,0.55,0],[1.15,1.15,1.15],'metal'),
    c('createPointLight',{NAME:'warm rim'}),c('setLocalLightPosition',{LIGHT:'warm rim',X:1.5,Y:2,Z:1.5}),c('setLocalLightColor',{LIGHT:'warm rim',COLOR:'#ffcba0'}),
    c('setLocalLightIntensity',{LIGHT:'warm rim',INTENSITY:3}),c('setLocalLightRange',{LIGHT:'warm rim',RANGE:7})];
const animated = [...base(),...studio(),...environment(),c('loadModelFromSource',{MODEL:'rotor',SOURCE:{variable:'rotor GLB'}}),
    c('createModelInstance',{NAME:'rotor',MODEL:'rotor'}),c('playAnimation',{INSTANCE:'rotor',CLIP:'Spin',LOOPING:'on'})];
const particles = [...base(),...studio(),c('loadTextureFromSource',{TEXTURE:'spark',SOURCE:{variable:'spark image'}}),
    c('createParticleEmitter',{NAME:'fountain',TEXTURE:'spark',MAXIMUM:240}),position('fountain',0,0.1,0),
    c('setParticleSeed',{NAME:'fountain',SEED:22}),c('setParticleEmissionRate',{NAME:'fountain',RATE:65}),
    c('setParticleVelocity',{NAME:'fountain',X:0,Y:3,Z:0,SPREAD:0.7}),c('setParticleAcceleration',{NAME:'fountain',X:0,Y:-2,Z:0}),
    c('setParticleLifetime',{NAME:'fountain',MINIMUM:1.1,MAXIMUM:1.6}),c('setParticleSizeOverLife',{NAME:'fountain',START:0.13,END:0.03}),
    c('setParticleColorOverLife',{NAME:'fountain',START:'#a8dadc',END:'#597ec6'}),c('setParticleAlphaOverLife',{NAME:'fountain',START:100,END:0}),
    c('startParticleEmitter',{NAME:'fountain'})];
const physics = [...base(),...studio(),...material('body','#a8dadc'),...cube('body',[0,2.6,0],[0.7,0.7,0.7],'body'),
    c('createPhysicsBox',{NAME:'floor body',TYPE:'static',WIDTH:6,HEIGHT:0.3,DEPTH:4}),c('setPhysicsVector',{NAME:'floor body',PROPERTY:'position',X:0,Y:-0.2,Z:0}),
    c('createPhysicsBox',{NAME:'body',TYPE:'dynamic',WIDTH:0.7,HEIGHT:0.7,DEPTH:0.7}),c('attachPhysicsBody',{NAME:'body',OBJECT:'body'}),
    c('setPhysicsNumber',{NAME:'body',PROPERTY:'restitution',VALUE:0.55}),c('loadAudioSound',{ASSET:'tone',SOUND:'Soft pulse'}),
    c('unlockAudio'),c('createAudioSource',{NAME:'pulse',ASSET:'tone',MODE:'positional'}),c('attachAudioSource',{NAME:'pulse',OBJECT:'body'}),
    c('setAudioNumber',{NAME:'pulse',PROPERTY:'volume',VALUE:0.25}),c('setAudioLoop',{NAME:'pulse',ENABLED:'on'}),c('controlAudioSource',{NAME:'pulse',ACTION:'play'}),
    {forever:[{wait:3},position('body',0,2.6,0),c('setPhysicsVector',{NAME:'body',PROPERTY:'velocity',X:0,Y:0,Z:0})]}];
const post = [...base(),...studio(),...material('subject','#a8dadc'),...cube('subject',[-1,0.65,0],[1.1,1.4,1.1],'subject'),
    c('createCamera',{NAME:'detail',FOV:45}),position('detail',-1,1.5,3.5),c('lookCameraAt',{CAMERA:'detail',X:-1,Y:0.65,Z:0}),
    c('createRenderTarget',{TARGET:'detail view',WIDTH:256,HEIGHT:192}),c('renderCameraToRenderTarget',{CAMERA:'detail',TARGET:'detail view'}),
    c('setActiveCamera',{NAME:'main'}),...material('screen','#ffffff','unlit'),c('setMaterialTexture',{MATERIAL:'screen',TEXTURE:'detail view'}),...cube('screen',[1.4,0.8,0],[1.6,1.2,0.08],'screen'),
    c('setPostProcessing',{ENABLED:'on'}),c('setVignetteFactor',{PROPERTY:'intensity',VALUE:0.3}),c('setPostColorFactor',{PROPERTY:'saturation',VALUE:1.15}),c('setFxaa',{ENABLED:'on'}),
    {forever:[c('rotateResourceBy',{RESOURCE:'subject',X:0,Y:2,Z:0}),c('renderCameraToRenderTarget',{CAMERA:'detail',TARGET:'detail view'}),{wait:0.05}]}];
const custom = [...base(),...studio(),c('createCustomGeometry',{USAGE:'static',GEOMETRY:'diamond',DATA:{variable:'diamond geometry'}}),
    c('createCustomShader',{SHADER:'facets',VERTEX:{variable:'vertex shader'},FRAGMENT:{variable:'fragment shader'},UNIFORMS:'{"tint":"color"}'}),
    c('createCustomMaterial',{MATERIAL:'facets',SHADER:'facets'}),c('setCustomUniformVector',{MATERIAL:'facets',UNIFORM:'tint',X:0.35,Y:0.85,Z:0.9,W:1}),
    c('createGeometryModel',{MODEL:'diamond',GEOMETRY:'diamond',MATERIAL:'facets'}),c('createModelInstance',{NAME:'diamond',MODEL:'diamond'}),position('diamond',0,1,0),
    {forever:[c('rotateResourceBy',{RESOURCE:'diamond',X:0,Y:1.5,Z:0}),{wait:0.03}]}];
const diamond = {positions:[0,1,0, -1,0,0, 0,0,1, 1,0,0, 0,0,-1, 0,-1,0],indices:[0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4]};

export const EXAMPLES = [
    {id:'hello-3d',title:'Hello 3D',purpose:'A first retained scene: one camera, one cube and two light inputs.',steps:hello,variables:{},snapshotSeconds:0.5,
        learn:'Move main to change the view. Change the cube rotation or color once and observe the retained image. No forever render loop is needed.',expected:'One pale cyan cube on an indigo background. Stop All keeps the last image.'},
    {id:'materials-lighting',title:'Materials & Lighting',purpose:'Compare rough ceramic with a metallic surface under shared studio light.',steps:lit,variables:{},snapshotSeconds:0.5,
        learn:'Change metal roughness from 0.2 toward 1, then adjust the warm rim light. Material names are shared assets; the two objects use separate materials.',expected:'Two cubes on a dark plinth, with distinct PBR factors and a warm local rim. A solid environment provides uniform ambient IBL rather than a detailed reflection map.'},
    {id:'animated-model',title:'Animated Model',purpose:'Load an embedded original glTF rotor and play its named Spin clip.',steps:animated,variables:{'rotor GLB':`data:model/gltf-binary;base64,${makeRotorGlb().toString('base64')}`},snapshotSeconds:1.1,
        learn:'The rotor asset is stored in a project variable. Its load block yields before instance creation. Pause/resume the clip or set its speed. This compact example demonstrates node TRS animation; skeletal skinning is also supported by the engine.',expected:'A three-blade cyan rotor turning above an indigo stand. Pause/Stop freeze the clip; Green Flag rebuilds one clean scene.'},
    {id:'particles',title:'Particles',purpose:'A seeded fountain with bounded capacity, gravity and color/alpha over life.',steps:particles,variables:{'spark image':`data:image/svg+xml;base64,${Buffer.from(sparkSvg).toString('base64')}`},snapshotSeconds:1.5,
        learn:'Change emission rate, velocity spread and lifetime independently. Stopping the emitter allows existing particles to expire; pausing freezes them. The maximum is 240, not an unbounded spawn loop.',expected:'A compact cyan-blue fountain above the plinth, fading as particles age. The seed repeats random choices; exact frame contents depend on elapsed simulation time.'},
    {id:'physics-audio',title:'Physics & Audio',purpose:'An attached dynamic box falls onto a static floor while carrying a quiet positional pulse.',steps:physics,variables:{},sound:true,snapshotSeconds:0.55,
        learn:'Click Green Flag to authorize simulation/audio. The box resets every three seconds; gravity moves it between resets. Volume 0.25 is a factor. Move the camera to hear listener-relative attenuation. If blocked by autoplay, click the Stage to unlock and resume the pulse.',expected:'A cyan box dropping and bouncing above the plinth, with a soft repeating tone. Stop All holds physics and audio. Collision dimensions are explicit and independent of mesh scale.'},
    {id:'post-processing',title:'Post Processing & Render Targets',purpose:'A second camera updates an in-world monitor while the main view uses vignette, color and FXAA.',steps:post,variables:{},snapshotSeconds:1.0,
        learn:'The target updates only when its render command runs (20 requested updates/second here). Try removing that loop: the monitor keeps its last completed image. Disable post to compare the same geometry at neutral output.',expected:'A turning cyan block at left and a thin monitor at right showing a closer camera view. The output uses restrained vignette and saturation; it does not claim HDR bloom.'},
    {id:'custom-rendering',title:'Custom Rendering',purpose:'Original octahedron geometry with a project-defined unlit GLSL material and typed tint uniform.',steps:custom,snapshotSeconds:0.8,variables:{
        'diamond geometry':JSON.stringify(diamond),
        'vertex shader':'out vec3 facet;\nvoid main() { facet = abs(t3d_normal); gl_Position = t3d_clipPosition(t3d_position); }',
        'fragment shader':'in vec3 facet;\nout vec4 outputColor;\nvoid main() { outputColor = vec4(tint * (0.35 + 0.65 * facet), t3d_opacity); }'},
        learn:'Inspect the geometry and shader variables. Change tint with the typed uniform block. Shader source/schema determine program identity; changing uniform values does not compile a new shader. Contract v1 is unlit/unskinned and has no engine shadow hooks.',expected:'A rotating cyan faceted diamond on the studio plinth. The custom shader shades from its normals and tint rather than the scene light system.'}
];

export const RAY_WORKFLOW = [c('castCameraForwardRay',{CAMERA:'main',DISTANCE:100,FILTER:'all'}),c('rayHit'),c('rayHitText',{FIELD:'object'}),c('rayHitNumber',{FIELD:'distance'})];
