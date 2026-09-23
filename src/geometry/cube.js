/** @type {Array<[[number, number, number], Array<[number, number, number]>]>} */
const FACES = [
    [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
    [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]]
];

export const createCubeVertexData = () => {
    const data = new Float32Array(36 * 8);
    const triangles = [0, 1, 2, 0, 2, 3];
    const uv = [[0, 0], [0, 1], [1, 1], [1, 0]];
    let output = 0;
    for (const [normal, corners] of FACES) {
        for (const index of triangles) {
            const position = corners[index];
            data[output++] = position[0] * 0.5;
            data[output++] = position[1] * 0.5;
            data[output++] = position[2] * 0.5;
            data[output++] = normal[0];
            data[output++] = normal[1];
            data[output++] = normal[2];
            data[output++] = uv[index][0];
            data[output++] = uv[index][1];
        }
    }
    return data;
};
