# 整格家具与站房陈设

2026-11-16。站房 14 × 11 格，制灯铺 12 × 11 格。每件家具在放置前确定宽度和地面深度，地图只接收整数格坐标，不再逐件随意调整显示尺寸。

## 空间安排

站房中央保留两格宽主通道，从入口直达后墙的成组障子窗。左侧为票务与整灯区：票件格柜、值班桌、直柜台、引灯柜、整灯台及双门储物柜。右侧为候车与寄物区：横向和朝西的长椅、低橱柜、纵向屏风、包裹台、行李与山茶盆栽。入口旁放伞架和蕨类盆栽；后墙增加窗户、挂衣钩、山水挂画与路线板，保留墙钟及壁灯。

制灯铺保留方形修灯台与调糊台，接待笔记桌改为 2 × 1 格，避免堵住修灯台。补充成组障子窗、图样板和门边盆栽；纸料架、晾灯架、侧柜和矮凳均按整格排列。

## 几何规则

`furniture.js` 统一定义家具的图集、宽度 `w`、占地深度 `d`、绘制高度 `h`、朝向及状态。落地家具的绘制上沿为 `y + d - h`；碰撞仅覆盖 `w × d` 的完整矩形。高柜立面可高于占地，但不能改变地面 footprint。挂饰和窗户的 `d=0`，仅占墙面矩形，不阻挡地板。

放置函数会拒绝小数坐标、越界、地面家具重叠和墙面挂饰重叠。调查点和闪光点从同一组家具坐标计算；取灯、取包裹和修好纸灯仍会切换素材状态。

渲染时先裁去图集单元的透明留白，再等比绘制到每格 32 像素的固定画布，关闭插值。所有预制件保留原始纵横比，落地家具贴齐占格底边；墙面挂件居中。状态切换共用合并裁切边界，避免柜体或桌面改变尺寸。侧向长椅和屏风由独立侧向素材表现。

## 常用模块

| 家具 | 地面占格 | 绘制格数 |
| --- | --- | --- |
| 横长椅、直柜台 | 3 × 1 | 3 × 1 |
| 侧长椅 | 1 × 3 | 1 × 3 |
| 值班桌、整灯台、包裹台、笔记桌、低橱柜 | 2 × 1 | 2 × 1 |
| 方形修灯台、调糊台 | 2 × 2 | 2 × 2 |
| 引灯柜、双门储物柜、正向屏风 | 2 × 1 | 2 × 2 |
| 侧柜、侧向屏风 | 1 × 2 | 1 × 2 |
| 盆栽、矮凳、纸料篮 | 1 × 1 | 1 × 1 |
| 伞架 | 1 × 1 | 1 × 2 |
| 双扇障子窗 | 仅墙面 | 2 × 2 |
| 路线板、挂衣钩 | 仅墙面 | 2 × 1 |
| 挂画 | 仅墙面 | 1 × 1 |

## 验证与示意

自动检查覆盖所有家具的整数边界、完整碰撞矩形、重叠、全部可走地板连通、两格主通道和调查点可达性。浏览器还核对每个家具实际显示位置与尺寸。

`node tests/browser.cjs --interior-preview --footprints` 生成正常预览与占地示意。金色框标示落地家具占格，绿色为保留主通道。此网格仅用于验收，不会出现在正式游戏中。

- [站房](../preview-station-office.png) · [站房占地](../preview-station-office-grid.png)
- [制灯铺](../preview-lantern-workshop.png) · [制灯铺占地](../preview-lantern-workshop-grid.png)

## 新生成素材

两张图集均由内置 image_gen 生成，保留 RGBA 透明通道，4 列 × 3 行。序号从 0 开始，按行排列。

后续新增第三张 `assets/grid-interior-redrawn.png`，将仍在使用的旧引灯柜、票件柜、行李、纸料架、晾灯架、侧柜、纸料篮、壁灯和墙钟全部重绘。映射及新提示词见 [室内旧家具重绘](GRID-INTERIOR-REDRAW.md)。

- `assets/grid-furniture.png`：横长椅、侧长椅、值班桌、直柜台、整灯台、破损修灯台、修好修灯台、调糊台、笔记桌、有包裹台、空包裹台、方凳。
- `assets/grid-decor.png`：双门储物柜、低橱柜、正向屏风、侧向屏风、蕨类盆栽、山茶盆栽、路线板、山水挂画、双扇障子窗、单扇障子窗、伞架、挂衣钩。

生成后的原始 PNG 直接保存到上述路径，未进行手工重新绘图；游戏只在运行时裁取并缩放到预定义格数。

### 整格家具提示词

```text
Use case: stylized-concept. Asset type: PRODUCTION 16-bit pixel RPG furniture PREFAB atlas, exactly 4 columns by 3 rows, 12 equal square cells. Reference image supplies only muted walnut/ivory palette. Redesign for a TRUE GRID TILE ENGINE using a nearly straight-down ORTHOGRAPHIC view. Crisp low-resolution pixel clusters, clear rectangular silhouettes, simple flat wooden colour areas. NOT painterly illustrations, NOT isometric, NOT eye-level front elevations.
Each item is designed to a precise footprint ratio below. All rectangular surfaces have parallel, axis-aligned horizontal/vertical edges; front fascia is only a narrow strip, no large foreshortened sides. A 3x1 item MUST look three times as wide as tall; a 1x3 item MUST look three times as tall as wide. Square 2x2 tables MUST have square TOPS. No perspective trapezoids. Objects on a surface remain inside its rectangular footprint. Center each object in its equal atlas cell, genuine transparent alpha around it, no floor, no shadows outside the footprint, no grid lines, no text or labels. A 32-pixel-per-tile aesthetic.
Row1:
0 empty wooden waiting bench, 3x1 footprint, horizontal long axis, narrow back along top edge, three seat panels facing down. Designed visible ratio 3:1.
1 same waiting bench, 1x3 footprint, vertical long axis, narrow back along right edge, seats face left. Designed visible ratio 1:3.
2 station duty desk, 2x1 footprint, horizontal flat rectangular top with an open blank duty ledger and pen, tiny drawer fascia along bottom. Visible ratio 2:1.
3 straight railway ticket counter, 3x1 footprint, horizontal wooden top with a tiny brass bell and neat stack of blank tickets, narrow lower front trim. Visible ratio 3:1.
Row2:
4 lamp-maintenance workbench, 2x1 footprint, rectangular horizontal top with a small brass oil can, white cotton wick and a tray of USED black burnt match stems. Visible ratio 2:1.
5 low SQUARE lantern-making table, 2x2 footprint, square top with a small damaged ivory paper lantern frame, red cord and bamboo ribs; lantern should not extend outside the square.
6 exact same square table as cell5, same proportions and objects, but paper lantern repaired with intact ivory paper.
7 low SQUARE paste table, 2x2 footprint, square top with one rice-paste bowl, brush and small water jug arranged diagonally inside the square.
Row3:
8 small notes/tea table, 2x1 footprint, horizontal rectangular top, open blank notebook, tiny tea cup, folded cloth. Visible ratio 2:1.
9 low parcel counter, 2x1 footprint, horizontal wooden rectangular unit with one cream parcel tied with string on top. Visible ratio 2:1.
10 exact same low parcel counter as cell9, parcel removed, empty top. Visible ratio 2:1.
11 one small SQUARE wooden stool, 1x1 footprint, square seat, tiny dark feet visible at its corners. No circle cushion. Visible ratio 1:1.
Use restrained wood grain, uniform pixel density, dark desaturated brown outlines, weathered muted mid-brown wood, aged cream paper, small brass and red accents. ALL sprites must read as planned rectangular grid modules, not separately scaled realistic furniture. No characters, plants, ornate decorations, words, surrounding scenery or borders.
```

### 橱柜、屏风与墙面陈设提示词

```text
Use case: stylized-concept. Asset type: exactly 4 columns by 3 rows of production pixel-art rectangular GRID PREFABS for traditional Japanese 2D RPG interiors. Muted walnut, aged ivory, quiet forest green, terracotta, tiny brass accents. Reference is palette/pixel-density only. Flat ORTHOGRAPHIC overhead classic 16-bit tile art, parallel axis-aligned surfaces, crisp pixel clusters, simple graphic shapes, no painterly realism or diagonal isometric perspective. 12 equal atlas cells. Complete sprite per cell, alpha transparent around each object, no floor, no external shadow blobs, no text, no labels, no grid lines. Designed for 32px logical tiles.
Row1:
0 tall wooden double-door supply cupboard, floor footprint 2x1, visible 2x2 rectangle including front elevation, plain slatted/sliding doors, traditional station storage, handles, no large objects on top.
1 LOW wooden storage cabinet, 2x1 visible rectangle, rectangular top-down 2:1 unit, small drawer/door fronts along bottom edge.
2 a straight two-panel ivory-paper wooden folding privacy screen, floor 2x1, visible 2x2 including its upright paper panels. Straight horizontal alignment, no diagonal angled wings, no perspective trapezoid.
3 same screen turned to run along the VERTICAL axis, floor 1x2, visible 1x2 long narrow rectangle, paper panels and wooden rails visible toward LEFT. True side orientation, no diagonal wings.
Row2:
4 compact potted fern, floor 1x1, square terracotta pot with restrained dark green leaves contained within its one square cell, near top-down.
5 compact potted camellia, floor 1x1, square glazed brown pot with dark green foliage and just a few tiny ivory blossoms, within one square.
6 rectangular framed station route board, wall 2x1, visible 2:1 rectangle, simple schematic lines and two muted colour pins, absolutely no letters or numbers.
7 a small hanging framed landscape/ink decoration, wall 1x1, square wooden frame with a simple muted mountain and river brush illustration, no calligraphy or writing.
Row3:
8 traditional double-panel wooden shoji window, wall 2x2, square overall frame with two side-by-side tall panels, cream frosted glazing, thin dark walnut straight lattice. Flat front wall view, no outdoor scenery or floor.
9 matching narrow single-panel shoji window, wall 1x2, visible tall 1:2 rectangle, ivory frosted glazing and narrow wood lattice.
10 narrow indoor umbrella stand, floor 1x1, visible 1x2 including height, a dark wooden rectangular holder with two FOLDED umbrellas, curved handles. No lamp, no pole.
11 simple wooden wall coat-hook rail, wall 2x1, visible 2:1 rectangle, two hanging muted navy/brown work coats/scarves within the rectangle, no people.
All wood edges and surfaces fit deliberate rectangular prefab bounds. Keep calm consistent scale and pixel style, minimal noise, no random decorative clutter.
```

