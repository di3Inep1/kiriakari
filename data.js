(function (root) {
  'use strict';
  const zones = {
    station: { name: '雾灯车站', reading: 'KIRIAKARI STATION', sub: '末班车停在昨日。', atlas: [0, 0], spawn: [49, 73], links: ['town'],
      objects: [
        { id: 'ren', name: '莲', label: '站务员', x: 65, y: 58, character: 2, action: 'ren' },
        { id: 'station-door', name: '进入站房', action: 'go-station-office', mark:'exit' },
        { id: 'toolbox', name: '上锁的维修箱', action:'toolbox',mark:'inspect',support:'maintenance-chest',focusOffset:{x:0,y:-.45} },
        { id: 'waiting-bench', name: '候车长椅', phase:'present',action:'waiting-bench',mark:'inspect',support:'photo-bench',focusOffset:{x:.78,y:-.45} },
        { id: 'timetable', name: '褪色的时刻表', x: 25, y: 43, action: 'date', mark: 'inspect' },
        { id: 'photo', name: '长椅上的合照', phase: 'echo', action: 'photo', mark: 'memory', support: 'memory-photo', focusOffset: { x:0,y:-.18 } },
        { id: 'station-lock', name: '检票闸门', x: 83, y: 53, action: 'puzzle-station', mark: 'puzzle',support:'station-ticket-gate',focusOffset:{x:0,y:-.75} },
        { id: 'to-town', name: '前往灯见街', x: 90, y: 74, action: 'go-town', mark: 'exit' }
      ] },
    town: { name: '灯见街', reading: 'AKARIMI STREET', sub: '每盏灯下，都有人等待。', atlas: [1, 0], spawn: [22, 72], links: ['station', 'shrine', 'archive', 'river'],
      objects: [
        { id: 'nagi', name: '凪婆婆', label: '制灯人', x: 35, y: 57, character: 3, action: 'nagi' },
        { id: 'workshop-door', name: '进入制灯铺', action:'go-town-workshop',mark:'exit' },
        { id: 'well', name: '街南的石井', action:'well',mark:'inspect',support:'town-well',focusOffset:{x:0,y:-.5} },
        { id: 'basket', name: '檐边的针线篮', action:'basket',mark:'inspect',support:'thread-basket',focusOffset:{x:0,y:-.35} },
        { id: 'notice', name: '祭典告示', x: 66, y: 43, action: 'notice', mark: 'inspect' },
        { id: 'crane', name: '檐下的纸鹤', x: 68, y: 72, phase: 'echo', action: 'crane', mark: 'memory', support: 'eave-crane', focusOffset: { x: 0, y: -.17 } },
        { id: 'to-station', name: '雾灯车站', x: 12, y: 72, action: 'go-station', mark: 'exit' },
        { id: 'to-shrine', name: '月见神社', x: 72, y: 34, action: 'go-shrine', mark: 'exit' },
        { id: 'to-archive', name: '旧校书库', x: 90, y: 58, action: 'go-archive', mark: 'exit' },
        { id: 'to-river', name: '渡灯桥', x: 49, y: 84, action: 'go-river', mark: 'exit' }
      ] },
    shrine: { name: '月见神社', reading: 'TSUKIMI SHRINE', sub: '月落之时，归舟将至。', atlas: [0, 1], spawn: [50, 79], links: ['town'],
      objects: [
        { id: 'lanterns', name: '归舟祭灯台', x: 51, y: 46, support:'shrine-altar', action: 'puzzle-shrine', mark: 'puzzle' },
        { id: 'mural', name: '被雨洗去的绘马', x: 24, y: 55, action: 'lanternOrder', mark: 'inspect' },
        { id: 'shrine-shiori', name: '栞的身影', label: '回声', x: 69, y: 60, phase: 'echo', character: 1, action: 'shrine-shiori' },
        { id: 'to-town', name: '返回灯见街', x: 50, y: 84, action: 'go-town', mark: 'exit' }
      ] },
    archive: { name: '旧校书库', reading: 'THE FORGOTTEN ARCHIVE', sub: '不是每一个空白，都意味着遗忘。', atlas: [1, 1], spawn: [50, 79], links: ['town', 'tower'],
      objects: [
        { id: 'records', name: '祭典记录柜', x: 50, y: 48, action: 'puzzle-archive', mark: 'puzzle' },
        { id: 'ledger', name: '值日生的手记', x: 25, y: 58, action: 'chronology', mark: 'inspect', support: 'ledger-desk', focusOffset: { x: .2, y: -.72 } },
        { id: 'tape', name: '旧录音机', x: 75, y: 63, phase: 'echo', action: 'tape', mark: 'memory', support: 'recorder-desk', focusOffset: { x: -.36, y: -.72 } },
        { id: 'to-tower', name: '通往钟楼', x: 85, y: 56, action: 'go-tower', mark: 'exit' },
        { id: 'to-town', name: '返回灯见街', x: 50, y: 84, action: 'go-town', mark: 'exit' }
      ] },
    tower: { name: '十三刻钟楼', reading: 'THE THIRTEENTH BELL', sub: '有人用七年，等一声再见。', atlas: [0, 2], spawn: [50, 79], links: ['archive', 'river'],
      objects: [
        { id: 'gears', name: '停转的钟芯', x: 51, y: 45, action: 'puzzle-tower', mark: 'puzzle' },
        { id: 'marks', name: '齿轮旁的刻痕', x: 22, y: 57, action: 'clockMarks', mark: 'inspect' },
        { id: 'tower-shiori', name: '栞', label: '守钟人', x: 72, y: 61, phase: 'echo', character: 1, action: 'tower-shiori' },
        { id: 'to-archive', name: '返回书库', x: 36, y: 84, action: 'go-archive', mark: 'exit' },
        { id: 'to-river', name: '前往渡灯桥', x: 85, y: 73, action: 'go-river', mark: 'exit' }
      ] },
    river: { name: '渡灯桥', reading: 'THE LANTERN CROSSING', sub: '请把名字，留给明天。', atlas: [1, 2], spawn: [20, 65], links: ['town', 'tower'],
      objects: [
        { id: 'names', name: '桥边的姓名碑', x: 32, y: 44, phase: 'echo', action: 'names', mark: 'memory' },
        { id: 'river-shiori', name: '栞', label: '最后的约定', x: 71, y: 57, character: 1, action: 'finale' },
        { id: 'to-town', name: '返回灯见街', x: 12, y: 71, action: 'go-town', mark: 'exit' },
        { id: 'to-tower', name: '返回钟楼', x: 87, y: 40, action: 'go-tower', mark: 'exit' }
      ] }
  };
  zones['station-office']={name:'站房候车室',reading:'STATION OFFICE',sub:'末班车没有带走的东西，都留在这里。',atlas:[1,1],parent:'station',returnAt:[6,8],links:['station'],objects:[
    {id:'old-lantern',name:'柜中的旧引灯',action:'old-lantern',mark:'inspect',support:'lamp-cabinet',focusOffset:{x:.55,y:-1.0}},
    {id:'duty-log',name:'站务值班簿',action:'duty-log',mark:'inspect',support:'duty-desk',focusOffset:{x:0,y:-.65}},
    {id:'parcel',name:'未送达的包裹',action:'parcel',mark:'inspect',support:'parcel-shelf',focusOffset:{x:0,y:-.6}},
    {id:'lighting-table',name:'整灯台',action:'lighting-table',mark:'inspect',support:'lighting-desk',focusOffset:{x:0,y:-.55}},
    {id:'office-window',name:'朝向站台的旧窗',action:'office-window',mark:'inspect',support:'office-window-main'},
    {id:'office-exit',name:'返回站台',action:'go-station',mark:'exit'}
  ]};
  zones['town-workshop']={name:'凪家的制灯铺',reading:'NAGI’S LANTERN WORKSHOP',sub:'竹篾与米糊，能把断开的灯纸重新连起来。',atlas:[1,1],parent:'town',returnAt:[7,9],links:['town'],objects:[
    {id:'workbench',name:'待修的纸灯',action:'workbench',mark:'inspect',support:'repair-bench',focusOffset:{x:0,y:-.8}},
    {id:'paste-table',name:'干结的糨糊台',action:'paste-table',mark:'inspect',support:'paste-bench',focusOffset:{x:-.3,y:-.55}},
    {id:'workshop-record',name:'制灯旧样本',action:'workshop-record',mark:'inspect',support:'pattern-desk',focusOffset:{x:0,y:-.65}},
    {id:'workshop-exit',name:'返回灯见街',action:'go-town',mark:'exit'}
  ]};
  const clues = {
    dutyLog:{title:'站务的防潮记录',place:'站房 · 值班簿',text:'引灯收在站房西侧矮柜。防潮火柴锁在站台最东边的维修箱，黄铜钥匙由莲保管。使用物品请打开背包；整灯台旁没有穿堂风，旧窗上的火痕像是试过许多次。'},
    repairRecipe:{title:'制灯人的修补法',place:'制灯铺 · 旧样本',text:'先用红线绑稳灯骨，再用清水调开干米糊，薄薄刷在破纸边缘。针线篮在东侧民居檐边；主街南边的石井备有干净的水罐，糨糊台就在制灯铺东侧。'},
    rescueRoute:{title:'七年前的送灯路线',place:'凪婆婆 · 旧包裹',text:'包裹里是栞没来得及送到的备用灯芯。婆婆在旧路线图上指出：北边月见神社保存印钥，东边书库留下祭典记录，再往后才能抵达钟楼。图角写着：「先把害怕的人送上列车，再数剩下的灯。」'},
    festivalNotice:{title:'灯见街的祭典告示',place:'灯见街 · 主街',text:'七月十六日，灯见祭。制灯铺在主街西侧，取水到街南石井；散落的针线请送回东侧民居檐边的篮子。月见神社沿主街往北。请为每盏灯写下一个不愿忘记的名字。'},
    date: { title: '祭典的日期', place: '雾灯车站 · 回忆', text: '时刻表背面写着：「七月十六日，灯见祭。日期写成四位数字，就是我们回家的暗号。」检票闸门上的四个数字槽依次为月、月、日、日。' },
    lanternOrder: { title: '归舟之歌', place: '月见神社 · 回忆', text: '「先见月，后见山；山脚有川，川上有舟。」灯阵要依照歌谣逐盏点亮；点错时，可从头再来。' },
    chronology: { title: '那一夜的先后', place: '旧校书库 · 回忆', text: '手记的墨迹浮现：「栞先在车站寄信，才去借灯。借灯之后，她开了旧闸。最后，她独自敲响了钟。」记录柜要从左到右排出事件的先后。' },
    clockMarks: { title: '守钟人的刻痕', place: '十三刻钟楼 · 回忆', text: '「上针指九点，中针指三点，下针指六点。」每次转动一个轮，会带动下一个轮顺时针一刻；下轮会带动上轮。十二点是初始位置。' }
  };
  const memories = {
    photo: { title: '01 · 没有人被留下', place: '雾灯车站 · 长椅', text: '合照背面，栞写着：「如果迷了路，就在原地等我。姐姐永远会回来接你。」照片里的澪，手里也握着一盏红纸灯。', tag: '等待' },
    crane: { title: '02 · 一千只纸鹤', place: '灯见街 · 屋檐', text: '孩子的声音从纸里传来：「姐姐说，一千只纸鹤能许愿。可她只要了一只——她说，剩下的愿望应该留给活着的人。」', tag: '愿望' },
    tape: { title: '03 · 没寄出的道歉', place: '旧校书库 · 录音机', text: '栞的声音很轻：「澪，对不起。我说我不怕，其实我很怕。我想活着看你长大。如果你能听见，请替我看看以后的春天。」', tag: '真心' },
    names: { title: '04 · 还没有写完的名字', place: '渡灯桥 · 姓名碑', text: '碑上不是死者的名单，而是被灯送上末班车的生还者。最后一行是「澪」。栞留在这场回忆里，是为了让妹妹走出去。', tag: '归途' }
  };
  const endings = {
    departure: { number: 'I', name: '始发列车', en: 'THE FIRST TRAIN', color: '#d9b88a', lead: '你带着那封信，走出了雾。', paragraphs: ['你没有许下能够拯救一切的诺言。你只是把红纸灯留在站台上，坐进那列终于愿意开动的列车。', '雾灯町退成了车窗上的一抹光。很久以后，你已经记不清姐姐的声音，却总会在七月十六日，替她多点一盏灯。', '你学会了继续生活。有些答案，仍留在那座没有天亮的小镇。'], after: '有些告别，不需要等到所有答案。' },
    keeper: { number: 'II', name: '永夜的守灯人', en: 'KEEPER OF THE ETERNAL EVE', color: '#91c4c6', lead: '第十三次钟声，没有响起。', paragraphs: ['你接过栞手里的灯。她的身影在你的拥抱里慢慢变轻，像终于落地的一片雪。', '从此，街上的灯不会熄灭，列车不会远行。你记得每一个人的名字，却逐渐忘了自己为什么来到这里。', '又一个祭典前夜，车站收到一封信。信封上的笔迹，和你的一模一样。'], after: '你留住了所有人，也留住了这个夜晚。' },
    nameless: { number: 'III', name: '无名之晨', en: 'A MORNING WITHOUT NAMES', color: '#b6bdd4', lead: '你打碎了钟，让时间重新开始。', paragraphs: ['钟芯碎裂的瞬间，灯火一盏一盏升上天空。街道、书页、桥上的名字，都变成了白色的雾。', '天亮以后，你在废弃车站醒来。口袋里有一张没有署名的旧照片。看着照片，你无缘无故地哭了。', '你救回了明天，却再也不知道，那个一直等你的人叫什么名字。'], after: '时间往前走了。记忆留在了昨天。' },
    dawn: { number: 'IV', name: '与你重逢的黎明', en: 'UNTIL WE MEET AT DAWN', color: '#f3cf95', lead: '这一次，你终于叫出了她的名字。', paragraphs: ['「栞。」你把四段回忆写进灯纸。你记得她的等待、愿望、恐惧，也记得她想活下去的真心。你终于不再只把她当作一个救了所有人的传说。', '莲和凪婆婆从街的另一端走来。每一盏写着姓名的灯，都接住了一小片夜色。没有人需要独自留在这里。第十三次钟声响了。', '姐姐握了握你的手。「这一次，不用在原地等我。去看看以后的春天吧。」', '七年后第一次日出，照进真正的雾灯车站。澪把红丝带系在行李上，走向正在醒来的小镇。那张合照里，姐姐终于笑得不再勉强。'], after: '我们会告别，但我们不会失去彼此。' }
  };
  const positions = {
    station: root.KiriMaps.maps.station.anchors,
    town: root.KiriMaps.maps.town.anchors,
    'station-office':root.KiriMaps.maps['station-office'].anchors,
    'town-workshop':root.KiriMaps.maps['town-workshop'].anchors,
    shrine: { lanterns: [14,13], mural: [6,12], 'shrine-shiori': [19,15], 'to-town': [14,22] },
    archive: { records: [13,5], ledger: [7,14], tape: [19,15], 'to-tower': [23,5], 'to-town': [13,20] },
    tower: { gears: [12,7], marks: [6,12], 'tower-shiori': [17,13], 'to-archive': [6,20], 'to-river': [20,18] },
    river: { names: [11,5], 'river-shiori': [26,11], 'to-town': [2,11], 'to-tower': [33,11] }
  };
  Object.entries(zones).forEach(([id, zone]) => {
    zone.spawn = root.KiriMaps.maps[id].spawn;
    zone.objects.forEach(object => { [object.x, object.y] = positions[id][object.id]; });
  });
  root.KiriData = { zones, clues, memories, endings,
    characters: { mio: { name: '澪', portrait: 0 }, shiori: { name: '栞', portrait: 1 }, ren: { name: '莲', portrait: 2 }, nagi: { name: '凪婆婆', portrait: 3 } },
    puzzleNames: { station: '没有日期的车票', shrine: '归舟灯阵', archive: '祭典之夜', tower: '第十三次钟声' },
    hints: {
      station: ['线索会留在旧事发生的地方。试着在回忆中调查车站的时刻表。', '四位数字写的是灯见祭的日期，月份也需要补齐两位。', '七月十六日 → 0、7、1、6。'],
      shrine: ['现世的绘马已经褪色，回忆里的字也许还清晰。', '歌谣描述了先看见的月，再到山、川，最后抵达的舟。', '依次点亮「月 → 山 → 川 → 舟」。'],
      archive: ['书库的值日手记记录了那一夜。在回忆中调查它。', '寄信早于借灯，借灯早于开闸，最后才是敲钟。', '从左到右排为「寄信 → 借灯 → 开闸 → 敲钟」。'],
      tower: ['切换回忆，调查齿轮旁的刻痕。每个轮也会带动下一个轮。', '目标是上轮九点、中轮三点、下轮六点。下轮转动也会带动上轮。', '先重置，再转动上轮一次、下轮两次即可。']
    }
  };
})(globalThis);
