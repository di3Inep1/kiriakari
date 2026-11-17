# 朝向调查、背包探索与回忆演出

2026-11-17。保留原故事、四种结局及旧存档进度，完善下面五组玩法与表现。

## 调查与多格家具

键盘 E 和手机“调查”只检查人物正前方的一格。不会从身旁、身后自动挑一个距离最近的对象。多格家具由同一组占地矩形定义碰撞和调查范围，2 × 2 工作台的四格都可从相邻且正对的边缘调查，墙面窗户按其底沿格识别。

点击光点时，寻路先选择可到达的调查面，到达后自动朝向该物件；距离相同时，优先接近闪光点所在的一侧。标签只在当前朝向可以调查时高亮。照片拥有独立物件与调查格，闪光对齐小照片，不再借用长椅中心当作调查位置。独立小物通过 surfaceOn 跟随椅面的遮挡层级，并以 surfaceAnchor 固定在右侧座板内部；照片、闪光及调查格共享同一座面位置。

共享规则：`KiriMaps.frontCell`、`interactionCells`、`canInvestigate` 和 `approach`。自动走过出口的场景切换保留，不要求额外按键。

## 回忆物件

长椅本体始终是空椅素材，照片作为独立小图，仅在引灯已点亮且进入回忆时显示。纸鹤和挂线同样进行物理显示与交互判定的双重时空筛选，现世不会留下纸鹤贴图或悬空挂线；地图缩略图使用相同规则。

## 背包与自行点灯

顶部“背包”或 B 打开格子背包。支持选中道具、查看说明并使用：引灯切换时空；钥匙开启面前的维修箱；清水用于面前的糨糊台；红线和米糊用于面前的修灯台；包裹可交给面前的婆婆；路线卡打开地图。

首次取到的是熄灭引灯。莲给钥匙和提示，火柴由玩家探索找到并在背包中使用。屋外尝试被风吹灭，剩余干火柴保留；找个室内再试即可点亮。整灯台与旧窗提供背风的环境线索。直接在室内点亮也有效，不强迫玩家先失败。

隐藏成就“学会护火”：先有一次屋外失败，再独自在室内点亮。成就记录与道具状态存档恢复。对错地方使用钥匙、清水或修灯材料不会消耗物品。旧的已点灯存档保留进度。

## 演出

- 首次点灯播放“第一簇火”CG；首次找回合照播放“长椅上的约定”CG。
- 在手记“回忆”页回看；旧存档已达到相应剧情条件时，也可回看新增图片。
- 新增拾取星光、风吹灭火、时空光纹、回忆物件显现、纸鹤轻摆和 CG 缓慢镜头。
- CG 有关闭与“返回探索”按钮；手机可直接触摸。系统“减少动态效果”会关闭新增动作。

## 地面

神社采用统一灰绿底色的大石板，书库采用连续的暖棕木地板，钟楼采用深色石板。表面颗粒由新素材提供，接缝由地图坐标连续铺设；不随机混入大块异色贴图。书库出口也延续木地板与门槛。

## 生成素材

全部使用内置 image_gen，原图已保存在项目：

| 文件 | 内容 |
| --- | --- |
| `assets/inventory-items.png` | 4 × 3 透明道具图集，含引灯、钥匙、火柴、红线、水罐、米糊、包裹、路线卡、合照、纸鹤、信封与火焰 |
| `assets/item-icons-12.png`、`item-icons-16.png`、`item-icons-48.png` | 一次性导入的固定像素小图集；照片使用 12 / 16 像素原图，道具面板使用 48 像素原图 |
| `assets/cg-first-flame.png` | 主角亲手点亮引灯 |
| `assets/cg-sisters-platform.png` | 七年前长椅上的姐妹 |
| `assets/shrine-library-materials.png` | 左侧石材、右侧木材的低对比表面采样 |

图标由 `node scripts/import-interior-art.cjs` 与原有家具一同导入。游戏中按准备好的像素图读取；CG 保留生成分辨率，用于剧情画面。

## 验证

- `npm test`：39 项通过，新增朝向 / 多格调查、回忆素材隔离、背包道具与隐藏成就恢复检查。
- `node tests/browser.cjs`：实际完成新点灯流程、两张 CG、真实 E 键背向 / 正向工作台检查、所有章节与四种结局，浏览器异常和资源错误为 0。
- `--bag-preview`：电脑 B 键、手机真实触摸使用火柴、直接室内点灯、CG 回看、减少动态效果，以及 320 / 390 / 844 像素布局。
- `--chapter-preview`：神社、书库、钟楼地面实景。
- `--memory-preview`：现世空椅与隐藏纸鹤、回忆中的独立照片和闪光层级、纸鹤及挂线，保存双时空对照。
- 预览：`preview-backpack.png`、`preview-backpack-mobile.png`、`preview-cg-first-flame.png`、`preview-cg-sisters.png`、`preview-cg-mobile.png`、`preview-shrine-floor.png`、`preview-archive-floor.png`、`preview-tower-floor.png`。

## 完整生成提示词

### 道具与照片

```text
Use case: stylized-concept. Asset: production transparent16-bit Japanese exploration RPG inventory icon atlas, EXACT4columns x3rows,12equal SQUARE cells, canvas4:3. Genuine transparent alpha, complete separate centered item in each cell, generous gutters, crisp chunky pixel clusters, clear at32px. Restrained walnut/cream/ochre/red/blue-green palette. Near top-down orthographic, no surrounding scenery, floor, shadows, words, letters, labels, borders or grid. All objects small handheld normal-use items, no enormous furniture.
Row1: 0 tiny unlit ivory paper hand lantern with dark walnut rectangular frame and red knot; 1 small antique brass key; 2 small oil-paper packet of dry matches with one red-tipped match beside it; 3 compact spool of red thread with a short loose end.
Row2: 4 small stoppered ceramic water jug; 5 little shallow bowl of white rice paste and short brush; 6 modest cream parcel tied with thin string; 7 folded hand-drawn town route card, only small symbolic paths, no text.
Row3: 8 small LOOSE old rectangular photograph with aged cream paper border, horizontal4:3 shape, tiny indistinct silhouettes of two sisters against station platform, NO wooden picture frame; 9 one tiny ivory origami paper crane; 10 closed cream envelope with red wax seal; 11 single small orange match flame above a dark burnt match stem.
Every sprite isolated, consistent low-detail pixel style, dark desaturated outline, readable quiet silhouette. Atlas cell sizes equal.
```

### 自行点灯 CG

参考 `assets/portraits.png` 仅用于角色身份和画风。

```text
Use case: illustration-story. Asset: a finished wide16:9 event CG for the original Japanese mystery RPG Kiriakari, no lettering or UI. Reference image is CHARACTER IDENTITY/PALETTE ONLY. Use the upper-left girl, Mio: short dark bob, gray eyes, cream travel jacket, white shirt, red-brown shoulder strap. Ignore the other three portraits.
Scene: inside a modest old wooden rural railway station office at night, Mio personally lights a SMALL ivory paper hand lantern on a low workbench with ONE match, hands protecting the tiny flame, thoughtful quiet expression. Three-quarter close-medium view; natural hands, warm match-light illuminates cheeks, compact lantern and fingertips, closed shoji windows and walnut cupboards softly recede behind her. No other people doing it for her. The hand lantern is appropriately small, not body-sized. Oil-paper match packet lies beside it. No large fire, danger or burning furniture.
Style: beautifully restrained Japanese2D narrative-game illustration matching portrait's hand-painted cel shapes and subtle paper texture, muted navy/walnut/ivory palette with localized amber glow, gentle mystery and the relief of making a first light by oneself. Clear focus on her hands and lamp, balanced environment detail, cinematic composition, full frame, no borders, no watermark, no letters, no captions.
```

### 姐妹回忆 CG

参考 `assets/portraits.png` 仅用于角色身份和画风。

```text
Use case: illustration-story. Asset: a finished wide16:9 event CG for the original Japanese mystery RPG Kiriakari, no lettering/UI/border. Reference is CHARACTER IDENTITY and painting style ONLY: Mio (upper-left short dark bob) and Shiori (upper-right long dark hair tied with red ribbon, ivory clothes with subtle red trim). Ignore lower two adult portraits.
Scene: warm, bittersweet memory from seven years earlier. A younger little Mio sits beside her older teenage sister Shiori on a modest wooden bench at a quiet Japanese rural railway platform on summer festival evening. Shiori leans slightly toward her and lets Mio hold a SMALL red paper lantern; the sisters' hands meet around its handle. They look toward each other with an unforced, gentle smile. Everyday modest summer clothes, Shiori's red hair ribbon recognizable, little Mio short bob. They are clearly siblings, no romantic framing. Foreground small lantern and hands, calm wooden station wall and a few distant festival lights, blue dusk beyond empty rails. No flooding, ghosts, threatening figures, funeral imagery or crowds.
Style: hand-painted Japanese2D narrative-game illustration matching portrait's restrained cel shapes and subtle paper grain, muted indigo/walnut/ivory, warm tiny amber/red lantern glow, clear expressive faces and natural hands. Cinematic medium-wide composition, the bench and whole relationship visible, tender memory with quiet mystery. NOT a photograph border or an image of someone holding a photo: depict the remembered moment itself. No words, watermark, captions, collage or panels.
```

### 地面材质

```text
Use case: stylized-concept. Asset: production material sampling sheet for a calm classic2D Japanese RPG, EXACT2 equal square texture panels side-by-side, total2:1. Opaque flat colour textures, orthographic top-down, NO lighting gradients, edges, shadows, borders, separator lines, words, props or scenery.
LEFT square: quiet dry shrine granite, muted warm gray with faint sage undertone, uniform fine soft stone grain, very subtle tiny weathering, low contrast, no individual stones, no cobbles, no joints or grout, no moss patches, no cracks or dark patches. This is the surface grain of one consistent stone material, not a paved scene.
RIGHT square: old indoor library walnut timber, warm desaturated medium-dark brown, fine restrained horizontal wood grain, very subtle wear, no plank seams, no large knots, no black bands, no directional light, no perspective. This is a continuous wood surface sampling tile, not boards drawn into a floor.
Each square independently seamless on all4edges with matching colour at edges. Consistent fine pixel-art texture character, understated low-noise detail, enough colour clarity for a warm night scene. Ground joints will be drawn separately by the game, so include NONE. Do not mix the two materials or feather the boundary. Exact equal square panels, no gaps.
```

