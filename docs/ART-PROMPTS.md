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

