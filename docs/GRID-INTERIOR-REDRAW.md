# 室内旧家具重绘

2026-11-16。两间室内已移除旧的 exploration / interior / compact / world 家具引用，全部使用按格子设计的 prefab、decor、gridInterior 三套图集。旧 PNG 作为历史素材保留，不再被室内家具使用。

## 新图集

内置 image_gen 生成的透明 PNG：`assets/grid-interior-redrawn.png`，5 列 × 2 行，共 10 帧。原始输出直接复制到项目，保留透明通道。

| 序号 | 素材 | 地面占格 | 绘制格数 |
| --- | --- | --- | --- |
| 0 / 1 | 引灯柜，有灯 / 空柜 | 2 × 1 | 2 × 2 |
| 2 | 票件格柜 | 1 × 1 | 1 × 2 |
| 3 | 旅客行李 | 1 × 1 | 1 × 1 |
| 4 | 方形墙钟 | 墙面 | 1 × 1 |
| 5 | 方底板壁灯 | 墙面 | 1 × 1 |
| 6 | 纸料架 | 2 × 1 | 2 × 2 |
| 7 | 晾灯架 | 3 × 1 | 3 × 2 |
| 8 | 方形纸料篮 | 1 × 1 | 1 × 1 |
| 9 | 侧向纸柜 | 1 × 2 | 1 × 2 |

## 比例与状态

所有室内图集统一等比缩放到各自格框，禁止横纵分开拉伸。落地家具水平居中、底部对齐占地基线；挂件在墙格内居中。缩略地图也采用同一规则。灯笼、钟面、纸卷与柜门五金保持素材原本比例。

有状态的家具将各帧透明边界合并后统一裁切，因此引灯取走、包裹领取、纸灯修好时不会因留白不同而改变整件家具的比例或位置。柜子占地及房间通行路线保持原样。

## 验收

- 35 项规则检查通过，包含室内只允许新图集、等比缩放数学检查、全地板连通及调查点可达性。
- 浏览器核对两间屋子的家具格框与实际位置，保存正常预览与占地示意。
- 开场探索专项复查取灯、点灯、包裹交付、修灯、存档恢复和室内进出。

## 完整生成提示词

参考 `assets/grid-furniture.png` 仅用于统一色调和像素风格，不作为编辑目标。

```text
Use case: stylized-concept.
Asset type: production sprite ATLAS for a classic 2D Japanese tile-grid exploration RPG. EXACTLY FIVE COLUMNS by TWO ROWS, TEN equal SQUARE cells. The canvas aspect ratio must be 5:2. One COMPLETE isolated sprite per cell with generous transparent gutters. Image1 is STYLE/PALETTE REFERENCE ONLY, not an edit target.
Primary request: REDRAW the remaining legacy interior furnishings as deliberate rectangular grid modules. Flat orthographic top-down/tile-RPG view, consistent chunky 16-bit pixel clusters, muted walnut-brown wood, aged ivory paper, tiny brass accents. No smooth realistic rendering, no isometric diagonals, no blurry texture. All furniture edges parallel to horizontal and vertical axes, with shallow visible top surfaces on upright cabinets. Each item's VISIBLE bounding aspect ratio is specified below, different from its floor footprint. Draw at the correct aspect from scratch; it must never need to be squeezed to fit a square. ALL round objects such as paper lanterns, clock faces, handles and rolled paper retain natural circular/oval shapes. One shared pixel scale; restrained detail.
ROW 1, left to right:
0: 2x1 ground-footprint low wooden double-door LANTERN CABINET, VISIBLE 2x2 square including a single small unlit ivory paper hand lantern resting on the right half of its top. Cabinet is WIDE and LOW; lantern is compact, about one-quarter of total sprite width, not oversized. Top left empty. Crisp straight doors, tiny brass ring handles. No flame/glow. Whole composition square.
1: EXACT SAME cabinet as0, identical width, height, doors, top board, colours and position, but lantern removed and top EMPTY. VISIBLE same 2x2 square. These two sprites must match for a quest state swap.
2: tall NARROW wooden ticket/pigeonhole cabinet, ground1x1, VISIBLE1x2 rectangle. Two columns and four rows of square cubbies, a few small cream folded tickets/envelopes, two modest bottom drawers. Ensure square cubbies, un-stretched joinery. Visible width:height=1:2.
3: compact traveller luggage cluster, ground1x1, VISIBLE1x1 square, two small worn brown suitcases and a folded ivory cloth bundle, neat overhead arrangement, natural handle/buckle proportions.
4: old square wooden wall clock, VISIBLE1x1 SQUARE silhouette, with a small ROUND cream clock face and tiny brass pendulum window. No readable numerals. Clock face must remain circular.
ROW 2, left to right:
5: small indoor wall-mounted brass oil lamp on a small SQUARE dark wooden mounting plaque, VISIBLE1x1, compact natural teardrop glass chimney and tiny amber flame, no floor pole, no beam/light halo. Square plaque fits one wall tile.
6: paper-material storage shelf, ground2x1, VISIBLE2x2 square, low broad walnut frame with two shelves holding naturally ROUND cream paper rolls, bamboo ribs, two short thread spools and a small pottery jar. No giant long columns. Width:height1:1.
7: lantern drying rack, ground3x1, VISIBLE3x2 wide rectangle. Horizontal beam and two vertical posts, THREE small naturally rounded ivory paper lanterns hung evenly with short strings. Each lantern occupies less than one-third width and is taller than wide, not squashed. Feet stay inside rectangle. Width:height3:2.
8: shallow SQUARE bamboo supply basket, ground1x1,VISIBLE1x1. Top-down square rim and woven base, a few short bamboo strips and two short paper rolls arranged neatly inside; no broad flat front elevation. Square basket.
9: side-facing tall paper cupboard, ground1x2,VISIBLE1x2 vertical rectangle. Long axis aligned VERTICALLY, narrow dark wood shelf opening toward the LEFT, two shelves with compact paper bundles visible on left edge and straight side panel on right. True side orientation, not a sideways stretched front cabinet. Width:height1:2.
Constraints: genuine transparent alpha background, no floor, no cast shadow outside silhouettes, no scenery, no characters, no grid lines, no labels, no borders, no readable words, no duplicate extra sprites. EXACT 5x2 equal-cell layout. Keep all ten sprites fully within their own cells. Every visible shape designed for its stated grid proportions.
```

