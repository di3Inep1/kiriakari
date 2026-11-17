# 神社庭院与祭灯台调整

日期：2026-11-17。

神社铺地改为同一灰绿色石材：错缝的小石板、细窄苔缝、磨损边缘和细碎矿物纹理。材质按世界坐标连续铺设，不按每个地图格重新拉伸或随机更换整块颜色。原有书库与钟楼地板保持各自材质。

原来单格内的四灯贴片替换为「归舟祭灯台」。低矮石座承托四盏小灯，占地3×1格；桌面144×48像素、手机96×32像素。人物可从三格正面逐格调查，也可绕行。月、山、川、舟的谜题顺序保持，成功后切换同一轮廓的点亮素材。旧存档若落在新增碰撞格，会安全回到本地图入口，保留进度。

## 素材

使用内置 image_gen 生成，原图保留于 assets/shrine-aged-paving.png、assets/shrine-votive-altar.png。导入工具按比例准备32/48像素网格素材；地面分别为256/384像素重复单元，祭灯台并入原生家具图集。运行时按原生尺寸绘制，缩略图单独缩小。点亮前后共用裁切范围，避免状态切换跳动。家具图集附版本参数以更新浏览器缓存。

## 验证

41项规则检查通过，涵盖祭灯台三格碰撞、面向调查、旧存档安全恢复；浏览器神社实地解谜、点亮画面切换、390像素手机原生显示通过。完整流程及四种结局复验见 QA.md。

## 完整生成提示词

### 祭灯台（透明背景，未点亮/已点亮双状态）

```text
Use case: stylized-concept. Production sprite atlas for a classic orthographic top-down Japanese 2D pixel-art mystery RPG. Transparent background, two equal cells side by side in ONE wide image, each cell contains the SAME low stone votive-lantern altar, identical geometry and registration. Each object silhouette aspect ratio about 3.4:1, broad horizontal and low, camera looking slightly down showing top and short front face, no isometric rotation. A long single weathered grey-green granite plinth supports exactly FOUR tiny traditional cream paper votive lanterns, each with a small dark bronze cap and subtle engraved emblem respectively crescent moon, mountain, river waves, boat. Tiny shallow stone footings; fine edge chips and restrained moss only at plinth corners. LEFT cell four lanterns unlit ivory-grey, RIGHT cell the same four warmly illuminated amber from within, no enormous glow, all base geometry unchanged. Real game scale: plinth footprint three tiles wide by one tile deep, exported at 144 by48 pixels desktop or96 by32 mobile; each lantern roughly14pixels tall, protagonist40pixels tall. So lanterns must look small and low. Muted desaturated antique stone, dark clean pixel outlines, deliberate crisp pixel clusters, consistent overhead-left light, traditional detailed RPG sprite, no blur, no photorealism. Each cell has transparent padding. No background floor, no grass patch, no floating objects, no text, no perspective distortion, no giant lanterns, no chairs, no symbols outside lanterns. Atlas only.
```

### 连续旧石铺地

```text
Use case: stylized-concept. Seamlessly tileable SQUARE ground texture for a classic detailed top-down 2D Japanese mystery RPG courtyard. Orthographic straight-down view, continuous old shrine stone pavement filling every edge. Medium-small hand-cut rectangular granite stones in staggered courses, roughly 8 courses vertically and 6 to8 stones across. Slight irregular edge shapes and short joints, slender dark moss-grey mortar, subtle 1-pixel style bevels and tiny edge chips. Restrained fine mineral speckles and gently worn stone centers give tangible rough stone texture rather than flat smooth giant rectangles. Entire surface ONE consistent desaturated warm grey-green family, very subtle stone-to-stone value difference, no contrasting colored patches. Slight moss only within some joints, sparse fine hairline wear. Calm and readable behind character sprites. Designed to reduce crisply to384x384 pixels, each stone roughly45x40 pixels or smaller. Seamless edges left/right/top/bottom; no central focus, no vignette, no lighting gradient, no border, no objects, no foliage clumps, no symbols, no writing, no perspective, no large cracks, no dirt patches, no polished modern tiles, no high contrast checkerboard. Detailed pixel-art material, not photograph.
```

