# 神社建筑与庭院重绘

日期：2026-11-17。

普通12格宽木屋替换为9×6格完整拜殿：出挑瓦檐、注连绳、纸垂、铃绳、赛钱箱、格窗和台阶。删除原56号瓦片反复拼出的长椅排，入口改为可穿过的鸟居，两侧布置石灯笼、狐像、绘马架、手水钵、林边小祠与结签架。中央祭灯台、绘马谜题和回忆人物保留原剧情位置；新增四处可调查的环境内容，读后光点隐藏，保存于seen中。

所有新增摆设按矩形网格导入，桌面48px、手机32px，运行时按原生像素绘制。鸟居为3×1格占地、3格视觉高度，只有两侧柱脚碰撞，中央可通行。绘马架2×1、手水钵3×1、石灯笼1×1、小祠3×2。拜殿单独导入432×288和288×192像素，保持原图比例，不按单格拉伸。建筑缓存键包含图片就绪状态，避免首次进入时提前缓存空建筑。

## 素材保存位置

使用内置image_gen生成。原图：assets/shrine-hall.png、assets/shrine-furnishings.png。拜殿原生图：assets/shrine-hall-native-32.png、assets/shrine-hall-native-48.png。摆设并入assets/interior-native-32.png与assets/interior-native-48.png，并更新图集版本参数。

## 验证

42项规则检查，覆盖全部调查点的可达性、家具锚点和占地、鸟居中央通行与柱脚碰撞、旧长椅瓦片移除。浏览器chapter-preview实测四处新调查、读后光点隐藏、拜殿素材加载后可见、神社灯台解谜与点亮、四向边缘相机对齐、390px手机比例，同时复看书库和钟楼。总览preview-shrine-overview.png；手机preview-shrine-mobile.png。

## 生成提示词

### 拜殿

```text
Use case: stylized-concept. A single isolated complete Japanese Shinto haiden worship hall sprite for a classic detailed top-down 2D pixel-art RPG, genuinely transparent background. Orthographic RPG view facing south with roof top visible, parallel verticals and horizontal facade, NOT isometric. Compact rural shrine, footprint9 tiles wide, visible height6 tiles, designed to import at432x288 pixels, human character40px high, door about52px high. Broad gracefully curved dark blue-grey tiled irimoya roof, complete projecting eaves on both sides and decorative ridge ends, weathered warm dark timber columns, restrained deep vermilion details, raised narrow wooden verandah with short centered steps, closed wooden central sanctuary doors. A thick modest shimenawa sacred straw rope and white folded shide hang across front columns, a small bronze bell and rope at center, simple small offering box in front. Two latticed side windows. Balanced building proportions, distinct roof silhouette and shadows beneath eaves. Antique muted palette matching a mossy forest shrine, consistent light upper left, crisp pixel clusters and dark fine outlines, no blur. No grass, ground rectangle, trees, path, sky, torii, people, UI, text or letters. Entire building in frame with transparent padding, no cut-off roof, no massive palace, no multi-storey building.
```

拜殿补充编辑：移除建筑外全部背景与光晕，保留建筑、屋檐和台阶，使用零alpha透明区域。原始素材的透明度已经在导入时检查。

### 神社摆设图集

```text
Use case: stylized-concept. Production transparent sprite atlas for classic detailed Japanese top-down 2D pixel RPG shrine. EXACTLY 4 columns by2 rows, eight equal square cells, each object fully isolated with clear transparent padding. Consistent orthographic south-facing RPG perspective, top surfaces slightly visible, NOT isometric. Same weathered wood, cool-grey stone, subdued vermilion and straw rope, crisp pixel clusters, upper-left light, no blur. Scale intent human character40px at48px tile. Row1 left to right: (0) roofed wooden ema prayer plaque rack, width2tiles height2tiles with many tiny hanging wooden plaques, no readable text; (1) low stone temizuya purification water basin width3tiles visualheight2tiles, clear water, slender bamboo ladles across top and subtle moss base; (2) slender traditional stone toro lantern, width1tile height2tiles, heavy grey cap stone, square window and narrow pedestal, no vermilion wood; (3) a small seated stone fox guardian on low square plinth, width1tile visualheight1tile, modest red bib. Row2 left to right: (4) tiny hokora roadside shrine shelter width3tiles height3tiles, dark peaked wood roof with overhanging eaves, sacred rope, compact red doors, low stone footing; (5) low wooden saisen offering box width2tiles height1tile with slatted top, thin sacred rope, no other furniture; (6) wooden omikuji paper fortune tying rack width2tiles height2tiles with many tiny knotted white paper strips; (7) a traditional aged muted vermilion torii gate width3tiles height3tiles, two narrow upright pillars, broad curved top beam with side overhang, slim second horizontal beam, empty transparent central opening, no solid floor or wall. Each sprite separately centered in its own equal cell. No floor patches, no terrain, no gardens, no captions, no grid lines, no people, no benches, no decorative objects beyond requested eight.
```

