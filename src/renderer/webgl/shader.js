const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate a WebGL shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown shader compiler error';
        gl.deleteShader(shader);
        throw new Error(`${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'} shader: ${message}`);
    }
    return shader;
};

export const createProgram = (gl, vertexSource, fragmentSource) => {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    let fragment = null;
    let program = null;
    try {
        fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
        program = gl.createProgram();
        if (!program) throw new Error('Unable to allocate a WebGL program');
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Program link: ${gl.getProgramInfoLog(program) || 'Unknown shader linker error'}`);
        }
        return program;
    } catch (error) {
        if (program) gl.deleteProgram(program);
        throw error;
    } finally {
        gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
    }
};
