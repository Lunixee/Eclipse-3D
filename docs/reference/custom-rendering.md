# Custom Rendering

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [GLSL programs, materials and uniforms](#glsl-programs-materials-and-uniforms)

## GLSL programs, materials and uniforms

Supply GLSL ES 3 vertex/fragment bodies with your own main/output and a JSON uniform schema. Omit #version and injected declarations. Engine contracts use the preserved `t3d_*` namespace, including `t3d_clipPosition(t3d_position)`. User uniform names cannot use reserved `t3d_`, `gl_` or double-underscore names. See the complete [contract v1](../../CUSTOM_RENDERING.md) before writing a shader.

Supported schema fields are float, int, vec2/3/4, linear RGB color and sampler2D, up to 64 fields and 8 samplers. Create a custom material from the shader, then assign it through normal material/model blocks. Scalar/JSON/color input and the typed vector block update stored values; the vector form takes the components required by the declared type. Samplers retain existing textures or targets; clearing detaches them.

Source/schema/contract identity controls program caching; uniform values do not. Equivalent programs may share compilation, while materials with independent uniforms can split batches. Uniform reporters expose declared type, sampler texture or one-based numeric component. Shader users prevent deletion until custom materials release the definition.

Contract v1 is unlit and unskinned, outside engine lighting/IBL/shadows. It does not cast directional shadows. CPU raycasts remain undeformed and bounds must cover vertex displacement. Source validation and cached compile failures report diagnostics instead of recompiling every frame. Custom GLSL manages its own sampling/color conversion. This advanced scope is intentional.

### createCustomShader

![create shader [SHADER] vertex [VERTEX] fragment [FRAGMENT] uniforms JSON [UNIFORMS]](../assets/blocks/createCustomShader.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SHADER</code> | string; <code>custom</code> | — |
| <code>VERTEX</code> | string; <code>out vec4 color;<br>void main() { color = t3d_vertexColor * t3d_instanceColor; gl_Position = t3d_clipPosition(t3d_position); }</code> | — |
| <code>FRAGMENT</code> | string; <code>in vec4 color;<br>out vec4 outputColor;<br>void main() { outputColor = vec4(color.rgb * tint, color.a * t3d_opacity); }</code> | — |
| <code>UNIFORMS</code> | string; <code>{&quot;tint&quot;:&quot;color&quot;}</code> | — |

### createCustomMaterial

![create material [MATERIAL] with custom shader [SHADER]](../assets/blocks/createCustomMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>SHADER</code> | string; <code>custom</code> | — |

### setCustomUniform

![set custom material [MATERIAL] uniform [UNIFORM] value [VALUE]](../assets/blocks/setCustomUniform.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>UNIFORM</code> | string; <code>tint</code> | — |
| <code>VALUE</code> | string; <code>[1,1,1]</code> | — |

### setCustomUniformVector

![set custom material [MATERIAL] vector [UNIFORM] x [X] y [Y] z [Z] w [W]](../assets/blocks/setCustomUniformVector.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>UNIFORM</code> | string; <code>tint</code> | — |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>1</code> | — |
| <code>W</code> | number; <code>1</code> | — |

### setCustomSampler

![set custom material [MATERIAL] sampler [UNIFORM] texture [TEXTURE]](../assets/blocks/setCustomSampler.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>UNIFORM</code> | string; <code>image</code> | — |
| <code>TEXTURE</code> | string; <code>texture</code> | — |

### customShaderExists

![custom shader [SHADER] exists?](../assets/blocks/customShaderExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SHADER</code> | string; <code>custom</code> | — |

### customUniformText

![custom material [MATERIAL] uniform [UNIFORM] [PROPERTY] text](../assets/blocks/customUniformText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>UNIFORM</code> | string; <code>tint</code> | — |
| <code>PROPERTY</code> | string; <code>type</code> | <code>type</code>, <code>sampler texture</code> |

### customUniformNumber

![custom material [MATERIAL] uniform [UNIFORM] component [COMPONENT]](../assets/blocks/customUniformNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>custom material</code> | — |
| <code>UNIFORM</code> | string; <code>tint</code> | — |
| <code>COMPONENT</code> | number; <code>1</code> | — |

### customShaderNumber

![custom shader [SHADER] [PROPERTY] number](../assets/blocks/customShaderNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SHADER</code> | string; <code>custom</code> | — |
| <code>PROPERTY</code> | string; <code>uniforms</code> | <code>uniforms</code>, <code>users</code> |

### deleteCustomShader

![delete custom shader [SHADER]](../assets/blocks/deleteCustomShader.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SHADER</code> | string; <code>custom</code> | — |
