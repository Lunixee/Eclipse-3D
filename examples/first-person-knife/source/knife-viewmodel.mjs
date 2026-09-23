// Whole-rig camera-local placement. The supplied GLB remains byte-for-byte intact.
export const knifePose = {
    base: {right: 0, up: -.20, ahead: .15, rotation: [0,180,0]},
    depthScale: .32,
    near: .015,
    activeStart: .18,
    activeEnd: .235,
    duration: .5,
    rayOrigin: .12,
    rayLength: 1.05,
    clips: Object.fromEntries(['Idle','Walk','Run','Jump','Draw','Attack_1'].map(n=>[n,`Armature|Knife_${n}_Anim`]))
};


