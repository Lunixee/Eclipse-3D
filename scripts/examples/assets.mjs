// Small original teaching assets, independent of benchmark/regression fixtures.
export const makeTone = () => {
    const rate = 16000, count = rate, data = Buffer.alloc(44 + count * 2);
    data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
    data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
    data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
    data.write('data', 36); data.writeUInt32LE(count * 2, 40);
    for (let i = 0; i < count; i++) {
        const t = i / rate, envelope = Math.sin(Math.PI * t) ** 2;
        data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * t) * envelope * 5000), 44 + i * 2);
    }
    return data;
};

export const makeRotorGlb = () => {
    const positions = new Float32Array([-0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5,
        -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5]);
    const indices = new Uint16Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,1,2,6,1,6,5,0,4,7,0,7,3]);
    const times = new Float32Array([0,1,2,3,4]);
    const rotations = new Float32Array(Array.from({length:5}, (_,i) => [0,0,Math.sin(i*Math.PI/4),Math.cos(i*Math.PI/4)]).flat());
    const chunks = [positions,indices,times,rotations], views = []; let offset = 0;
    for (const chunk of chunks) { views.push({buffer:0,byteOffset:offset,byteLength:chunk.byteLength}); offset += chunk.byteLength; }
    const doc = {asset:{version:'2.0',generator:'Eclipse 3D original rotor example'}, scene:0,scenes:[{nodes:[0]}],
        nodes:[{name:'Stand',mesh:1,translation:[0,0.7,0],scale:[0.18,1.4,0.18]},
            {name:'Rotor',translation:[0,1.65,0.12],children:[2,3,4]},
            ...Array.from({length:3},(_,i)=>({name:`Blade ${i+1}`,mesh:0,
                translation:[Math.cos(i*2*Math.PI/3)*0.65,Math.sin(i*2*Math.PI/3)*0.65,0],
                rotation:[0,0,Math.sin(i*Math.PI/3),Math.cos(i*Math.PI/3)],scale:[1.4,0.3,0.12]}))],
        meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]},{primitives:[{attributes:{POSITION:0},indices:1,material:1}]}],
        materials:[{name:'Ceramic blades',pbrMetallicRoughness:{baseColorFactor:[0.55,0.85,0.87,1],metallicFactor:0.15,roughnessFactor:0.45}},
            {name:'Indigo stand',pbrMetallicRoughness:{baseColorFactor:[0.16,0.23,0.4,1],metallicFactor:0.2,roughnessFactor:0.5}}],
        buffers:[{byteLength:offset}],bufferViews:views,accessors:[
            {bufferView:0,componentType:5126,count:8,type:'VEC3',min:[-0.5,-0.5,-0.5],max:[0.5,0.5,0.5]},
            {bufferView:1,componentType:5123,count:36,type:'SCALAR'},
            {bufferView:2,componentType:5126,count:5,type:'SCALAR',min:[0],max:[4]},
            {bufferView:3,componentType:5126,count:5,type:'VEC4'}],
        animations:[{name:'Spin',samplers:[{input:2,output:3,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]}]};
    doc.scenes[0].nodes.push(1);
    const json = Buffer.from(JSON.stringify(doc)), jsonSize = (json.length+3)&~3, binary = Buffer.concat(chunks.map(a=>Buffer.from(a.buffer)));
    const out = Buffer.alloc(12+8+jsonSize+8+binary.length); out.writeUInt32LE(0x46546c67,0); out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
    out.writeUInt32LE(jsonSize,12);out.writeUInt32LE(0x4e4f534a,16);out.fill(32,20,20+jsonSize);json.copy(out,20);
    out.writeUInt32LE(binary.length,20+jsonSize);out.writeUInt32LE(0x004e4942,24+jsonSize);binary.copy(out,28+jsonSize);
    return out;
};

export const sparkSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="white"/></svg>';
