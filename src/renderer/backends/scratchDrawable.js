const preferredLayer = renderer => {
    const layers = renderer._layerGroups ? Object.keys(renderer._layerGroups) : [];
    if (layers.includes('background')) return 'background';
    if (layers.includes('sprite')) return 'sprite';
    throw new Error('Eclipse 3D could not find a compatible scratch-render layer');
};

export const createStageDrawable = (renderer, skinId) => {
    const layerGroup = preferredLayer(renderer);
    const drawableId = renderer.createDrawable(layerGroup);
    if (!Number.isInteger(drawableId)) throw new Error('scratch-render refused to create the 3D drawable');
    renderer.updateDrawableSkinId(drawableId, skinId);
    renderer.updateDrawablePosition(drawableId, [0, 0]);
    renderer.updateDrawableScale(drawableId, [100, 100]);
    renderer.updateDrawableVisible(drawableId, true);
    if (typeof renderer.markDrawableAsNoninteractive === 'function') {
        renderer.markDrawableAsNoninteractive(drawableId);
    }
    renderer.dirty = true;
    // Retain the creation group: scratch-render requires it again on destroy.
    return {drawableId, skinId, layerGroup};
};

export const destroyStageDrawable = (renderer, {drawableId, skinId, layerGroup}) => {
    if (Number.isInteger(drawableId)) renderer.destroyDrawable(drawableId, layerGroup);
    if (Number.isInteger(skinId)) renderer.destroySkin(skinId);
    renderer.dirty = true;
};

export const setStageDrawableVisible = (renderer, {drawableId, layerGroup}, visible) => {
    // A project reload appends a new opaque Stage after this retained drawable.
    // Re-establish order within our group on scene installation, never per frame.
    if (visible && typeof renderer.setDrawableOrder === 'function') {
        // scratch-render clamps to the pre-removal, exclusive group end. Infinity
        // can therefore cross into the next group and corrupt its destruction scan.
        const lastIndex = renderer._endIndexForKnownLayerGroup(renderer._layerGroups[layerGroup]) - 1;
        renderer.setDrawableOrder(drawableId, lastIndex, layerGroup);
    }
    renderer.updateDrawableVisible(drawableId, visible);
};
