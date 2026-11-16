# 家具占格、人物尺度与台面物件

2026-11-16。本轮把“碰撞占格”“家具本身体量”“书本和器具的相对大小”分开设计，并在生成素材前同时确定。继续使用固定像素图集，游戏中不临时缩放素材。

## 参照与取舍

- 原生电脑地块为 48 像素，人物站立画面约 40 像素高、身体约 18 像素宽。采用经典 RPG 的轻度夸张和斜俯视，按最终游戏画面判断比例。
- 修灯台与调糊台保留 2 × 2 地面占格，桌面轮廓有透视压缩和短桌腿。普通小灯约半个人高，碗壶、刷子和线圈按手持物大小绘制，空台面成为主体。
- 笔记桌与站务桌保持 2 × 1 格，打开的书约占桌宽四分之一，杯子更小；不再用放大的书覆盖大半张桌子。
- 晾灯架改为约一人高的 2 × 1 低架，三盏小灯均低于人物身体尺寸；纸料柜也改为 2 × 1 低柜。碰撞按新的完整矩形重新导出，不留下旧架子的隐形阻挡。
- 站房 3 × 1 直柜台上使用小铃和短票据，寄物台的包裹恢复为可携带的普通包裹；有物 / 空台状态保持桌体位置和尺寸一致。

## 素材

全部由内置 image_gen 生成，保留未经修改的原始 PNG 和透明通道：

- `assets/grid-furniture-balanced.png`：4 列 × 2 行。破损修灯台、修好修灯台、调糊台、笔记桌、站务桌、整灯台、低晾灯架、低纸料柜。
- `assets/grid-counter-props-balanced.png`：直柜台、包裹台、空包裹台。此图实际输出是不同宽度的源区域，导入脚本为它们显式记录裁取矩形，不按等宽格子硬切。两个包裹台源区域对齐到同一桌体基线。
- `assets/interior-native-32.png` 与 `assets/interior-native-48.png`：两套最终运行图集已重新导入，仍为 34 帧。只在导入阶段整理原图，运行时按原像素读取。
- 新尺寸和朝向定义位于 `furniture.js`。

## 门口黑底

两处房间的出口仍使用原有通行点和切换规则。显示时把旧的黑底开门格替换为连续木地板、两侧门框和浅色门槛，去除门口的黑色条块；缩略地图也使用同一显示方法。浏览器抽查出口中心的多个像素，确认通道是木地板而非黑底。

## 验证

36 项规则检查通过，包含全地板连通、完整家具碰撞和交互点可达。开场浏览器流程复查取灯、点灯、包裹、修灯与室内进出。固定像素检查继续覆盖电脑 / 手机以及真实 drawImage 源目标尺寸一致。

最新画面：`preview-station-office.png`、`preview-lantern-workshop.png`、`preview-workshop-mobile.png`；占地示意为对应 `-grid.png` 文件。手机“引灯”按钮与触屏提示一并保留。

## 家具比例生成提示词

```text
Use case: stylized-concept.
Asset type: production transparent PIXEL-ART furniture atlas, EXACTLY4 columns by2 rows, EIGHT equal square cells, canvas aspect2:1.
Image1 is wood/palette/camera reference ONLY. Image2 is the game's protagonist SCALE reference ONLY, do NOT include a person in output.
Primary request: redraw furniture with BELIEVABLE HUMAN-SCALE SMALL PROPS. Furniture footprint and prop size are different. Table bodies remain normal generous size; small books, cups, bowls, oil cans and handheld lanterns are all MUCH SMALLER than in image1. Do not shrink the furniture body to keep giant props. Leave at least70% of each tabletop visibly EMPTY. Calm useful furniture, not enlarged still-life displays.
Scale specification for import: one ground tile displays at48px. The protagonist body is about18px wide and40px tall. A2-tile table is96px wide. An open BOOK on it should be16–20px wide (about18–20% table width), paper hand lantern12px wide by18px tall, tea CUP5px wide by5px tall, small BOWL11px diameter, JUG9px wide by13px tall, short BRUSH18px long. These are SIZE PROPORTIONS to express in original art, NOT text to print. Keep circular/rounded objects natural. No giant head-sized books or torso-sized teacups.
Style: classic Japanese exploration RPG three-quarter TOP-DOWN ORTHOGRAPHIC tile art, crisp chunky16-bit pixel clusters, muted walnut wood, aged ivory, tiny brass/red accents. Axis-aligned edges, shallow visible top surfaces, modest short front edges/legs. Not isometric, no diagonal furniture. No heavy corner posts, no ornate dungeon-table architecture.
Row1:
0: normal low repair table, floor2x2, whole visible silhouette about4:3 width:height. Tabletop gently foreshortened, short front fascia and short legs. ONE TINY damaged paper hand lantern on upper left, TINY red thread coil upper right, FOUR SHORT bamboo ribs together near right edge. Lantern width12.5% of table width, height18.75% table width. Most bare wooden tabletop remains visible.
1: EXACT SAME TABLE and props, same size/position/baseline, lantern repaired with intact ivory paper. Small handheld lantern, not big festival lantern. Quest pair must match perfectly.
2: same low2x2 square-footprint table, visible4:3. ONE SMALL paste bowl near upper left (diameter11.5%table width), a SMALL short ceramic jug near upper right (width9.4%table width), short brush on lower right (length18.75%table width). Large empty middle of tabletop. No giant bowl or tall jug.
3: compact2x1 notes/tea desk, visible2:1. TINY open notebook toward LEFT CENTER (width18% table width), one VERY SMALL cup at back-right (width5% table width), modest folded cloth at far right (width10%). Tabletop mostly EMPTY. Book is handheld-sized and much smaller than person, not a giant book covering table.
Row2:
4: station duty desk2x1, visible2:1, same wood and perspective as3. Small open ledger toward upper left (width20%table width), short pen alongside (length10%table width), narrow drawer fascia, calm mostly empty surface. This is a normal human-use ledger.
5: maintenance bench2x1, visible2:1, a SMALL brass oil can at left (width9%,height14%of table width), 3short spare wicks near right, a small shallow match tray (width15%) and folded cloth (width10%). More than70% bare top.
6: LOW lantern drying rack, ground3x1, VISIBLE3x1 wide short silhouette, total screen height48px versus40px person. Two modest posts and straight beam, THREE SMALL hanging PAPER HAND LANTERNS evenly spaced and lots of open space. EACH lantern about12px wide by18px tall in the144px-wide rack: only8.3%of rack width by12.5%of rack width. Tiny short hanging loops. Posts about person height, lanterns smaller than human head+torso, no gigantic lanterns. No beam thickness above5%of width.
7: LOW broad paper supply cupboard, ground2x1, VISIBLE2x1 wide short silhouette. Two shallow shelves with SMALL rolled paper, short thread spools and a small jar. Roll end diameter6%of width, jarheight12%of width. Do not magnify stock to fill shelves. Normal small drawer joinery.
Constraints: genuine transparent alpha, no floor/backdrop, no external shadows, no words, numbers, labels, people, grid or cell borders. Center each complete sprite in its own equal square atlas cell. Do not make narrow sprites square by stretching. Exact4x2 arrangement. Low-noise clean pixels, restrained small-object details; readable silhouette and coherent relative scale take priority over showing every prop detail.
```

## 柜台小物生成提示词

```text
Use case: stylized-concept.
Asset type: production transparent16-bit pixel-art atlas, EXACT THREE equal square cells in ONE row, total canvas3:1.
Image is REFERENCE for restrained walnut palette and quiet empty tabletop ONLY. Make new normal-sized railway furniture bodies with SMALL HUMAN-SCALE props.
Scale reference: a person in game is40px tall and18px wide. One ground tile48px. Props are much smaller than a person, NOT trophy-sized.
Cell0: long STRAIGHT station ticket counter, ground3x1, VISIBLE3:1 rectangle. Whole sprite3times wider than tall, narrow front fascia/drawers. Generous mostly EMPTY tabletop. At left is a TINY brass service bell, about7px wide and7px tall compared with144px-wide counter (only5%counter width). At right a SMALL stack of tickets14px wide and5px tall (10%counter width). At least80%of top EMPTY. Do not magnify the bell or tickets to display detail. Axis-aligned edges, orthographic three-quarter RPG view, very shallow top with small front strip. No L wing, no tallfront.
Cell1: low wooden parcel counter, ground2x1, VISIBLE2:1 rectangle. One modest cream paper parcel tied with string near center, about34px wide by15px high compared with96px-wide counter (35%counter width), and large bare wood margins. Same palette/perspective. Modest front panel and short legs.
Cell2: EXACT SAME parcel counter as1, identical base geometry, size, pixel position and baseline, but parcel removed and top EMPTY. A matching quest pair.
Transparent alpha around each complete sprite, equal square cells, leave space above and below wide objects rather than stretching to fill cell. Crisp chunky pixel clusters, clean restrained wood grain, muted walnut/ivory/brass. No text, people, floor, shadows outside silhouette, grid, labels, borders or extra items. These are true rectangular grid prefabs with small normal-use objects.
```

