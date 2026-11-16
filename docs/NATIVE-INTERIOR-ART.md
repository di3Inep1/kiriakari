# 室内固定像素图集与工作台透视

最新一轮已按人物尺度重绘书本、器具、柜台小物与低晾灯架，原生显示方式继续沿用本文。当前素材映射与尺寸取舍见 [家具比例记录](FURNITURE-SCALE.md)。

2026-11-16。本记录取代先前“游戏中自动裁掉透明边界再适配格框”的室内家具显示方式。

## 修正内容

- 2 × 2 表示地面占格，不要求桌面的可见轮廓成为正方形。修灯台及调糊台重绘为与室内柜架一致的斜俯视：桌面有纵深压缩、短前沿和桌腿，台面灯具、碗和工具缩小。
- 新原图由内置 image_gen 制作：`assets/grid-worktables-v2.png`，3 列 × 1 行，依次为破损修灯台、修好修灯台、调糊台。保留透明通道和未经修改的生成原图。
- 所有室内家具共 34 帧，在导入阶段统一生成两套固定像素图集。正式游戏不再读取高分辨率原图来逐件裁边缩放。

## 文件与尺寸

| 文件 | 用途 |
| --- | --- |
| `assets/interior-native-48.png` | 电脑版原生图集，864 × 864；每格 48 像素 |
| `assets/interior-native-32.png` | 手机版原生图集，576 × 576；每格 32 像素 |
| `interior-art.js` | 每个家具与状态的固定图集区域，含透明留白 |
| `scripts/import-interior-art.cjs` | 一次性素材导入、状态边界合并与原生图集生成 |

2 × 2 家具在电脑上拥有 96 × 96 的完整图片区域，在手机上拥有 64 × 64 区域，1 × 3、3 × 1 等家具也分别保留完整多格区域。透明留白属于素材的一部分；游戏中不会为填满碰撞盒而放大或拉长桌面。

## 导入与显示规则

运行 `node scripts/import-interior-art.cjs` 导入或更新素材。原始生成大图只在导入阶段采样一次，保留横纵相同的缩放比例，使用最近邻采样和整数落点。两种原生尺寸直接分别从原图生成，不从一个小版本反复缩放。状态帧共用合并边界，保留柜体和桌体的基线。

运行时按固定图集矩形读取 PNG，源矩形、家具画布和 CSS 显示尺寸完全一致。没有 alpha 扫描、自动裁边、按可见轮廓适配格框，也不再经过“32 像素画布放大为 48 像素”的链路。窗口跨过手机尺寸阈值时，切换到事先准备好的另一套原生图集，不把旧画布缩小。开启 `image-rendering:pixelated` 并关闭画布插值。

这次范围为两处室内家具；地图缩略图作为导航预览仍会缩小显示。

## 验证

- 36 项规则检查通过，包含两套图集尺寸、全家具/全状态区域、完整碰撞矩形及通路。
- 浏览器记录家具实际的 drawImage 调用，断言其源矩形与目标矩形相同，且读取的是原生图集。
- 电脑与手机尺寸分别断言画布像素尺寸等于 CSS 尺寸；室内画面无脚本或资源错误。
- 开场探索专项重新复查取灯、点灯、包裹交付、修灯与室内进出。
- 预览：`preview-station-office.png`、`preview-lantern-workshop.png`、对应 `-grid.png` 占地示意与 `preview-workshop-mobile.png`。

## 工作台完整生成提示词

输入 `assets/grid-furniture.png` 仅作像素风格和色彩参考。由内置 image_gen 重新绘制，未通过压缩旧图代替重绘。

```text
Use case: stylized-concept.
Asset type: transparent production pixel-art sprite atlas, EXACTLY THREE columns by ONE row, three equal SQUARE cells, total canvas aspect3:1.
Input image is a STYLE AND COLOUR REFERENCE ONLY. Redraw ONLY the two lantern-workshop low tables and their quest states, not the reference atlas.
Critical art correction: the reference square tabletop looks unnaturally vertically stretched, completely overhead, and lacks convincing table height. Redraw with classic Pokemon-era/Japanese adventure RPG THREE-QUARTER TOP-DOWN ORTHOGRAPHIC perspective consistent with room cabinets. A physically SQUARE table on a 2-by-2 ground footprint should appear gently FORESHORTENED in screen space: visible silhouette about FOUR units WIDE by THREE units HIGH (4:3). Its square horizontal tabletop appears as an axis-aligned RECTANGLE, about 1.6 times wider than deep, with a clear SHORT FRONT FASCIA and TWO SHORT LEGS below. Straight horizontal and vertical edges, NO isometric diamonds, no trapezoidal taper, no diagonal camera. Do NOT make the entire sprite square to fill the cell. Provide transparent space above and below. Original artwork must have these proportions before any scaling.
All three sprites use EXACT SAME table base and camera: modest low walnut wooden worktable, four small square corner joints, restrained plank grain, narrow dark outline, top panel depth foreshortened, little front apron and two short square feet. No huge pillars or metal dungeon table. Old muted dark brown/ivory/brass/red palette, crisp CHUNKY 16-bit pixel art matching the reference, NOT high-detail painterly render. Most tabletop surface remains visible and clear.
Cell0: square-footprint low lantern repair table, small DAMAGED ivory paper lantern on left, compact red cord coil at upper right and FOUR short bamboo ribs neatly at lower right. Lantern is SMALL, only about30% of table width and35% of whole sprite height, natural tall rounded paper shape, no stretched oval, some torn paper. Small natural-sized tools.
Cell1: IDENTICAL table, identical position/width/height/legs and identical tool placement, but lantern repaired with intact ivory paper. Absolutely same table geometry as0. Small lantern same scale.
Cell2: IDENTICAL empty table base, small shallow round bowl of rice paste in upper-left, small ceramic jug upper-right, short paste brush on lower-right. Each object is small (bowl diameter about22% table width), realistic sprite proportions and correct shared oblique view, not overhead giant disks.
Constraints: EXACT3x1 equal square-cell layout; same base size and baseline in all three cells; NO text, labels, borders, grid, floor, backdrop, shadows outside the silhouette, characters, plants. Genuine transparent alpha background. Fully isolated sprites in each cell, no overlapping cell boundaries. These are production game sprites, not mockup room scenes.
```

