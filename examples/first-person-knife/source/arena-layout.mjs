import {BoxGeometry, CylinderGeometry, TorusGeometry, BufferGeometry, Float32BufferAttribute, Matrix4, Euler} from 'three';

// One shared layout supplies both visible architecture and player/prop collision.
export const arena = {radiusX: 14, radiusZ: 16, wallHeight: 5.4};
export const solids = [];
const batches = new Map();
const add = (material, geometry) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
};
const box = (name, p, s, mat = 'chalk', solid = false, rotation = [0, 0, 0]) => {
    const g = new BoxGeometry(...s);
    g.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...rotation)));
    g.translate(...p); add(mat, g);
    if (solid) solids.push({name, x:p[0], y:p[1], z:p[2], w:s[0], h:s[1], d:s[2]});
};
const ring = (rx, rz, y, thickness, material) => {
    const g = new TorusGeometry(1, thickness, 4, 96);
    g.rotateX(Math.PI/2); g.scale(rx, 1, rz); g.translate(0,y,0); add(material,g);
};

const floor = new CylinderGeometry(1,1,.45,96);
floor.scale(arena.radiusX,1,arena.radiusZ); floor.translate(0,-.225,0); add('paving',floor);
const wall = new CylinderGeometry(1,1,arena.wallHeight,96,1,true);
wall.scale(arena.radiusX,1,arena.radiusZ); wall.translate(0,arena.wallHeight/2,0);
add('chalk',wall); // Double-sided plaster: a continuous curved silhouette.
ring(14,16,5.4,.018,'chalk');
ring(14,16,.13,.012,'warm trim');
ring(5.4,6.1,.012,.009,'court line');
ring(5.65,6.38,.014,.003,'court line');

// Two distinct circulation routes flank the open central combat court.
box('west deck',[-8, .8,-1.2],[4.8,1.6,7.4],'chalk',true);
box('west timber surface',[-8,1.62,-1.2],[4.74,.04,7.34],'wood');
box('east deck',[7.7,1.1,-4.2],[4.8,2.2,6.3],'chalk',true);
box('east timber surface',[7.7,2.22,-4.2],[4.72,.04,6.22],'wood');
// Actual shallow stairs; 0.20 m risers match the controller's 0.24 m step limit.
for(let i=0;i<8;i++) box(`west stair ${i}`,[-8,(i+1)*.1,6.5-i*.5],[3.1,(i+1)*.2,.51],'paving',true);
for(let i=0;i<11;i++) box(`east stair ${i}`,[7.7,(i+1)*.1,4.2-i*.5],[3,(i+1)*.2,.51],'paving',true);
box('north terrace',[0,.4,-11.4],[8,.8,3.6],'paving',true);
for(let i=0;i<4;i++)box(`north stair ${i}`,[0,(i+1)*.1,-8.2-i*.4],[3,(i+1)*.2,.41],'paving',true);

for(const [name,p,s] of [
    ['west cover',[-3.7,.58,3.1],[2.4,1.16,1.2]],
    ['east cover',[3.8,.68,3.4],[2.5,1.36,1.1]],
    ['north cover',[-.9,.72,-5.5],[3.2,1.44,1.25]],
    ['west overlook',[-9.6,2.22,-3],[1,1.24,2.8]],
    ['east overlook',[9.3,2.87,-5.3],[1,1.3,2.8]]
]) {box(name,p,s,'chalk',true);box(`${name} cap`,[p[0],p[1]+s[1]/2+.045,p[2]],[s[0]+.06,.09,s[2]+.06],'warm trim');}
// Slide passage is 1.15 m high: crouch/slide clears it, standing does not.
box('slide lintel',[-8,1.55,7.55],[3.25,.8,.48],'chalk',true);
box('slide pier left',[-9.8,1.15,7.55],[.38,2.3,.7],'chalk',true);
box('slide pier right',[-6.2,1.15,7.55],[.38,2.3,.7],'chalk',true);
box('slide route inlay',[-8,.012,8.5],[.12,.025,2.6],'court line');

// Tall side monuments frame the arena without filling its center.
box('west tower',[-10.3,2.2,-8],[2,4.4,2.2],'chalk',true);
box('east tower',[10.1,2.6,-9.2],[2,5.2,2.2],'chalk',true);
box('west tower inset',[-10.3,2.6,-6.87],[.7,2.4,.045],'teal');
box('east tower inset',[10.1,3,-8.07],[.7,2.4,.045],'teal');

// Warm wood torii, indigo cloth, rack, and understated lantern trim.
for(const x of [-2.65,2.65]) {
    box('torii post '+x,[x,2.75,-11.4],[.34,3.9,.4],'wood',true);
    box('torii shoe '+x,[x,.99,-11.4],[.5,.35,.55],'teal');
}
box('torii lintel',[0,4.58,-11.4],[6.8,.36,.58],'wood');
box('torii upper',[0,4.9,-11.4],[7.25,.22,.64],'warm trim');
box('torii crossbar',[0,3.83,-11.4],[5.8,.16,.25],'wood');
box('torii plaque',[0,4.2,-11.07],[.58,.7,.07],'teal');
for(const x of [-.13,.13])box('plaque mark '+x,[x,4.2,-11.02],[.06,.32,.01],'warm trim');
box('rack shelf',[-6.5,.85,-10.4],[2.6,.16,.65],'wood');
for(const x of [-7.55,-5.45])box('rack leg '+x,[x,.45,-10.4],[.16,.9,.5],'wood');
box('dummy post',[4,1.15,-8.5],[.25,2.3,.25],'wood');
box('dummy crossbar',[4,1.8,-8.5],[1.5,.2,.2],'warm trim');
box('target pedestal',[2.45,.42,-.1],[1.28,.84,1.18],'chalk',true);
box('target pedestal cap',[2.45,.87,-.1],[1.35,.08,1.24],'wood');
for(const [x,z] of [[-4.9,-11.8],[4.9,-11.8],[-11.5,1],[11.4,0]]) {
    box('lantern plinth',[x,.3,z],[.5,.6,.5],'chalk');
    box('lantern stem',[x,1.15,z],[.08,1.2,.08],'wood');
    box('lantern paper',[x,1.9,z],[.42,.6,.42],'paper');
    box('lantern cap',[x,2.22,z],[.59,.08,.59],'wood');
}

// Perimeter seams are sparse architectural joints, not a reference-image grid.
for(let i=0;i<32;i++) {
    const a=i/32*Math.PI*2;
    box('wall joint',[13.97*Math.sin(a),2.7,15.97*Math.cos(a)],[.035,5.3,.025],'joint',false,[0,a,0]);
}

export const arenaGeometry = [...batches].map(([material, parts])=>{
    const positions=[],normals=[],uvs=[];
    for(const g of parts){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);
        const p=g.attributes.position.array;
        for(let i=0;i<p.length;i+=3)uvs.push(p[i]/3,p[i+2]/3);
    }
    return {material,data:{positions,normals,uvs}};
});

export const primitiveData = geometry => {
    const g=geometry.index?geometry.toNonIndexed():geometry;
    return {positions:[...g.attributes.position.array],normals:[...g.attributes.normal.array],uvs:[...g.attributes.uv.array]};
};
export const bannerData = (()=>{
    const g=new BufferGeometry();
    g.setAttribute('position',new Float32BufferAttribute([-.45,0,0,.45,0,0,-.45,-1.7,0,.45,0,0,.34,-1.5,0,-.45,-1.7,0],3));
    g.setAttribute('uv',new Float32BufferAttribute([0,1,1,1,0,0,1,1,1,0,0,0],2));g.computeVertexNormals();return primitiveData(g);
})();
