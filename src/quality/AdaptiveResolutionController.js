export class AdaptiveResolutionController {
    constructor() {
        this.overloadFrames = 0;
        this.headroomFrames = 0;
    }

    reset() {
        this.overloadFrames = 0;
        this.headroomFrames = 0;
    }

    sample(frameMilliseconds, quality) {
        if (!quality.adaptiveEnabled || !Number.isFinite(frameMilliseconds) || frameMilliseconds <= 0) {
            this.reset();
            return null;
        }
        const target = 1000 / quality.adaptiveTargetFps;
        if (frameMilliseconds > target * 1.15) {
            this.overloadFrames++;
            this.headroomFrames = 0;
        } else if (frameMilliseconds < target * 0.82) {
            this.headroomFrames++;
            this.overloadFrames = 0;
        } else {
            this.reset();
        }
        if (this.overloadFrames >= quality.adaptiveResponseFrames) {
            this.reset();
            return Math.max(quality.adaptiveMinimumScale, quality.adaptiveScale - 5);
        }
        if (this.headroomFrames >= quality.adaptiveResponseFrames * 2) {
            this.reset();
            return Math.min(quality.adaptiveMaximumScale, quality.adaptiveScale + 5);
        }
        return null;
    }
}
