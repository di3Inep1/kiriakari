# Image-gen 素材制作记录

全部位图美术由内置 image_gen 工具生成，非占位图。保留原始 PNG；角色通过 CSS 按格取图，地图通过 Canvas 实时拼接地块图集，不改写图像内容。界面、粒子和谜题机关由程序绘制。

## 仓库资源清单

| 文件 | 图集布局 / 用途 |
| --- | --- |
| `assets/title.png` | 标题主视觉与结局背景 |
| `assets/world-atlas.png` | 先期场景概念图，2 列 × 3 行；实际游戏已改为使用 tileset.png 的经典 2D 地图 |
| `assets/portraits.png` | 2 列 × 2 行，依次为澪、栞、莲、凪 |
| `assets/sprites.png` | 4 列角色为澪、栞、莲、凪；4 行朝向为南、西、东、北；保留真实透明通道 |
| `assets/tileset.png` | 8 列 × 8 行的经典俯视 2D 地块；草地、道路、屋顶、墙体、水面和家具；实际游戏地图由地块拼成 |
| `assets/terrain-variety.png` | 制作过程保留的 32 格地面变体；正式地图改为统一使用 tileset.png 同材质底纹，不混铺此图 |
| `assets/foliage-variety.png` | 新增 4 列 × 4 行透明植被：8 种乔木 / 竹丛，绣球、野花、山茶、蕨类、芦苇、苔石、盆栽与落叶 |
| `assets/mounted-props.png` | 2 × 2 透明组合物件：长椅与照片、书桌与手记、书桌与录音机、屋檐与悬挂纸鹤 |
| `assets/world-props.png` | 4 × 2 透明场景物件：灯、告示、石碑、齿轮、桌、记录柜、钟、神龛；没有附带地砖底块 |
| `assets/stone-grain.png` | 统一石材颗粒底纹；由地图坐标上的连续砖缝结构取样，避免格子接缝错位 |
| `assets/mio-walk.png` | 主角行走图集初稿，保留作制作记录 |
| `assets/mio-walk-v2.png` | 正式四方向行走图集，3 列 × 4 行：左右迈步与站姿，透明背景 |
| `assets/station-fixtures-v2.png` | 车站关闭 / 打开闸门、站台安全线与轨道止冲挡；2 × 2 透明图集 |
| `assets/hanging-crane.png` | 单独纸鹤透明图，不含屋檐、木架或地面；挂线由真实建筑锚点连接 |

## 车站与屋檐布局 · 2026-11-16

以下素材通过内置 image_gen 制作，既有 tileset.png 仅作风格参考。正式车站图集额外移除了原始输出的半透明浅色背景，使用 v2 文件，避免地图出现背景方块。

### station-fixtures

```
Use case: stylized-concept. Asset type: exact 2x2 sprite atlas for a classic 2D top-down rural Japanese railway-station puzzle RPG. Input image STYLE reference only, match muted dark wood, iron, grey-blue pixel art and amber lighting. Four equal square cells, no gutters, no text, no watermarks, transparent PNG background. Top-left cell: CLOSED manual station ticket gate, TWO dark iron posts and a slender horizontal wooden barrier across the middle, small brass lock at center. Whole gate about twice as wide as high, ground contact near bottom90%, no ground tile and NO house door. Top-right: exactly the SAME ticket gate and post positions, OPEN variant, wooden barrier rotated upwards beside one post leaving the middle CLEAR for a person to walk through. Bottom-left: a single full-width HORIZONTAL yellow tactile platform safety strip, top-down, muted ochre yellow with small raised dot texture, thin charcoal edge line, this strip fills the middle ONE QUARTER of the square cell's height and the entire cell WIDTH, transparent above and below, ends must connect seamlessly when repeated left to right. Bottom-right: a railway end-of-track BUFFER STOP, sturdy short dark wooden/iron crossbar with red-white warning tips, correctly looks like the stop at the end of a rail siding, overhead RPG perspective, no floor rectangle or ballast background. Readable small pixel clusters, not an isometric scene. Every sprite entirely within its own equal cell, no background, no fake checkerboard, no captions. It is an atlas of actual game props.
```

### hanging-crane

```
Use case: stylized-concept. Asset type: ONE transparent origami-paper-crane sprite for an existing 16-bit top-down Japanese puzzle RPG. Reference image is style reference only. Draw a single small delicate OFF-WHITE paper crane with folded paper wings, subtle pale-grey shading, warm tiny red knot at the top of its back where a thread can attach. Classic crisp readable pixel-art sprite, overhead / slightly front view consistent with the reference. Crane completely isolated, centered, fills central 75 percent of the square canvas with transparent margin. IMPORTANT: NO roof, NO roof tile, NO beam, NO furniture, NO ground tile, NO floor rectangle, NO long string, NO shadow underneath, NO pedestal. Only the paper crane and tiny red attachment knot. The game will draw the hanging thread from a REAL roof in world coordinates. Genuine transparent background, no words, no label, no watermark.
```

### station-fixtures-v2.png 背景修正

```
Edit the supplied station sprite atlas. Remove ALL of the white, pale grey and off-white background between and around the four sprites, including the outer frame lines and grid separator. Make every background pixel completely transparent (alpha zero), not translucent white. Keep the dark ticket gates, the yellow tactile strip and buffer-stop sprite unchanged in their current 2x2 cell positions. Preserve the exact 1254x1254 canvas and crisp pixel outlines. Keep the transparent holes inside the open ticket gate and between the buffer's legs completely clear. Keep the full-width tactile strip continuous across its cell. No white backdrop, no grey haze, no fake transparency grid, no floor rectangle, no new shadows. This is background removal only, not a redesign.
```

## 主角行走帧 · 2026-11-16

正式版本额外修正了南北朝向的第三帧腿部动作。内置 image_gen 的定向修改提示词：

```
Edit target: the provided 768x2048 transparent RPG walking sheet. It has an exact 3-column x 4-row grid, each cell256x512. Make ONLY this correction: in ROW1 COLUMN3 (bottom of sprite around x610-688 y390-460) and ROW4 COLUMN3 (bottom of sprite around x610-688 y1910-1988), change the LEG POSE to be the OPPOSITE step to column1 in the same row. Current column3 repeats column1's right-side boot extending downward. In those TWO sprites, the LEFT-SIDE boot on the image must extend FORWARD / DOWN, while the RIGHT-SIDE boot retracts UP. Counter-swing the arms subtly if needed. The two boot tips must have clearly opposite vertical ordering versus column1. Keep the heads, face, hairstyle, coat, red shoulder bag, colors, body alignment, cell grid and ALL OTHER TEN FRAMES unchanged. Keep the exact same 768x2048 canvas and sprite placements. Preserve a genuinely transparent background, no background colors, no shadows, no text, no grid lines. This is a tiny precise animation correction, not a new character or a redesign.
```

使用内置 image_gen，以 sprites.png 中第一列主角作为身份和风格参考，生成独立透明图集。原始角色图集保留，其他 NPC 继续使用原图。

```
Use case: stylized-concept. Asset type: genuine 12-FRAME WALK CYCLE SPRITE SHEET for the heroine of an existing classic 2D overhead Japanese RPG. Input image is identity and style reference ONLY: use ONLY the FIRST COLUMN character, Mio, the young woman with short black bob hair, cream coat, white shirt, dark navy skirt, dark boots and small red shoulder satchel. Do NOT draw the other three people. Create an EXACT 3 COLUMNS by 4 ROWS sheet, 12 equal rectangular cells, each cell TWICE as tall as it is wide, entire sheet portrait aspect ratio 3:8, true transparent background, no gutters, no outlines around cells, no text. Each row is ONE facing direction: row1 SOUTH facing viewer; row2 WEST facing left; row3 EAST facing right; row4 NORTH showing back. Three columns are three DISTINCT animation frames: column1 LEFT FOOT FORWARD with right foot BACK, left/right arms counter-swing clearly; column2 NEUTRAL STANDING pose with both feet together and arms relaxed; column3 RIGHT FOOT FORWARD with left foot BACK and opposite arm swing. These must be actual different limb poses, not identical duplicates. Classic 16-bit RPG walking, short readable steps, not running, no large body tilt. Keep the face, hair silhouette, clothes, satchel, body size and HEAD POSITION identical across the 3 frames in each row. All 12 figures fully visible inside their own equal cells, centered horizontally, same foot-ground baseline at 94% of cell height, transparent padding around every frame, no overlap. Crisp small pixel clusters and palette exactly like the reference. Produce a tall 3x4 grid with 1:2 cells, not square cells, no margins, no labels, no characters other than Mio, no watermarks, no fake checkerboard background. Genuine transparent PNG.
```

## 物件承载与连续砖缝 · 2026-11-16

以下素材使用内置 image_gen 生成。透明组合物件将小物件真正放在家具上；透明单体物件消除了烘焙地面方块。石材底纹只有均匀颗粒，铺砖结构由游戏按世界坐标连续绘制，平均色调与砖缝尺寸保持一致。

### mounted-props.png

```
Use case: stylized-concept. Asset type: transparent 2x2 furniture-and-object sprite atlas for an existing classic 2D top-down Japanese puzzle RPG. Input image is STYLE REFERENCE ONLY for palette and 16-bit pixel clusters. Create a new EXACT 2 columns x 2 rows grid of equal square cells, no gutters, no labels. True transparent background. Every complete furniture assembly centered horizontally within its own cell, feet / lower edge at 90 percent down the cell, generous transparent space above, original muted wood brown and cool navy, crisp restrained pixel art, orthographic overhead RPG camera consistent with reference, no perspective scene, NO floor rectangles, NO ground tiles, NO cast shadow outside sprite. Top left: a wide worn Japanese railway wooden bench, THREE seats, seen from above/front, warm horizontal wooden slats and dark metal legs, with a TINY postcard-sized vintage photograph resting flat on the RIGHT end of the seat. Photograph no more than one eighth bench width, a small pale rectangle, no standing photo frame, no object on the ground. Top right: an old wooden school writing desk, seen overhead, with an OPEN HANDWRITTEN LEDGER lying FLAT on the desktop and two stacked books along its upper left edge, visible wooden table legs. Bottom left: a matching old wooden school writing desk with a compact CASSETTE RECORDER resting FLAT on the desktop, a short coiled cable and one closed book beside it. Bottom right: a short dark Japanese wooden eave beam with a tiny white origami crane hanging BELOW it by a slender red thread, the beam and crane together form one complete assembly, viewed as a classic RPG prop; no surrounding wall, no floor, tiny crane rather than huge sculpture. All four assemblies fit entirely in their square cells. Bench and desks about 85 percent cell width, sprite base at same 90 percent baseline. No letters, no readable words, no watermark, no characters.
```

### stone-grain.png

```
Use case: stylized-concept. Asset type: neutral stone MATERIAL texture for a classic 2D top-down RPG renderer. Input image is a STYLE and COLOR REFERENCE ONLY. Create one square full-bleed texture of cool medium-grey, slightly moss-grey aged granite surface with very fine restrained 16-bit pixel-art grain. This texture will be sampled inside individually drawn paving stones, so it must contain NO brick pattern, NO mortar, NO joints, NO grid, NO tile borders and NO separate stones. Uniform medium grey across the entire canvas, small low-contrast mineral speckles, tiny barely visible wear, pixel clusters no larger than 2-4 source pixels. Matte and evenly lit. Keep ALL regions exactly the same average brightness and hue; no dark patches, no light patches, no gradients, no vignetting, no moss clumps, no cracks, no bevels, no 3D lighting. Palette neutral cool desaturated grey with a very slight green tint matching the existing stone paving reference, not blue, not brown. A quiet repeatable low-contrast surface material, not a stone photograph or an illustration. No objects, no text, no watermark.
```

### world-props.png

```
Use case: stylized-concept. Asset type: transparent object sprite atlas for an existing classic 2D top-down Japanese puzzle RPG. Reference image is ONLY for style, color and object identity. Create exactly FOUR columns by TWO rows, eight equal square cells, no gutters, no grid lines, no labels. Each cell contains one COMPLETE isolated prop with true transparent background and NO floor, NO stone paving rectangle, NO ground patch, no cast shadow outside sprite. Crisp 16-bit pixel-art clusters matching the reference. Restrained dark wood, navy brass, warm amber lighting; classic overhead RPG perspective, not isometric. Props centered horizontally, all bases at 94% down their square cell. Row1 columns1-4: Japanese red paper lantern with warm golden light mounted on a short dark stone pedestal; simple wooden village noticeboard with a tiny blank faded paper pinned to it; a small weathered stone memorial upright slab on a short base with unreadable worn engravings; a compact antique brass clockwork gear assembly standing on a small dark wooden support. Row2 columns1-4: simple old wooden writing table with empty desktop; an old wooden records CABINET with drawers and a small keyhole, not a treasure chest; small upright wooden pendulum floor clock with tiny pale clock face; small wooden Japanese shrine altar with tiny offering bowl. Keep every sprite entirely inside its individual square cell with transparent margins. The objects occupy central 65-80% of cell. Do not include loose items in the transparent margins. NO background surfaces, NO tile borders, NO text, NO characters, NO watermark.
```


## 场景丰富化 · 2026-11-16

使用内置 image_gen 制作以下两张新图集，以既有 tileset.png 作为风格参考，未覆盖既有原图。正式游戏接入透明植被，通过植物层叠和树冠遮挡丰富场景；地面仍统一使用既有 tileset.png 底纹，仅增加稀疏、低对比的小细节。

### terrain-variety.png

```
Use case: stylized-concept. Asset type: additional seamless ground-tile atlas for an existing original classic 2D top-down Japanese RPG. Input image: reference ONLY for pixel style, scale and muted blue-green / moss / warm wood palette; create a new atlas. EXACT 8 columns by 4 rows of equal square cells, no gutters, no margins, no labels, no lettering. Landscape 2:1 overall. Every cell is ONE full-bleed seamless repeatable FLOOR texture, perfectly overhead. Authentic 16-bit pixel-art clusters, small crisp details, restrained contrast, NO isometric view, NO objects, NO buildings, NO characters, NO perspective. Each row has EIGHT related variants so adjacent variants fit naturally and share exactly the same edge colors. Row1 eight grass textures, all muted moss/emerald green base: fine short grass; clover-speckled grass; uneven wild lawn; scattered little white flowers in grass; scattered tiny yellow wildflowers in grass; subtle damp moss grass; grass with sparse small pebbles; grass with sparse scattered pink petals. Row2 eight old grey green STONE PAVING textures with matching edge colors: clean worn square stone; slightly cracked square stone; moss in paving joints; small wet paving patch; a few scattered leaves on paving; stone with pink petals; dirt-stained old paving; lightly weathered uneven paving. Row3 eight EARTH / NATURE textures with similar dark earth at borders: packed brown soil; pebbled footpath; gravel with tiny weeds; rich leaf-litter forest floor; damp brown soil with small puddles; soft mossy dirt; compacted sandy earth; dirt and fine exposed roots. Row4 eight muted indoor or courtyard ground textures: warm old wooden boards clean; same boards with scuff marks; same boards with faded scratches; same boards slightly dusty; dark slate floor clean; dark slate with fine cracks; dark slate with moss flecks; dark slate with rain-damp patches. Flat even lighting across every cell; readable when reduced to 32 or 48 screen pixels. NO black grid borders. No watermark.
```

### foliage-variety.png

```
Use case: stylized-concept. Asset type: transparent vegetation sprite atlas for an existing original classic 2D top-down Japanese RPG. Input image: reference ONLY for pixel-art style and palette. Create a new genuine transparent PNG atlas of EXACT 4 columns by 4 rows, sixteen equal square cells, no gutters or labels. Each cell contains ONE complete isolated plant sprite centered horizontally, with its ground contact at 88% down the cell, generous transparent margin, no clipping, no floor patch, no checkerboard painted in the image. Orthographic 3/4 overhead classic 16-bit RPG sprite perspective with visible treetops, crisp pixel clusters, sophisticated muted greens, seasonal pinks amber and vermilion, cohesive with a Japanese village at blue hour. Row1 columns1-4: a broad mature green camphor tree with visible small trunk; a red-orange Japanese maple with spreading crown and trunk; an amber yellow ginkgo with fan-shaped canopy; a pale pink cherry blossom tree with gracefully spreading crown. Row2 columns1-4: tall graceful green bamboo cluster; dark evergreen conifer; a soft drooping willow tree; a sculptural small Japanese pine. Row3 columns1-4: lush blue-purple hydrangea shrub; small white and yellow wildflower clump; a compact red camellia flowering shrub; three delicate ferns. Row4 columns1-4: a clump of tall grasses and river reeds; two moss-covered stones with little plants; a terracotta pot of leafy green foliage and tiny cream flowers; sparse fallen pink petals and amber leaves scattered as a ground decoration. Trees in rows1-2 occupy most of their equal cell and show crown and trunk, shrubs and smaller objects in rows3-4 occupy central 65% with all ground contacts on the same 88% baseline. Every sprite is isolated and not connected to adjacent cells, no shadows crossing cell boundaries. Transparent background, no words, no frame, no watermark.
```


## tileset.png · 经典俯视 2D 地块

```
Use case: stylized-concept. Asset type: production tileset sprite atlas PNG for an original classic 2D top-down Japanese puzzle RPG, in the tradition of 16-bit handheld monster adventure games and top-down haunted mansion RPGs. STRICT ORTHOGRAPHIC TOP-DOWN tile graphics, not a perspective illustration, not isometric, NOT a contact sheet of scenes. Create EXACTLY 8 columns x 8 rows of equal square cells, no gutters, total 1024x1024, cell128x128. Cohesive authentic 16-bit pixel art, navy teal forest green worn wood muted beige and warm amber. Every cell must be a SINGLE square reusable map TILE completely filling its cell. Seamlessly fitting edges for flooring. No lettering, no labels, no text, no watermark, no characters. Row1 columns1-8: green grass ground, dark green grass ground, stone paving, dark cobblestone, wood plank floor, tatami floor, shallow blue water, deep blue water. Row2: dirt path, sand path, moss stone ground, grey gravel ground, red carpet floor, dark wooden floor, light marble floor, black void. Row3: front-facing simple blue-grey stone wall tile, front-facing Japanese dark wooden wall tile, red roof tile horizontal repeating, navy blue roof tile horizontal repeating, shoji paper wall tile, library bookshelves wall tile, clockwork brass wall tile, dark rough cave wall tile. Row4: stone wall top border tile, wooden wall top border tile, red roof ridge tile, blue roof ridge tile, white plaster wall tile, window set in wooden wall tile, wood door closed tile, wood doorway open tile. Row5: round leafy treetop filling tile, cherry blossom treetop filling tile, dark conifer tree filling tile, square hedge filling tile, round boulder on grass, hydrangea bush on grass, shallow pond corner tile, brown tree trunk on grass. Row6: small red paper lantern on a dark stone pedestal on stone paving, small wooden shrine altar on stone paving, a wooden bench on stone paving, wooden sign on stone paving, a mailbox on stone paving, a stone memorial on stone paving, a small unlit brass gear mechanism on wooden floor, railway track with sleepers on gravel. Row7: antique wooden table on plank floor, closed wooden chest on plank floor, a stack of old books on plank floor, a cassette recorder on plank floor, rolled red blanket on plank floor, small brass floor clock on plank floor, a single paper crane on stone paving, a small framed photograph on stone paving. Row8: short horizontal red wooden fence on stone paving, short vertical red wooden fence on stone paving, short horizontal wooden railing on wood floor, short vertical wooden railing on wood floor, four brass lantern bases on moss stone, carved stone stairs on stone paving, golden ritual circle on dark stone paving, a square moonlit window set into wood wall. All 64 cells obey exact equal grid. Every item drawn with readable tiny pixel clusters and overhead RPG perspective, consistent scale, no shadows outside its tile. This is a functioning game tile atlas, not a landscape painting.
```

以下保留实际提交给内置工具的完整提示词。工具自动选择输出尺寸，游戏以百分比按图集格子取景。

## title.png

```
Use case: stylized-concept. Asset type: title key art for an original Japanese mystery puzzle RPG, landscape 16:9, high resolution. Primary request: beautiful painterly pixel-art scene of an abandoned Japanese mountain railway station at blue hour, a lone young woman with short black hair, cream coat, dark skirt and a small red satchel stands on the platform in the right third, facing away, holding a glowing paper lantern. A single vintage train glows amber on the far right. Long wet platform recedes into mist; power lines, hydrangeas, a large silver moon and a distant red shrine gate. Atmosphere mysterious, wistful, calm, intimate. Deep navy, desaturated teal, warm amber light, sparse vermilion. Premium 2D indie Japanese RPG look, crisp intricate pixel clusters, fine film grain and cinematic lighting. Left half kept dark, simple, mostly sky and mist for separately rendered title and buttons. No letters, no text, no logos, no UI, no watermark. Landscape image.
```

## world-atlas.png

```
Use case: stylized-concept. Asset type: a single environment atlas PNG for an original Japanese puzzle RPG. Create an EXACT equal 2-column by 3-row grid with SIX separate full-bleed game environments, straight grid boundaries, NO gutters, NO margins, NO labels, NO text. Total image roughly square 2048x1920, each cell landscape 1024x640. All SIX cells share premium painterly pixel art style, 3/4 overhead JRPG camera, dusk and mist, midnight blue/teal shadows, amber lanterns, old rural Japan. Environments have broad clear walkable ground in their central 70%, scenery mostly at edges, NO PEOPLE, NO PLAYER SPRITES, NO UI. Top left: abandoned outdoor rural train station platform with tracks along the upper edge, bench at left, warm station office upper left, hydrangeas bottom corners, platform open in the middle. Top right: small Japanese festival town square, wooden shops and red lanterns on upper and side edges, central stone square empty and walkable, old tree lower left, water channel right. Middle left: Japanese shrine courtyard, torii and stone steps top center, four stone lanterns at corners, broad empty mossy stone courtyard center. Middle right: abandoned school library and archive cutaway interior, tall shelves along walls, antique desks at left and right, center broad open wood floor, large pale moonlit window top center. Bottom left: mountain observatory clock tower cutaway interior, huge brass clock face on upper wall, blue glass roof, gears along left and right walls, central circular open stone floor. Bottom right: night riverside bridge with red wooden railings, paper lanterns afloat on river along lower edge, shrine and houses silhouetted at top, wide open stone bridge deck across middle. Exact rectangular equal grid, no border. High clarity and narrative atmosphere, no writing, no watermarks.
```

## portraits.png

```
Use case: stylized-concept. Asset type: single 2x2 character portrait atlas for an original Japanese mystery RPG, exact four equal square cells, no gutters, no text. Premium anime portrait illustration with subtle paper texture and controlled pixel-art-inspired shading, midnight blue backdrop behind each portrait. Top left: heroine Mio, young adult Japanese woman with short ink-black bob, grey blue eyes, cream coat, white shirt, narrow red satchel strap, thoughtful gentle expression, chest-up portrait. Top right: older sister Shiori, Japanese woman age 25, long black hair, a small red hair ribbon, white shrine keeper haori over muted red dress, warm quietly sad smile, chest-up. Bottom left: Ren, Japanese young man age 22, dark slightly messy hair, indigo railway uniform and navy cap with a small brass badge, serious kind eyes, chest-up. Bottom right: Nagi, elderly Japanese female lantern maker, silver hair in low bun, round spectacles, indigo kimono and amber scarf, knowing gentle expression, chest-up. Original characters, consistent facial style and scale, beautifully rendered restrained colors. Exact 2 columns 2 rows, all faces centered within their cells with head and shoulders visible. No letters, no labels, no UI, no watermark.
```

## sprites.png

```
Use case: stylized-concept. Asset type: transparent pixel-art character sprite sheet for an original Japanese overhead RPG. EXACT grid of 4 columns by 4 rows, each of the 16 equal cells contains one tiny FULL BODY character sprite centered in its cell with feet aligned 85% down the cell, consistent 32x48 pixel inspired chibi proportions, crisp pixel clusters, no shadows, transparent empty space. Four columns are the four characters: column 1 young Japanese heroine with short black bob, cream coat, dark skirt and little red satchel; column 2 older sister with long black hair, red ribbon, white shrine haori and muted red hakama; column 3 young Japanese male railway keeper with navy cap, indigo uniform and brass trim; column 4 elderly woman with silver bun, indigo kimono and amber scarf. Four rows are facing directions: row 1 facing camera SOUTH, row 2 facing WEST, row 3 facing EAST, row 4 back facing NORTH. Equal cell grid. A charming atmospheric Japanese indie RPG, cream navy teal and red colors. All 16 figures separated and inside their individual equal cells; no weapons, no backgrounds, no text, no labels, no watermarks. Genuine transparent background.
```

