# 手提引灯的明灭状态

日期：2026-11-17。

引灯本体分为未点燃、余烬、火焰三态：未获得时隐藏；获得但尚未用火柴点燃时显示冷灰玻璃与黑灯芯；点燃后现世保留一颗弱余烬，开启引灯进入回忆时显示三帧火苗和暖色灯罩。首次点燃短暂燃起后落到余烬；切换时局部微光用300ms平滑过渡，开启略微扬起，行走保留原提灯摆动。回忆状态照亮手部与衣摆周围，现世地面光池与光晕降为微弱余光。

灯外轮廓、提手与持握位置固定。桌面原生16×22像素，手机10×14像素，不用单格拉伸。减少动态效果时固定火苗帧、取消摆动与呼吸并立即切换光照；关闭装饰粒子不会隐藏用于辨识状态的灯芯。背面朝向仍将灯置于人物后方。

## 素材

内置image_gen基于assets/guide-lantern.png生成透明五帧图集，保存为assets/guide-lantern-states.png。第一帧熄灭，第二帧余烬，后三帧为火苗。统一裁切范围及等比缩放，导入assets/guide-lantern-states-native-32.png（50×14）与assets/guide-lantern-states-native-48.png（80×22）。运行时逐帧按原生尺寸取图，不重新拉伸或裁切。

## 验证

42项规则检查通过。新增--hand-lamp-preview实测未获得隐藏、三种状态、动画换帧、切换回忆/现世、减少动态效果、390px手机原生尺寸；预览preview-hand-lamp-unlit-detail.png、preview-hand-lamp-ember-detail.png、preview-hand-lamp-flame-detail.png、preview-hand-lamp-mobile.png。--lighting-only继续复验实际开局拿灯、背包点火、移动四向提灯与遮挡、关闭装饰粒子和减少动态效果。

## 完整生成提示词

参考图：assets/guide-lantern.png，作为造型与材质参考。

```text
Use case: stylized-concept. Create a production animation/state sprite strip based on the reference handheld lantern. A transparent canvas with EXACTLY FIVE equal cells in one horizontal row. Reference image defines the object design: tiny antique dark-wood rectangular Japanese carrying lantern, curved brown handle, brass hinge rings, simple dark lattice and cream glass. Keep EXACTLY the same silhouette, outer frame, handle, perspective, scale, position and registration across all five cells; no swinging or deformation. Only the glass interior and wick vary. Cell0: completely unlit, smoky cool-grey glass, visible dark wick, no warm pixels and no glow. Cell1: dim ember only, dark brown-grey glass and a single tiny muted red-orange coal near bottom-center, no bright panels. Cell2: active flame poseA, small yellow-orange flame inside lower-center, amber glass with brighter golden core, tiny warm edge highlights on wooden frame. Cell3: identical active lantern, flame leans slightly left, a little narrower. Cell4: identical active lantern, flame slightly taller and leaning right. All active frames clearly brighter than ember. Preserve the lantern body itself. Intended on-screen size about16x22pixels desktop,10x14pixels phone, so clear chunky pixel clusters and restrained detail are essential. Top-down RPG character holds it beside their thigh. No external glow or background, no shadow halo, no terrain, no people, no text, no grid lines. Fully transparent outside each lantern including the handle hole. Generous equal padding. Do not enlarge the flame beyond the lantern glass.
```

