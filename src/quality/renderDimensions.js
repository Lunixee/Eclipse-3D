export const calculateRenderDimensions = (renderer, quality) => {
    const nativeSize = renderer.getNativeSize();
    const nativeWidth = Math.max(1, Number(nativeSize[0]) || 1);
    const nativeHeight = Math.max(1, Number(nativeSize[1]) || 1);
    const hostWidth = Math.max(1, Number(renderer.canvas.width) || 1);
    const hostHeight = Math.max(1, Number(renderer.canvas.height) || 1);
    const hostPixelRatio = Math.max(0.01, Math.min(hostWidth / nativeWidth, hostHeight / nativeHeight));
    const effectivePixelRatio = quality.maxPixelRatio > 0
        ? Math.min(hostPixelRatio, quality.maxPixelRatio)
        : hostPixelRatio;
    const scale = quality.effectiveRenderScale / 100;
    return {
        width: Math.max(1, Math.round(nativeWidth * effectivePixelRatio * scale)),
        height: Math.max(1, Math.round(nativeHeight * effectivePixelRatio * scale)),
        effectivePixelRatio
    };
};
