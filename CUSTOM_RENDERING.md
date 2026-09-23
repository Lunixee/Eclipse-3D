# custom rendering contract v1

## Geometry and model ownership

`engine.geometry.createCustom(name, data, usage = 'static')` creates a named shared triangle resource. Data is an object (JSON in blocks) with flat `positions` xyz, optional `indices` (zero-based unsigned integers), `normals` xyz, `uvs` xy, `colors` rgba, and `tangents` xyzw. Every supplied attribute must have the same vertex count and finite float32 values. Omitted normals are area-weighted triangle normals; degenerate vertices use +Y. Omitted UVs are zero and colors white. Indices/non-indexed vertices must form complete triangles. Caller arrays are copied into the canonical interleaved resource.

An optional `bounds: {minimum: [x,y,z], maximum: [x,y,z]}` supplies a conservative AABB that must enclose the positions; otherwise bounds are computed. Supply padding here for shader displacement. Replacements are complete definitions: omitted attributes/bounds revert to generated defaults.

`engine.models.createFromGeometry(modelName, geometryName, materialName = 'default')` makes a synchronous ready model asset. Existing create-model-instance/bulk-instance, transform, color, material, visibility, LOD and deletion APIs apply. The name retains geometry independently; each asset retains geometry and its borrowed material, each scene instance retains the asset. Delete instances, then model assets, then named geometry/materials. Deleting an asset does not delete a borrowed named material. Low-level stores require the Engine's geometry-change callback integration for scene bounds propagation.

`updateCustom(name, data)` replaces dynamic geometry transactionally, including vertex counts and indexed/non-indexed transitions. Static resources reject updates; create as `dynamic` when replacement is needed. Values are normalized and compared before publication. CPU vertex/index arrays and GPU handles are reused at equal size. Changed interleaved vertices and indices upload independently, using whole-stream `bufferSubData` at equal byte size and `bufferData` on resize. An index allocation is intentionally retained during subsequent non-indexed use and released on resource deletion. Partial ranges and arbitrary vertex layouts are deferred.

Position/topology, vertex stream, index stream and bounds versions are independent. Colors/UVs/normals leave ray acceleration, spatial entries, shadows and instance data unchanged. Position/topology changes invalidate the shared lazy CPU BVH and actual ordinary shadow casters. Bounds changes notify dependent instances (including cached LOD levels) only at mutation time; no geometry-consumer traversal runs each frame. CPU rays always test undeformed geometry. Dynamic command validation uses temporary normalized/candidate arrays; zero-allocation procedural editing is not claimed. Unchanged rendering creates/uploads nothing for this feature.

## Shader definitions and materials

`engine.materials.shaders.create(name, vertexBody, fragmentBody, uniformSchema)` stores immutable GLSL ES 3 bodies. Omit `#version` and engine/uniform declarations; Eclipse 3D injects these before the body and resets source line numbers. Supply your own `main`, varyings and fragment output. Sources are bounded to 256 KiB per stage. `createCustom(materialName, shaderName)` retains a definition. Clone/delete and ordinary material assignment work. Definitions cannot be deleted while materials retain them; source edits use a new definition and material. The existing warm-material block compiles on demand; otherwise compilation happens on first draw. Errors identify definition and vertex/fragment/link stage through normal error reporting. Failed identities are cached rather than retried every frame.

Uniform schema example: `{"tint":"color","gain":"float","image":"sampler2D"}`. Names are GLSL identifiers without reserved `t3d_`, `gl_` or double-underscore prefixes/sequences. Supported types are float, signed 32-bit int, vec2, vec3, vec4, color (linear RGB vec3), and sampler2D. Up to 64 fields and 8 samplers; no arrays, structs, user matrices or additional active vertex attributes. Schema order is canonicalized. Active fields outside the schema/engine contract fail validation. Numeric defaults are zero, color defaults white, samplers unset. Engine program identity uses source, schema and contract version, including across separately named equivalent definitions.

`engine.materials.setUniform(materialName, uniformName, value)` validates and stores CPU values. Numeric scalars and component arrays are accepted; sampler values are existing texture names (empty string/null clears). The numeric block takes a scalar or JSON array and accepts `#rrggbb` for color, converting sRGB to linear. The separate sampler block takes a texture name. Samplers retain/release through TextureStore, including render-target textures and their normal double-buffer resolver. They use normal texture sampling settings, but custom GLSL controls UV transforms and sRGB decoding itself.

## Engine GLSL declarations

Both stages receive `mat4 t3d_view`, `t3d_projection`, `t3d_viewProjection`; `vec3 t3d_cameraPosition` in world space; `vec2 t3d_targetSize` in actual render pixels; and `float t3d_opacity`. Values update for each main/offscreen camera render. No automatic time value is supplied: set a float uniform from project time when animation is desired.

The vertex stage receives local-space `vec3 t3d_position`, `t3d_normal`; `vec2 t3d_uv`; `vec4 t3d_tangent`, `t3d_vertexColor`, `t3d_instanceColor`; and the four instance-matrix columns. Use `mat4 t3d_modelMatrix()` and `vec4 t3d_clipPosition(vec3 localPosition)` to preserve instancing without per-object matrix uniforms. Matrix values follow the engine's world/camera conventions. The instance color retains existing engine tint semantics; color uniforms are explicitly linear RGB.

Minimal vertex body:

```glsl
out vec4 color;
void main() {
    color = t3d_vertexColor * t3d_instanceColor;
    gl_Position = t3d_clipPosition(t3d_position);
}
```

Fragment body with schema `{"tint":"color"}`:

```glsl
in vec4 color;
out vec4 outputColor;
void main() {
    outputColor = vec4(color.rgb * tint, color.a * t3d_opacity);
}
```

Fragment output follows the existing scene output convention (display/sRGB-encoded RGB and straight alpha); post-processing subsequently decodes/encodes it like other scene color. Custom shaders must explicitly apply opacity, texture decoding, linear lighting calculations or discard as desired. Arbitrary shader output is not rewritten.

## Lighting and draw state

Custom contract v1 is fully custom/unlit. It does not receive engine lighting, directional shadows or IBL, does not cast directional shadows, and rejects skinned draws/assignment. Shader displacement is not CPU deformation; use conservative bounds and remember rays remain undeformed. Ordinary materials on custom geometry keep the existing lighting/IBL/cutout/directional-shadow path. Future lighting/deformation hooks require an explicit contract extension.

Existing opacity/depth-test/depth-write blocks apply. New side control is `front` (cull back), `back` (cull front), or `double`. Blend control is `opaque`, `normal` (straight alpha), or `additive`; selecting a blend mode establishes opaque+depth-write or blended+no-depth-write defaults, which the existing depth-write block can then override. Existing alpha-mode APIs remain compatible; custom `cutout` mode is rejected because the custom fragment implements discard itself.

Numeric draw controls are integer `renderOrder`, `polygonOffsetFactor`, and `polygonOffsetUnits` (finite, magnitude at most 1,000,000). Zero offsets disable polygon offset. Main mesh batches remain opaque/cutout first, blended second; order sorts ascending within each queue. Effects remain their existing separate final phase. Transparent instances are not globally depth-sorted; use explicit material order where needed. Color masks, arbitrary blend equations and depth functions are not exposed.

## Environment foundation and counters

PBR `setEnvironmentFactor(name, 'intensity', value)` multiplies the scene IBL intensity (0..100, default 1). `'rotation'` adds a material yaw in degrees (default 0) to scene environment yaw. These are material uniforms only: no environment preprocessing, texture recreation, shader recompile, shadow invalidation or spatial update. Background is unaffected. A future material environment/probe resolver can replace this material-binding input; no overrides, probes, SSR or unused probe traversal are implemented.

The custom metric reporter exposes cumulative renderer-lifetime shader compile attempts, numeric/sampler uniform uploads and geometry upload events, plus custom mesh draws for the last render. Engine built-in matrix/size/opacity calls are outside the custom-value-upload counter. Counters are zero when unused; no custom shader cache/binder is allocated before a custom draw/warmup. Restart preserves CPU definitions/values and recreates GPU state lazily. Reset releases consumers before materials/samplers/targets and sweeps disposed geometry VAOs and custom programs immediately. Command-driven target contents must be replayed after restart for equivalent-image tests.
