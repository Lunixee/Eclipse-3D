import {JOINT_PALETTE_TEXTURE_UNIT} from './JointPaletteCache.js';

const enabled = (gl, capability) => gl.isEnabled(capability);
const TRACKED_TEXTURE_UNITS = JOINT_PALETTE_TEXTURE_UNIT + 1;

export class GLStateGuard {
    constructor(gl) {
        this.gl = gl;
    }

    capture() {
        const gl = this.gl;
        const activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        const activeTexture2D = gl.getParameter(gl.TEXTURE_BINDING_2D);
        const texture2D = new Array(TRACKED_TEXTURE_UNITS);
        for (let unit = 0; unit < TRACKED_TEXTURE_UNITS; unit++) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            texture2D[unit] = gl.getParameter(gl.TEXTURE_BINDING_2D);
        }
        gl.activeTexture(activeTexture);
        return {
            program: gl.getParameter(gl.CURRENT_PROGRAM),
            vertexArray: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
            arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
            drawFramebuffer: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
            readFramebuffer: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
            renderbuffer: gl.getParameter(gl.RENDERBUFFER_BINDING),
            activeTexture,
            activeTexture2D,
            texture2D,
            viewport: gl.getParameter(gl.VIEWPORT),
            scissorBox: gl.getParameter(gl.SCISSOR_BOX),
            colorMask: gl.getParameter(gl.COLOR_WRITEMASK),
            depthMask: gl.getParameter(gl.DEPTH_WRITEMASK),
            depthFunction: gl.getParameter(gl.DEPTH_FUNC),
            frontFace: gl.getParameter(gl.FRONT_FACE),
            cullFaceMode: gl.getParameter(gl.CULL_FACE_MODE),
            clearColor: gl.getParameter(gl.COLOR_CLEAR_VALUE),
            clearDepth: gl.getParameter(gl.DEPTH_CLEAR_VALUE),
            polygonOffsetFactor: gl.getParameter(gl.POLYGON_OFFSET_FACTOR),
            polygonOffsetUnits: gl.getParameter(gl.POLYGON_OFFSET_UNITS),
            blendSourceRgb: gl.getParameter(gl.BLEND_SRC_RGB),
            blendDestinationRgb: gl.getParameter(gl.BLEND_DST_RGB),
            blendSourceAlpha: gl.getParameter(gl.BLEND_SRC_ALPHA),
            blendDestinationAlpha: gl.getParameter(gl.BLEND_DST_ALPHA),
            blendEquationRgb: gl.getParameter(gl.BLEND_EQUATION_RGB),
            blendEquationAlpha: gl.getParameter(gl.BLEND_EQUATION_ALPHA),
            blend: enabled(gl, gl.BLEND),
            cullFace: enabled(gl, gl.CULL_FACE),
            depthTest: enabled(gl, gl.DEPTH_TEST),
            scissorTest: enabled(gl, gl.SCISSOR_TEST),
            stencilTest: enabled(gl, gl.STENCIL_TEST),
            polygonOffsetFill: enabled(gl, gl.POLYGON_OFFSET_FILL)
        };
    }

    restore(state) {
        const gl = this.gl;
        gl.useProgram(state.program);
        gl.bindVertexArray(state.vertexArray);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.arrayBuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, state.drawFramebuffer);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, state.readFramebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, state.renderbuffer);
        for (let unit = 0; unit < state.texture2D.length; unit++) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, state.texture2D[unit]);
        }
        gl.activeTexture(state.activeTexture);
        gl.bindTexture(gl.TEXTURE_2D, state.activeTexture2D);
        gl.viewport(...state.viewport);
        gl.scissor(...state.scissorBox);
        gl.colorMask(...state.colorMask);
        gl.depthMask(state.depthMask);
        gl.depthFunc(state.depthFunction);
        gl.frontFace(state.frontFace);
        gl.cullFace(state.cullFaceMode);
        gl.clearColor(...state.clearColor);
        gl.clearDepth(state.clearDepth);
        gl.polygonOffset(state.polygonOffsetFactor, state.polygonOffsetUnits);
        gl.blendFuncSeparate(
            state.blendSourceRgb,
            state.blendDestinationRgb,
            state.blendSourceAlpha,
            state.blendDestinationAlpha
        );
        gl.blendEquationSeparate(state.blendEquationRgb, state.blendEquationAlpha);
        this.#setEnabled(gl.BLEND, state.blend);
        this.#setEnabled(gl.CULL_FACE, state.cullFace);
        this.#setEnabled(gl.DEPTH_TEST, state.depthTest);
        this.#setEnabled(gl.SCISSOR_TEST, state.scissorTest);
        this.#setEnabled(gl.STENCIL_TEST, state.stencilTest);
        this.#setEnabled(gl.POLYGON_OFFSET_FILL, state.polygonOffsetFill);
    }

    #setEnabled(capability, shouldEnable) {
        if (shouldEnable) this.gl.enable(capability);
        else this.gl.disable(capability);
    }
}
