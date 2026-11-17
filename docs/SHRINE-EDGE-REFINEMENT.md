# 神社铺地与苔草边界细化

日期：2026-11-17。

## 第二轮：降低地面存在感并补齐边界

反馈指出石板过抢眼、草地交界仍像矩形贴片。本轮缩小铺石，压低明暗反差和接缝，重新生成 assets/shrine-aged-paving-v2.png；新地面重复单元为6×6格（192/288像素），输出 assets/shrine-paving-v2-native-32.png、assets/shrine-paving-v2-native-48.png。

新增透明苔草过渡 assets/shrine-moss-fringe.png，等比导入为6×2格的 assets/shrine-fringe-native-32.png、assets/shrine-fringe-native-48.png。统一在铺地完成后绘制，跨越草地和石板两侧；四向旋转按世界坐标取片，覆盖外沿、转角和连接门口的小路，摄像机移动时不漂移。缩略图采用同一边界。保持原地图可行走区域与解谜进度。

使用内置 image_gen 生成。桌面及手机实际预览、四向边缘随摄像机移动的像素一致性检查见 QA.md。

### 柔和小石铺地提示词

```text
Use case: stylized-concept. Production seamless square pixel-art ground texture for a traditional top-down Japanese 2D RPG shrine garden. A quiet, aged grey-green stone courtyard. Roughly eight horizontal courses of SMALL hand-cut rectangular stones, irregular lengths, slender subdued mossy seams. Uniform restrained muted cool grey-green colors, very low stone-to-stone difference, finer softer surface grain, faint wear, shallow edges. The surface should recede behind characters and plants, and harmonize with a dark green woodland garden. No deep black outlines, no bright bevels, no chiseled massive blocks, no marble. Stone joins remain visible but soft. Consistent overhead ambient illumination, flat straight-down orthographic plane with no depth perspective or side faces. Seamless repeat across all four image boundaries. Pixel clusters suitable for reduction to288x288 pixels, calm classic JRPG environmental art. No objects, no foliage clumps, no central pattern, no text, no gradients, no vignette, no obvious alternating shades, no sandy beige, no patches or mosaic of different materials.
```

### 苔草边缘提示词

```text
Use case: stylized-concept. Transparent pixel-art ground transition overlay for a classic top-down Japanese RPG. ONE long horizontal, irregular soft woodland grass / moss / dark soil fringe on a fully transparent canvas, panoramic aspect ratio8:1. This is NOT a scene, NOT a square terrain tile and NOT a solid background. Across the middle runs a broken organic boundary from dark forest turf above into an old paved courtyard below. Upper half: closely packed tiny desaturated dark forest-green grass blades and moss, with irregular alpha gaps, density near the middle then thinning towards the top edge. Lower half: extremely sparse little moss tongues, short grass blades, earthy dark grey-brown speckles and a few tiny muted fallen leaves extending below the middle, with increasingly large transparent gaps towards the lower edge. The pavement itself must be entirely transparent, not painted. Dense green area only about1/3 the strip's height, subtle darkest soil lies under the moss, transparent bottom third except isolated fine tips. Softness is achieved by irregular crisp pixel clusters and alpha holes, NOT blur or a uniform opacity gradient. Same lighting and scale as detailed 32/48px classic RPG tiles. Low contrast greens #344d38 #465b3c #526344 and earth #46483a. No thick hedge, no bushes, no giant leaves, no large rocks, no broad brown stripe, no white edge, no hard straight outline, no text, no checkerboard baked in. Horizontal ends naturally repeat. Keep object content in the middle60% of the strip height and leave transparent breathing room above and below.
```

