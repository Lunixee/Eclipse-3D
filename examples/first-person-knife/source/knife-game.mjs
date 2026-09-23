import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {IcosahedronGeometry,TorusGeometry} from 'three';
import {arenaGeometry,solids,primitiveData,bannerData} from './arena-layout.mjs';
import {knifePose as pose} from './knife-viewmodel.mjs';

export async function buildKnifeGame(d,root){
    const {ProjectBuilder,ext,setVar:S,changeVar:C,ifThen:If,ifElse:Else,repeat,forever,broadcast,
        variable:V,extensionReporter:E,add:A,subtract:B,multiply:M,equals:Eq,lessThan:Lt,greaterThan:Gt,
        and:And,or:Or,math,timer,mouseDown,keyPressed:K,pos,rot,material,model,pointAhead:PA,
        cameraBasis:Basis,rayText,rayNumber,arithmetic}=d;
    const Div=(a,b)=>arithmetic('operator_divide',a,b), clamp=(a,min,max)=>E('clampNumber',{VALUE:a,MINIMUM:min,MAXIMUM:max});
    const sin=x=>math('sin',x),cos=x=>math('cos',x),abs=x=>math('abs',x),sqrt=x=>math('sqrt',x);
    const call=name=>({kind:'call',name});
    const initial={
        'import message':'Optional viewmodel: press I to load KnifeFPS.glb, or keep playing.','rig ready':0,'rig loading':0,'game ready':0,'player x':0,'player y':0,'player z':6.8,yaw:0,pitch:0,
        vx:0,vy:0,vz:0,grounded:1,'ground height':0,'eye height':1.65,'body height':1.78,
        state:'idle',speed:0,'wish x':0,'wish z':0,'wish length':0,'target speed':0,accel:0,
        dt:0,'previous time':0,'world time':0,'half dt':0,'old x':0,'old z':0,
        'jump held':0,'jump buffer':0,coyote:0,'crouch held':0,crouching:0,sprinting:0,
        'slide time':0,'slide cooldown':0,'slide x':0,'slide z':0,'slide speed':0,slides:0,jumps:0,landings:0,
        landing:0,'height target':1.65,fov:76,'fov target':76,
        attacking:0,'attack time':0,'attack held':0,'attack request':0,'jump request':0,'reset request':0,
        'viewmodel clip':'','desired clip':'','clip blend':.12,'whoosh played':0,
        'last hit':'',swings:0,hits:0,'last impact':'','last impact sample':'','ray sample':'','ray object':'','ray distance':0,
        impulse:0,lift:0,'hit x':0,'hit y':0,'hit z':0,
        'weapon base right':pose.base.right,'weapon base up':pose.base.up,
        'weapon depth scale':pose.depthScale,
        'weapon right':pose.base.right,'weapon up':pose.base.up,'weapon ahead':pose.base.ahead,
        'weapon offset right':0,'weapon offset up':0,'weapon target right':0,'weapon target up':0,
        'atan x':0,'atan y':0,'atan result':0,'model rx':0,'model ry':0,'model rz':0,
        'm00':0,'m01':0,'m02':0,'m11':0,'m12':0,'m21':0,'m22':0,
        'orbit hit':0,'view mode':0,fps:0,'step count':0,'blocked stand':0,'reset held':0
    };
    const assets={
        'crate GLB':['assets/models/crate.glb','model/gltf-binary'],
        'shield GLB':['assets/models/shield.glb','model/gltf-binary'],
        'hammer GLB':['assets/models/war-hammer.glb','model/gltf-binary'],
        'wood texture':['assets/textures/wood-floor-basecolor-1024.jpg','image/jpeg']
    };
    for(const name of ['paving','plaster','dust','debris','mote','streak','sky'])assets[name+' texture']=[`assets/textures/arena-${name}.png`,'image/png'];
    for(const name of Object.keys(assets))initial[name]='';
    const broadcasts=['LOAD ASSETS','BUILD WORLD','SETUP PHYSICS','START GAME'];
    const builder=new ProjectBuilder(initial,broadcasts);
    for(const [name,[file,mime]] of Object.entries(assets))builder.variables[builder.variableIds.get(name)][1]=`data:${mime};base64,${(await readFile(path.join(root,file))).toString('base64')}`;
    let procedureIndex=0;
    const proc=(name,steps,comment)=>{
        const x=1050+(procedureIndex%4)*700,y=100+Math.floor(procedureIndex/4)*750;procedureIndex++;
        const id=builder.add('procedures_definition',null,{topLevel:true,x,y});
        const p=builder.add('procedures_prototype',id,{shadow:true});
        builder.blocks[p].mutation={tagName:'mutation',children:[],proccode:name,argumentids:'[]',argumentnames:'[]',argumentdefaults:'[]',warp:'true'};
        builder.blocks[id].inputs.custom_block=[1,p];builder.blocks[id].next=builder.sequence(steps,id);
        const c='procedure_comment_'+procedureIndex;builder.comments[c]={blockId:id,x:x+330,y,width:310,height:150,minimized:false,text:comment};builder.blocks[id].comment=c;
    };
    const resetState=Object.entries(initial).filter(([name])=>!assets[name]&&!['swings','hits','slides','jumps','landings','game ready','previous time','import message','rig ready','rig loading'].includes(name)).map(([name,value])=>S(name,value));
    builder.hat('flag',[
        S('game ready',0),S('rig ready',0),S('rig loading',0),S('import message',initial['import message']),...resetState,...['swings','hits','slides','jumps','landings'].map(n=>S(n,0)),
        ext('resetEngine'),ext('initializeEngine',{BACKEND:'separate-canvas'}),ext('createScene',{SCENE:'Eclipse Sky Court'}),
        ext('setSceneBackground',{COLOR:'#a9d8ec',OPACITY:100}),ext('createCamera',{NAME:'main',FOV:76}),pos('main',0,1.65,6.8),
        ext('setCameraClip',{CAMERA:'main',PLANE:'near',DISTANCE:pose.near}),ext('setCameraClip',{CAMERA:'main',PLANE:'far',DISTANCE:180}),
        broadcast('LOAD ASSETS',true),broadcast('BUILD WORLD',true),broadcast('SETUP PHYSICS',true),
        S('previous time',timer),S('game ready',1),broadcast('START GAME')
    ],40,64,'CLEAN START\nReset retained resources and movement, then load embedded scenery. Gameplay starts without a viewmodel; I optionally imports one later.');
    const load=[];
    for(const name of ['wood','paving','plaster','dust','debris','mote','streak','sky']){
        load.push(ext('loadTextureFromSource',{TEXTURE:name,SOURCE:V(name+' texture')}));
        load.push(ext('setTextureOption',{TEXTURE:name,OPTION:'color-space',VALUE:'srgb'}));
    }
    load.push(ext('setTextureOption',{TEXTURE:'wood',OPTION:'anisotropy',VALUE:'8'}));
    for(const [name,variableName] of [['crate','crate GLB'],['shield','shield GLB'],['hammer','hammer GLB']])load.push(ext('loadModelFromSource',{MODEL:name+' asset',SOURCE:V(variableName)}));
    for(const [asset,sound] of [['whoosh sound','Knife Whoosh'],['impact sound','Wood Impact'],['ambient sound','Dojo Ambience']])load.push(ext('loadAudioSound',{ASSET:asset,SOUND:sound}));
    builder.hat('receive',load,40,650,'ASSETS\nThe rig is selected locally. Scenery and synthesized sounds are embedded.', 'LOAD ASSETS');
    const world=[];
    for(const [name,color,texture] of [['paving','#ffffff','paving'],['chalk','#ffffff','plaster'],['wood','#e0c6a0','wood'],['warm trim','#c49b68'],['court line','#78a3a9'],['teal','#326772'],['joint','#c5d1d2'],['paper','#fff1ca']]){
        world.push(...material(name,color,'pbr'),ext('setPbrFactor',{MATERIAL:name,PROPERTY:'roughness',VALUE:.8}),ext('setPbrFactor',{MATERIAL:name,PROPERTY:'metallic',VALUE:0}));
        if(texture)world.push(ext('setMaterialTexture',{MATERIAL:name,TEXTURE:texture}));
    }
    world.push(ext('setMaterialSide',{MATERIAL:'chalk',SIDE:'double'}),ext('setMaterialSide',{MATERIAL:'teal',SIDE:'double'}));
    const geometry=(name,data,mat,p=[0,0,0],s=[1,1,1])=>{
        // Large mesh JSON belongs in project data, not an enormous Blockly text field.
        const variableName='geometry: '+name,id=`var_${builder.variableIds.size+1}`;
        builder.variableIds.set(variableName,id);builder.variables[id]=[variableName,JSON.stringify(data)];
        return [ext('createCustomGeometry',{GEOMETRY:name,USAGE:'static',DATA:V(variableName)}),
        ext('createGeometryModel',{MODEL:name+' asset',GEOMETRY:name,MATERIAL:mat}),...model(name,name+' asset',p,s),
        ext('setResourceReceivesShadows',{RESOURCE:name,ENABLED:'on'})
        ];
    };
    for(const {material:mat,data} of arenaGeometry)world.push(...geometry('arena '+mat,data,mat));
    for(const name of ['arena court line','arena joint'])world.push(ext('setResourceCastsShadows',{RESOURCE:name,ENABLED:'off'}));
    world.push(...geometry('floating orb',primitiveData(new IcosahedronGeometry(.46,1)),'teal',[-4.6,3.45,-3.2]));
    world.push(...geometry('orb ring',primitiveData(new TorusGeometry(.72,.022,5,48)),'warm trim',[-4.6,3.45,-3.2]));
    world.push(...geometry('banner left',bannerData,'teal',[-2,3.74,-11.35]),...geometry('banner right',bannerData,'teal',[2,3.74,-11.35]));
    world.push(...geometry('floating charm',primitiveData(new IcosahedronGeometry(.24,0)),'paper',[5.1,3.8,-6]));
    world.push(
        ext('createEnvironmentFromTexture',{ENVIRONMENT:'daylight',TEXTURE:'sky'}),ext('setSceneEnvironment',{ENVIRONMENT:'daylight'}),
        ext('setEnvironmentIntensity',{ENVIRONMENT:'daylight',INTENSITY:.9}),ext('setEnvironmentBackground',{ENVIRONMENT:'daylight',ENABLED:'on'}),ext('setGlobalEnvironmentQuality',{QUALITY:'high'}),
        ext('setAmbientLight',{COLOR:'#bedaf2',INTENSITY:.35}),ext('createDirectionalLight',{NAME:'sun',INTENSITY:1.6}),
        ext('setDirectionalLight',{LIGHT:'sun',COLOR:'#fff3de',INTENSITY:1.6}),rot('sun',54,-32,0),
        ext('setShadowsEnabled',{ENABLED:'on'}),ext('setShadowQuality',{QUALITY:'high'}),ext('setLightCastsShadows',{LIGHT:'sun',ENABLED:'on'}),
        ext('setShadowMapSize',{LIGHT:'sun',SIZE:2048}),ext('setShadowDistance',{LIGHT:'sun',VALUE:35}),ext('setShadowBounds',{LIGHT:'sun',VALUE:24}),ext('setShadowCameraFar',{LIGHT:'sun',VALUE:90}),
        ...model('light crate 1','crate asset',[0,.55,2.35],[1,1,1]),...model('light crate 2','crate asset',[1.45,.55,1.15],[1,1,1],[0,24,0]),
        ...model('heavy crate','crate asset',[-1.25,.55,-.3],[1.08,1.08,1.08],[0,-18,0]),
        ...model('shield target','shield asset',[2.45,1.48,-.1],[.7,.7,.7],[0,-90,0]),
        ...model('wall shield','shield asset',[4,2,-8.3],[.7,.7,.7],[0,-90,0]),...model('rack hammer','hammer asset',[-6.5,1.4,-10.25],[.6,.6,.6],[90,0,18])
    );
    for(const name of ['light crate 1','light crate 2','heavy crate','shield target'])world.push(ext('setResourceReceivesShadows',{RESOURCE:name,ENABLED:'on'}));
    const emitter=(name,texture,max,rate,lifetime,size,color,velocity,spread,accel,alpha)=>[
        ext('createParticleEmitter',{NAME:name,TEXTURE:texture,MAXIMUM:max}),ext('setParticleSeed',{NAME:name,SEED:1984+max}),
        ext('setParticleEmissionRate',{NAME:name,RATE:rate}),ext('setParticleVelocity',{NAME:name,X:velocity[0],Y:velocity[1],Z:velocity[2],SPREAD:spread}),
        ext('setParticleAcceleration',{NAME:name,X:accel[0],Y:accel[1],Z:accel[2]}),ext('setParticleLifetime',{NAME:name,MINIMUM:lifetime[0],MAXIMUM:lifetime[1]}),
        ext('setParticleSizeOverLife',{NAME:name,START:size[0],END:size[1]}),ext('setParticleColorOverLife',{NAME:name,START:color[0],END:color[1]}),
        ext('setParticleAlphaOverLife',{NAME:name,START:alpha,END:0}),ext('setParticleRotation',{NAME:name,MINIMUM:0,MAXIMUM:360,ANGULARMINIMUM:-40,ANGULARMAXIMUM:60})
    ];
    world.push(...emitter('wood debris','debris',64,0,[.2,.5],[.055,.015],['#c09867','#d5bea2'],[0,1.1,0],2.2,[0,-5,0],90),
        ...emitter('metal sparks','streak',32,0,[.1,.28],[.12,.01],['#fff3c7','#dc9e54'],[0,1.3,0],3,[0,-7,0],95),
        ...emitter('floor dust','dust',72,0,[.25,.7],[.1,.5],['#cbbfae','#e5dfd0'],[0,.35,0],.6,[.25,.1,0],35),
        ...emitter('ambient pollen','mote',80,7,[3,6],[.045,.015],['#e1e9df','#c5d6d7'],[.25,.08,.08],.14,[0,0,0],50),
        ext('setParticleSpawnShape',{NAME:'ambient pollen',SHAPE:'box',X:12,Y:2.5,Z:13}),pos('ambient pollen',0,2.3,0),
        ...emitter('orb motes','mote',28,5,[.5,1.3],[.045,.005],['#97d4d5','#d2e9db'],[0,.2,0],.15,[0,.15,0],65),
        ext('setParticleSpawnShape',{NAME:'orb motes',SHAPE:'sphere',X:.65,Y:.65,Z:.65}),
        ...emitter('blade trail','mote',24,0,[.055,.11],[.08,.005],['#e5f6f2','#bededd'],[0,0,0],.02,[0,0,0],24)
    );
    for(const name of ['ambient pollen','orb motes'])world.push(ext('startParticleEmitter',{NAME:name}));
    for(const [name,asset,volume] of [['knife whoosh','whoosh sound',.42],['wood impact','impact sound',.46],['dojo ambience','ambient sound',.13]])world.push(ext('createAudioSource',{NAME:name,ASSET:asset,MODE:'global'}),ext('setAudioNumber',{NAME:name,PROPERTY:'volume',VALUE:volume}));
    world.push(ext('setAudioLoop',{NAME:'dojo ambience',ENABLED:'on'}),ext('unlockAudio'),ext('controlAudioSource',{NAME:'dojo ambience',ACTION:'play'}),
        ext('setPostProcessing',{ENABLED:'on'}),ext('setVignetteFactor',{PROPERTY:'intensity',VALUE:.035}),ext('setPostColorFactor',{PROPERTY:'contrast',VALUE:1.015}),ext('setPostColorFactor',{PROPERTY:'saturation',VALUE:1.02}),ext('setFxaa',{ENABLED:'on'}));
    builder.hat('receive',world,500,64,'WORLD\nSmooth oval perimeter, open sky, two raised routes, cover, slide gate, torii and banners. Static geometry batches by material. Sun and sky provide visibility.','BUILD WORLD');
    const body=(name,p,s,type='static')=>[
        ext('createPhysicsBox',{NAME:name,TYPE:type,WIDTH:s[0],HEIGHT:s[1],DEPTH:s[2]}),ext('setPhysicsVector',{NAME:name,PROPERTY:'position',X:p[0],Y:p[1],Z:p[2]})
    ];
    const physics=[ext('setPhysicsGravity',{X:0,Y:-9.81,Z:0}),...body('floor body',[0,-.25,0],[28,.5,32])];
    for(const b of solids)physics.push(...body(b.name+' body',[b.x,b.y,b.z],[b.w,b.h,b.d]));
    // Translation-only physics uses conservative short AABB segments at the perimeter.
    for(let i=0;i<64;i++){const a=i/64*Math.PI*2;physics.push(...body('boundary '+i,[14*Math.sin(a),2.7,16*Math.cos(a)],[1.1,5.4,1.1]));}
    for(const [name,p,s,mass,bounce,friction] of [
        ['light crate 1',[0,.55,2.35],[1.25,1,1.08],.75,.18,.62],['light crate 2',[1.45,.55,1.15],[1.25,1,1.08],.9,.22,.6],['heavy crate',[-1.25,.55,-.3],[1.35,1.08,1.16],4.5,.08,.82]
    ])physics.push(...body(name,p,s,'dynamic'),ext('attachPhysicsBody',{NAME:name,OBJECT:name,X:0,Y:0,Z:0}),ext('setPhysicsNumber',{NAME:name,PROPERTY:'mass',VALUE:mass}),ext('setPhysicsNumber',{NAME:name,PROPERTY:'restitution',VALUE:bounce}),ext('setPhysicsNumber',{NAME:name,PROPERTY:'friction',VALUE:friction}));
    physics.push(ext('createPhysicsSphere',{NAME:'shield target',TYPE:'dynamic',RADIUS:.58}),ext('attachPhysicsBody',{NAME:'shield target',OBJECT:'shield target',X:0,Y:0,Z:0}),ext('setPhysicsNumber',{NAME:'shield target',PROPERTY:'mass',VALUE:.55}),ext('setPhysicsNumber',{NAME:'shield target',PROPERTY:'restitution',VALUE:.58}),ext('setPhysicsNumber',{NAME:'shield target',PROPERTY:'friction',VALUE:.35}));
    builder.hat('receive',physics,500,750,'PROP PHYSICS\nReal translation-based crate/shield rigid bodies. Authored player controller shares the visible architectural solids and uses smooth shallow steps.','SETUP PHYSICS');
    const targets=['light crate 1','light crate 2','heavy crate','shield target'];
    const dustBurst=count=>[pos('floor dust',V('player x'),A(V('player y'),.06),V('player z')),ext('burstParticles',{NAME:'floor dust',COUNT:count})];
    const horizontalOverlap=b=>And(Lt(abs(B(V('player x'),b.x)),b.w/2+.27),Lt(abs(B(V('player z'),b.z)),b.d/2+.27));
    const resetTargets=[...resetState,...[['light crate 1',0,.55,2.35],['light crate 2',1.45,.55,1.15],['heavy crate',-1.25,.55,-.3],['shield target',2.45,1.48,-.1]].flatMap(([name,x,y,z])=>[
        ext('setPhysicsVector',{NAME:name,PROPERTY:'position',X:x,Y:y,Z:z}),ext('setPhysicsVector',{NAME:name,PROPERTY:'velocity',X:0,Y:0,Z:0}),ext('setResourceTint',{RESOURCE:name,COLOR:'#ffffff',OPACITY:100})
    ]),S('previous time',timer)];
    proc('RESET PLAYER AND TARGETS',resetTargets,'Reset input, motion, jump/slide gates, FOV, camera, weapon pose and all four physics targets. Activity counters survive resets.');

    proc('READ INPUT',[
        S('wish x',0),S('wish z',0),S('sprinting',0),S('crouching',0),
        If(K('w'),[C('wish z',1)]),If(K('s'),[C('wish z',-1)]),If(K('d'),[C('wish x',1)]),If(K('a'),[C('wish x',-1)]),
        If(Or(K('shift'),K('q')),[S('sprinting',1)]),If(Or(K('c'),K('control')),[S('crouching',1)]),
        If(K('left arrow'),[C('yaw',M(115,V('dt')))]),If(K('right arrow'),[C('yaw',M(-115,V('dt')))]),
        If(K('up arrow'),[C('pitch',M(85,V('dt')))]),If(K('down arrow'),[C('pitch',M(-85,V('dt')))]),S('pitch',clamp(V('pitch'),-78,78)),
        S('wish length',sqrt(A(M(V('wish x'),V('wish x')),M(V('wish z'),V('wish z'))))),
        If(Gt(V('wish length'),0),[S('wish x',Div(V('wish x'),V('wish length'))),S('wish z',Div(V('wish z'),V('wish length')))]),
        S('old x',V('wish x')),S('old z',V('wish z')),
        S('wish x',B(M(V('old x'),cos(V('yaw'))),M(V('old z'),sin(V('yaw'))))),
        S('wish z',B(M(M(V('old x'),-1),sin(V('yaw'))),M(V('old z'),cos(V('yaw'))))),
        Else(K('space'),[If(Eq(V('jump held'),0),[S('jump request',1)]),S('jump held',1)],[S('jump held',0)]),
        If(Eq(V('jump request'),1),[S('jump buffer',.11),S('jump request',0)]),
        Else(Or(K('f'),mouseDown),[If(Eq(V('attack held'),0),[S('attack request',1)]),S('attack held',1)],[S('attack held',0)]),
        If(K('r'),[If(Eq(V('reset held'),0),[S('reset request',1)]),S('reset held',1)]),If(Eq(K('r'),false),[S('reset held',0)]),
        ...[0,1,2,3,4].map(n=>If(K(String(n)),[S('view mode',n)])),
        S('blocked stand',0),
        ...solids.filter(b=>b.y-b.h/2>.5).map(b=>If(And(horizontalOverlap(b),And(Lt(V('player y'),b.y+b.h/2-.01),And(Gt(A(V('player y'),1.78),b.y-b.h/2),Gt(b.y-b.h/2,A(V('player y'),.85))))),[S('blocked stand',1)])),
        If(Eq(V('blocked stand'),1),[S('crouching',1)]),
        If(And(Eq(V('crouching'),1),And(Eq(V('crouch held'),0),And(Eq(V('grounded'),1),And(Eq(V('sprinting'),1),And(Gt(V('speed'),5),Lt(V('slide cooldown'),.001)))))),[
            S('slide time',.78),S('slide cooldown',1.22),S('slide speed',10.5),
            S('slide x',Div(V('vx'),V('speed'))),S('slide z',Div(V('vz'),V('speed'))),C('slides',1),...dustBurst(12)
        ]),S('crouch held',V('crouching')),
        S('body height',1.78),If(Eq(V('crouching'),1),[S('body height',.95)]),If(Gt(V('slide time'),0),[S('body height',.8)]),
        If(And(Gt(V('jump buffer'),0),And(Gt(V('coyote'),0),Eq(V('blocked stand'),0))),[
            S('vy',6.8),S('grounded',0),S('coyote',0),S('jump buffer',0),S('slide time',0),C('jumps',1)
        ])
    ],'Only request hats exist. WASD uses yaw-only horizontal vectors. Shift (Q fallback) sprints. C/Control crouches; moving sprint + crouch starts a latched slide. Jump is edge-triggered and buffered.');
    const axisCollision=axis=>solids.map(b=>If(And(horizontalOverlap(b),And(Lt(V('player y'),b.y+b.h/2-.002),Gt(A(V('player y'),V('body height')),b.y-b.h/2+.002))),[
        Else(And(Lt(b.y+b.h/2,A(V('player y'),.241)),And(Lt(V('vy'),.01),Eq(V('grounded'),1))),
            [S('player y',b.y+b.h/2),C('step count',1)],
            [S('player '+axis,V('old '+axis)),S('v'+axis,0)])
    ]));
    proc('HORIZONTAL SUBSTEP',[
        S('old x',V('player x')),C('player x',M(V('vx'),V('half dt'))),...axisCollision('x'),
        S('old z',V('player z')),C('player z',M(V('vz'),V('half dt'))),...axisCollision('z'),
        S('wish length',sqrt(A(M(Div(V('player x'),13.48),Div(V('player x'),13.48)),M(Div(V('player z'),15.48),Div(V('player z'),15.48))))),
        If(Gt(V('wish length'),1),[S('player x',Div(V('player x'),V('wish length'))),S('player z',Div(V('player z'),V('wish length'))),S('vx',M(V('vx'),.7)),S('vz',M(V('vz'),.7))])
    ],'Two swept axis substeps per tick stop tunneling through cover. Shallow 0.20 m stairs step up only while grounded. The exact oval boundary is analytic.');
    proc('MOVE PLAYER',[
        S('target speed',4.5),If(Eq(V('sprinting'),1),[S('target speed',8)]),If(Eq(V('crouching'),1),[S('target speed',2.3)]),
        S('accel',clamp(M(17,V('dt')),0,1)),If(Eq(V('grounded'),0),[S('accel',clamp(M(3.2,V('dt')),0,1))]),
        Else(Gt(V('slide time'),0),[
            S('slide speed',clamp(B(V('slide speed'),M(6.5,V('dt'))),0,10.5)),
            S('vx',M(V('slide x'),V('slide speed'))),S('vz',M(V('slide z'),V('slide speed')))
        ],[
            C('vx',M(B(M(V('wish x'),V('target speed')),V('vx')),V('accel'))),
            C('vz',M(B(M(V('wish z'),V('target speed')),V('vz')),V('accel')))
        ]),
        S('half dt',Div(V('dt'),2)),repeat(2,[call('HORIZONTAL SUBSTEP')]),
        S('ground height',0),...solids.map(b=>If(And(horizontalOverlap(b),And(Lt(b.y+b.h/2,A(V('player y'),.04)),Gt(b.y+b.h/2,V('ground height')))),[S('ground height',b.y+b.h/2)])),
        C('vy',M(-18,V('dt'))),C('player y',M(V('vy'),V('dt'))),
        // Ceilings stop upward motion as well as standing/crouching transitions.
        ...solids.filter(b=>b.y-b.h/2>.5).map(b=>If(And(Gt(V('vy'),0),And(horizontalOverlap(b),And(Lt(V('player y'),b.y-b.h/2),Gt(A(V('player y'),V('body height')),b.y-b.h/2)))),[S('player y',B(b.y-b.h/2,V('body height'))),S('vy',0)])),
        Else(And(Lt(V('player y'),A(V('ground height'),.002)),Lt(V('vy'),.01)),[
            If(Eq(V('grounded'),0),[S('landing',clamp(M(abs(V('vy')),.014),0,.12)),C('landings',1),If(Lt(V('vy'),-4),dustBurst(9))]),
            S('player y',V('ground height')),S('vy',0),S('grounded',1),S('coyote',.085)
        ],[S('grounded',0)]),
        S('speed',sqrt(A(M(V('vx'),V('vx')),M(V('vz'),V('vz'))))),
        S('state','idle'),If(Gt(V('speed'),.2),[S('state','walk')]),If(And(Eq(V('sprinting'),1),Gt(V('speed'),4.8)),[S('state','sprint')]),
        If(Eq(V('crouching'),1),[S('state','crouch')]),If(Gt(V('slide time'),0),[S('state','slide')]),If(Eq(V('grounded'),0),[S('state','airborne')]),If(Gt(V('vy'),.1),[S('state','jump')])
    ],'Project-level kinematic player: bounded acceleration, weak air control, gravity, support detection, collision-height crouch, coyote/buffered jumps and decaying slides. Props retain Eclipse rigid-body physics.');
    const impact=[
        S('impulse',4.9),S('lift',2.25),If(Eq(V('last hit'),'heavy crate'),[S('impulse',2.05),S('lift',1.05)]),
        Else(Eq(V('last hit'),'floating orb'),[S('orbit hit',.65)],[ext('setPhysicsVector',{NAME:V('last hit'),PROPERTY:'velocity',X:M(Basis('forward','x'),V('impulse')),Y:V('lift'),Z:M(Basis('forward','z'),V('impulse'))})]),
        ext('setResourceTint',{RESOURCE:V('last hit'),COLOR:'#f6ca88',OPACITY:100}),
        S('hit x',rayNumber('x')),S('hit y',rayNumber('y')),S('hit z',rayNumber('z')),
        Else(Or(Eq(V('last hit'),'shield target'),Eq(V('last hit'),'floating orb')),[pos('metal sparks',V('hit x'),V('hit y'),V('hit z')),ext('burstParticles',{NAME:'metal sparks',COUNT:9})],[
            pos('wood debris',V('hit x'),V('hit y'),V('hit z')),
            ext('setParticleVelocity',{NAME:'wood debris',X:M(Basis('forward','x'),1.3),Y:1.2,Z:M(Basis('forward','z'),1.3),SPREAD:1.5}),ext('burstParticles',{NAME:'wood debris',COUNT:14})]),
        ext('controlAudioSource',{NAME:'wood impact',ACTION:'play'}),C('hits',1)
    ];
    proc('APPLY HIT',impact,'A single per-swing latch preserves short-range, mass-sensitive physical combat. Wood produces chips, metal produces short sparks. The hovering target reacts through its authored motion.');
    const samples=[...targets,'floating orb'].flatMap(target=>[0,.24].map(offset=>If(Eq(V('last hit'),''),[
        S('ray sample',offset?'low':'chest'),ext('castWorldRay',{X:PA(pose.rayOrigin,'x'),Y:B(PA(pose.rayOrigin,'y'),offset),Z:PA(pose.rayOrigin,'z'),DX:Basis('forward','x'),DY:Basis('forward','y'),DZ:Basis('forward','z'),DISTANCE:pose.rayLength,FILTER:'name:'+target}),
        S('ray object',rayText('object')),S('ray distance',rayNumber('distance')),
        If(E('rayHit'),[S('last hit',target),S('last impact',target),S('last impact sample',V('ray sample')),call('APPLY HIT')])
    ])));
    proc('ATTACK STATE',[
        If(And(Eq(V('attack request'),1),Eq(V('attacking'),0)),[
            S('attacking',1),S('attack time',0),S('last hit',''),S('whoosh played',0),C('swings',1)]),S('attack request',0),
        If(Eq(V('attacking'),1),[
            Else(Eq(V('rig ready'),1),[
                If(Eq(V('viewmodel clip'),pose.clips.Attack_1),[S('attack time',E('animationTime',{INSTANCE:'knife viewmodel'}))])
            ],[C('attack time',V('dt'))]),
            If(And(Gt(V('attack time'),.13),Eq(V('whoosh played'),0)),[ext('controlAudioSource',{NAME:'knife whoosh',ACTION:'play'}),S('whoosh played',1)]),
            If(Gt(V('attack time'),pose.duration-.000001),[S('attacking',0),S('attack time',0),...[...targets,'floating orb'].map(name=>ext('setResourceTint',{RESOURCE:name,COLOR:'#ffffff',OPACITY:100}))])
        ])
    ],'Attack 1 uses the skeletal clock when loaded, otherwise project dt: wind-up, whoosh at 0.13 s, contact at 0.18-0.235 s, recovery by 0.50 s. No procedural whole-rig slash. One request per press; one hit latch per swing.');
    proc('MELEE SAMPLES',[If(And(Gt(V('attack time'),pose.activeStart),Lt(V('attack time'),pose.activeEnd)),samples)],'Knife-only reach: 0.12 m origin + 1.05 m sample. Chest and low rays share the same short reach and one per-swing hit latch.');
    proc('VIEWMODEL ANIMATION',[
        S('desired clip',pose.clips.Idle),S('clip blend',.12),
        If(Gt(V('speed'),.3),[S('desired clip',pose.clips.Walk)]),
        If(And(Eq(V('sprinting'),1),Gt(V('speed'),4.5)),[S('desired clip',pose.clips.Run)]),
        If(Gt(V('slide time'),0),[S('desired clip',pose.clips.Idle)]),
        If(Eq(V('grounded'),0),[S('desired clip',pose.clips.Jump)]),
        If(Or(Eq(V('viewmodel clip'),''),And(Eq(V('viewmodel clip'),pose.clips.Draw),Eq(E('animationFinished',{INSTANCE:'knife viewmodel'}),false))),[S('desired clip',pose.clips.Draw)]),
        If(Eq(V('attacking'),1),[S('desired clip',pose.clips.Attack_1),S('clip blend',.055)]),
        If(Eq(Eq(V('viewmodel clip'),V('desired clip')),false),[
            ext('crossfadeAnimation',{INSTANCE:'knife viewmodel',CLIP:V('desired clip'),SECONDS:V('clip blend')}),
            Else(Or(Eq(V('desired clip'),pose.clips.Attack_1),Or(Eq(V('desired clip'),pose.clips.Draw),Eq(V('desired clip'),pose.clips.Jump))),[
                ext('setAnimationLooping',{INSTANCE:'knife viewmodel',LOOPING:'off'})],[ext('setAnimationLooping',{INSTANCE:'knife viewmodel',LOOPING:'on'})]),
            S('viewmodel clip',V('desired clip'))
        ])
    ],'State changes select genuine KnifeFPS clips. Bone-pose crossfades use the supported Eclipse API. Finger grip and Hand_R > Gun skin attachment remain authored. Airborne attack has priority. No per-frame seek or duplicate animation clock.');
    proc('ATAN2',[
        Else(Gt(abs(V('atan x')),.0000001),[
            S('atan result',math('atan',Div(V('atan y'),V('atan x')))),If(Lt(V('atan x'),0),[Else(Lt(V('atan y'),0),[C('atan result',-180)],[C('atan result',180)])])
        ],[Else(Lt(V('atan y'),0),[S('atan result',-90)],[S('atan result',90)])])
    ],'Quadrant-safe atan2 for camera basis to model XYZ Euler conversion. Camera and model use different Euler orders; copying and adding Euler values is not rotation composition.');
    proc('PRESENT CAMERA AND WEAPON',[
        S('height target',1.65),If(Eq(V('crouching'),1),[S('height target',.84)]),If(Gt(V('slide time'),0),[S('height target',.67)]),
        C('eye height',M(B(V('height target'),V('eye height')),clamp(M(18,V('dt')),0,1))),
        S('fov target',76),If(And(Eq(V('sprinting'),1),Gt(V('speed'),4.5)),[C('fov target',7)]),If(Gt(V('slide time'),0),[S('fov target',85)]),
        If(Gt(V('vy'),1),[C('fov target',1.2)]),If(And(Gt(V('attack time'),pose.activeStart),Lt(V('attack time'),pose.activeEnd)),[C('fov target',2.2)]),C('fov target',M(V('landing'),-12)),
        C('fov',M(B(V('fov target'),V('fov')),clamp(M(9,V('dt')),0,1))),
        pos('main',V('player x'),B(A(V('player y'),V('eye height')),V('landing')),V('player z')),rot('main',V('pitch'),V('yaw'),0),ext('setCameraFov',{CAMERA:'main',FOV:V('fov')}),
        ...[[1,[14,23,24],[0,1,-1],43],[2,[0,1.65,6.8],[0,1.8,-4],76],[3,[11,7,12],[0,1,-3],74],[4,[-9,5.8,9],[0,5,-11],75]].map(([n,p,target,fov])=>If(Eq(V('view mode'),n),[pos('main',...p),ext('lookCameraAt',{CAMERA:'main',X:target[0],Y:target[1],Z:target[2]}),ext('setCameraFov',{CAMERA:'main',FOV:fov})])),
        If(Eq(V('rig ready'),1),[
        Else(Eq(V('view mode'),0),[ext('setResourceVisible',{RESOURCE:'knife viewmodel',ENABLED:'on'})],[ext('setResourceVisible',{RESOURCE:'knife viewmodel',ENABLED:'off'})]),
        // Camera basis * fixed local Ry(180): original GLB +Z forward becomes camera -Z.
        S('m00',M(Basis('right','x'),-1)),S('m01',Basis('up','x')),S('m02',Basis('forward','x')),
        S('m11',Basis('up','y')),S('m12',Basis('forward','y')),S('m21',Basis('up','z')),S('m22',Basis('forward','z')),
        S('model ry',math('asin',clamp(V('m02'),-1,1))),
        Else(Lt(abs(V('m02')),.9999999),[
            S('atan y',M(V('m12'),-1)),S('atan x',V('m22')),call('ATAN2'),S('model rx',V('atan result')),
            S('atan y',M(V('m01'),-1)),S('atan x',V('m00')),call('ATAN2'),S('model rz',V('atan result'))
        ],[S('atan y',V('m21')),S('atan x',V('m11')),call('ATAN2'),S('model rx',V('atan result')),S('model rz',0)]),
        S('weapon target right',0),S('weapon target up',M(V('landing'),-.55)),
        // Walk/run/jump sway comes from the skeleton; only small stance/landing offsets remain.
        If(Eq(V('crouching'),1),[C('weapon target up',-.008)]),
        If(Gt(V('slide time'),0),[C('weapon target up',-.022),C('weapon target right',.012)]),
        ...['right','up'].flatMap(axis=>[
            If(Lt(abs(V('weapon target '+axis)),.00001),[S('weapon target '+axis,0)]),
            C('weapon offset '+axis,M(B(V('weapon target '+axis),V('weapon offset '+axis)),clamp(M(14,V('dt')),0,1))),
            If(Lt(abs(B(V('weapon offset '+axis),V('weapon target '+axis))),.00001),[S('weapon offset '+axis,V('weapon target '+axis))])
        ]),
        S('weapon right',A(V('weapon base right'),V('weapon offset right'))),S('weapon up',A(V('weapon base up'),V('weapon offset up'))),
        pos('knife viewmodel',PA(M(V('weapon ahead'),V('weapon depth scale')),'x'),PA(M(V('weapon ahead'),V('weapon depth scale')),'y'),PA(M(V('weapon ahead'),V('weapon depth scale')),'z')),
        ext('moveResourceByCamera',{RESOURCE:'knife viewmodel',CAMERA:'main',AXIS:'right',DISTANCE:M(V('weapon right'),V('weapon depth scale'))}),
        ext('moveResourceByCamera',{RESOURCE:'knife viewmodel',CAMERA:'main',AXIS:'up',DISTANCE:M(V('weapon up'),V('weapon depth scale'))}),
        rot('knife viewmodel',V('model rx'),V('model ry'),V('model rz')),
        call('VIEWMODEL ANIMATION')]),
        If(And(Gt(V('attack time'),pose.activeStart),Lt(V('attack time'),pose.activeEnd)),[
            pos('blade trail',PA(.7,'x'),PA(.7,'y'),PA(.7,'z')),
            ext('moveResourceByCamera',{RESOURCE:'blade trail',CAMERA:'main',AXIS:'right',DISTANCE:A(-.2,M(B(V('attack time'),pose.activeStart),8))}),
            ext('burstParticles',{NAME:'blade trail',COUNT:2})])
    ],'Final camera and contextual FOV first, then ONE camera-relative KnifeFPS root, then skeletal state. Fixed Ry(180) preserves handedness. Whole-rig scale and placement compress together; crop boundaries stay below the viewport. Stance offsets return exactly to zero.');
    proc('ENVIRONMENT MOTION',[
        pos('floating orb',A(-4.6,M(sin(M(V('world time'),32)),.45)),A(3.45,A(M(sin(M(V('world time'),90)),.22),M(V('orbit hit'),.8))),-3.2),
        rot('floating orb',15,M(V('world time'),24),12),
        pos('orb ring',A(-4.6,M(sin(M(V('world time'),32)),.45)),A(3.45,M(sin(M(V('world time'),90)),.22)),-3.2),
        rot('orb ring',60,0,M(V('world time'),12)),
        pos('orb motes',A(-4.6,M(sin(M(V('world time'),32)),.45)),A(3.45,M(sin(M(V('world time'),90)),.22)),-3.2),
        pos('floating charm',5.1,A(3.8,M(sin(A(70,M(V('world time'),64))),.18)),-6),rot('floating charm',0,M(V('world time'),18),15),
        rot('banner left',M(sin(M(V('world time'),82)),5),0,M(sin(M(V('world time'),47)),3)),
        rot('banner right',M(sin(A(40,M(V('world time'),79))),5),0,M(sin(A(50,M(V('world time'),44))),3))
    ],'A moving, hittable hovering orb; a second bobbing charm; localized motes and restrained cloth sway. World time advances only in the one project loop.');
    proc('FRAME',[
        S('dt',clamp(B(timer,V('previous time')),.001,.04)),S('previous time',timer),C('world time',V('dt')),
        ...['jump buffer','coyote','slide time','slide cooldown','orbit hit'].map(name=>S(name,clamp(B(V(name),V('dt')),0,10))),
        S('landing',M(V('landing'),clamp(B(1,M(12,V('dt'))),0,1))),
        call('READ INPUT'),If(Eq(V('reset request'),1),[call('RESET PLAYER AND TARGETS')]),
        If(Eq(V('view mode'),0),[call('MOVE PLAYER')]),
        If(Eq(V('view mode'),0),[call('ATTACK STATE')]),call('PRESENT CAMERA AND WEAPON'),If(Eq(V('view mode'),0),[call('MELEE SAMPLES')]),call('ENVIRONMENT MOTION'),
        S('fps',E('currentFps'))
    ],'A single non-yielding frame controls input, simulation, combat and final transforms. No explicit wait doubles the frame period. dt is capped after scheduling stalls. Stop freezes all engine and authored motion.');
    builder.hat('receive',[forever([call('FRAME')])],40,1250,'ONE FRAME OWNER\nA warp procedure samples input, integrates movement, evaluates attack, then publishes camera and camera-relative weapon once. The outer loop yields once per Scratch frame.','START GAME');
    const hudBuilder=new ProjectBuilder({},broadcasts);hudBuilder.variableIds=builder.variableIds;hudBuilder.broadcastIds=builder.broadcastIds;hudBuilder.broadcasts={};
    hudBuilder.hat('flag',[forever([Else(Eq(V('rig loading'),1),[
        {kind:'costume',name:'Loading viewmodel'}
    ],[Else(Eq(V('rig ready'),1),[{kind:'costume',name:'Knife HUD'}],[{kind:'costume',name:'Optional viewmodel'}])])])],900,64,
    'The optional-viewmodel note stays in the HUD while gameplay runs. I opens the picker; cancellation returns to the note.');
    builder.hat('key',[If(And(Eq(V('game ready'),1),And(Eq(V('rig ready'),0),Eq(V('rig loading'),0))),[
        S('rig loading',1),S('import message','Select KnifeFPS.glb, or cancel to keep playing.'),
        ext('importModelFile',{MODEL:'knife asset'}),
        If(Eq(E('modelState',{MODEL:'knife asset'}),'ready'),[
            If(Eq(Eq(E('modelAnimationText',{MODEL:'knife asset',INDEX:1}),pose.clips.Attack_1),false),[ext('deleteModelAsset',{MODEL:'knife asset'})])
        ]),
        Else(Eq(E('modelState',{MODEL:'knife asset'}),'ready'),[
            ...model('knife viewmodel','knife asset',[0,0,0],[pose.depthScale,pose.depthScale,pose.depthScale]),
            ext('setResourceFrustumCulling',{RESOURCE:'knife viewmodel',ENABLED:'off'}),
            ext('setResourceCastsShadows',{RESOURCE:'knife viewmodel',ENABLED:'off'}),
            S('viewmodel clip','loaded'),S('rig ready',1),call('VIEWMODEL ANIMATION'),
            If(Eq(V('attacking'),1),[ext('setAnimationTime',{INSTANCE:'knife viewmodel',SECONDS:V('attack time')})]),
            S('import message','')
        ],[S('import message',initial['import message'])]),S('rig loading',0)
    ])],40,1600,'OPTIONAL VIEWMODEL\nOne import at a time. Cancel leaves gameplay running. Successful import creates one rig and selects the current movement/attack state. Green Flag starts without it again.','i');
    hudBuilder.hat('spriteClick',[If(Eq(V('game ready'),1),[ext('unlockAudio'),ext('controlAudioSource',{NAME:'dojo ambience',ACTION:'resume'}),S('attack request',1)])],64,64,'Stage click queues attack and unlocks audio. It never writes player or weapon transforms.');
    for(const [key,name] of [['space','jump request'],['f','attack request'],['r','reset request']])builder.hat('key',[S(name,1)],40,1700+100*['space','f','r'].indexOf(key),'Input request only; the authoritative frame consumes this event.',key);
    for(const n of [0,1,2,3,4])builder.hat('key',[S('view mode',n)],500,1700+100*n,'Select a reproducible composition view. 0 returns to play; only FRAME writes the camera.',String(n));
    builder.comments.arena_config={blockId:null,x:40,y:2100,width:400,height:130,minimized:true,text:'Configuration for https://turbowarp.org/\n{"framerate":60,"width":640,"height":360} // _twconfig_'};
    // Long connected procedures need separate columns; fixed vertical rows overlap.
    let column=0,inputRow=0;
    for(const block of Object.values(builder.blocks).filter(b=>b.topLevel)){
        const code=builder.blocks[block.inputs?.custom_block?.[1]]?.mutation?.proccode;
        const start=block.fields?.BROADCAST_OPTION?.[0]==='START GAME';
        if(code==='FRAME'){block.x=40;block.y=64;}
        else if(start){block.x=1840;block.y=64;}
        else if(block.opcode==='event_whenkeypressed'){block.x=1840;block.y=500+inputRow++*200;}
        else {block.x=3640+3000*column++;block.y=64;}
        if(block.comment){const comment=builder.comments[block.comment];comment.x=block.x+750;comment.y=block.y;comment.minimized=true;}
    }
    return {builder,hudBuilder};
}


