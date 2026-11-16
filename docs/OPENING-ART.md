# 开场探索新增素材

以下素材均由内置 image_gen 生成并保存至 E:/jrpg/assets/，没有修改生成原图的透明通道。家具按 4 列 × 2 行等分使用；完成状态按物件单独切换，榻榻米按完整席面放置，木纹用于连续长木板的表面。

## exploration-props.png

```
Use case: stylized-concept. Asset type: transparent 2D top-down JRPG prop atlas for an existing Japanese mystery pixel RPG, matching reference tileset muted walnut wood, slate grey, ivory paper, moss greens. Exactly 4 columns x 2 rows, 8 equal-sized cells, no gutters drawn, no labels. One complete freestanding furniture arrangement per cell, with all its objects attached properly, feet aligned near bottom 90% of each cell. Genuine alpha transparent background around all sprites, NO floor tile, no backdrop, no bounding boxes or text.
Row 1 left to right:
1. A low wooden station storage cabinet with one small UNLIT ivory paper hand lantern resting on top, closed doors, worn dark walnut wood. No external glow.
2. A locked old railway maintenance tool chest on two short legs, small brass keyhole and subtle dark-blue steel corner braces, lid shut, no text.
3. A small round moss-grey stone village well with a modest wooden crossbeam, rope and small water pail resting on the rim. Clearly open dark water hole. Entire compact well fits cell.
4. A low traditional lantern maker workbench with a partly torn ivory paper lantern frame resting on it, loose bamboo ribs, a red cord, no person.
Row 2 left to right:
5. A low woven sewing basket containing one RED thread spool and a short trailing red thread, on a tiny wooden stool. Clearly recognisable red spool, no floor.
6. A low wooden parcel shelf holding a single cream paper parcel tied with string and a little folded paper tag with NO lettering.
7. A small station clerk desk with one open bound duty ledger and a pen, no lettering or readable text.
8. A low craft table with one earthenware rice-paste bowl, a flat brush, a small clay water jug, no lettering.
Orthographic top-down three-quarter view consistent with classic Japanese pixel RPG furniture sprites. Crisp pixel clusters and dark outlines, no photorealism, no glossy 3D, no diagonal isometric diamonds. Uniform sprite scale, isolated fully inside each equal cell. NO people, NO writing, NO symbols, NO surrounding cast-shadow blobs. Keep all eight sprite backgrounds actually transparent.
```

## exploration-props-cleared.png

```
Use case: precise-object-edit. Edit this existing transparent 4-column x 2-row RPG furniture atlas. Keep its exact canvas size, grid, pixel style, palettes, alignment, scale and alpha background. Only make these state variants: row1 column1 remove the little unlit lantern from the cabinet top, leaving the identical cabinet with a clear wooden surface; row1 column4 repair the torn paper lantern resting on the workbench with intact ivory paper; row2 column1 remove the red thread spool and trailing cord from the open sewing basket, leaving the identical empty basket and stool; row2 column2 remove the tied paper parcel, leaving the identical empty shelf. Keep the other four sprites exactly unchanged. Do not add floors, text, labels, glows or backgrounds. Genuine transparent alpha outside every sprite. This will be the collected/completed state atlas for the exact same objects.
```

## interior-wood-grain.png

```
Use case: stylized-concept. Asset type: seamless low-contrast wood grain MATERIAL texture for a Japanese 2D pixel-art RPG floor. Use the reference tileset only for its muted traditional palette and pixel-art material style.
Create one completely flat, orthographic, evenly lit, edge-to-edge repeating texture of warm grey walnut wood grain, horizontal fine fibres, subtle tiny natural tonal variation. It is a MICROTEXTURE inside long floorboards, NOT an arrangement of boards. No plank outlines, no joints, no rectangles, no grid, no border, no bevel, no cast shadow, no objects, no writing, no knots larger than 2 percent of image width. Consistent hue and brightness across all edges; tileable left/right and top/bottom. Restrained pixel clusters, moderate detail that stays quiet behind characters and furniture. Dark desaturated walnut/taupe brown, avoid orange varnish, bright golden streaks, excessive dark scratches or high contrast black lines. Fully opaque flat material filling the entire canvas.
```

## tatami-mat.png

```
Use case: stylized-concept. Asset type: one flat tatami mat sprite for an orthographic 2D Japanese pixel-art RPG. Exactly one complete rectangular tatami mat, top-down plan view without perspective, long axis vertical, length exactly twice width. Woven muted straw-grey olive rush fibres with tiny quiet horizontal weave, two slim dark desaturated forest-green cloth strips on its two LONG edges. No border on the two short edges. Uniform flat lighting, subtle restrained pixel clusters, no damage, no black lines through the centre, no multiple panels, no grids, no text, no objects, no floor, no shadow, no thickness. Genuine transparent alpha background with a narrow clear margin around the entire single mat. Fill almost all available height. Preserve a calm low-contrast palette matching the reference old Japanese wooden RPG interiors, avoid yellow neon green or busy repeating patterns.
```
