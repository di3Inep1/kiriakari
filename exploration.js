/* Contextual exploration and practical NPC help for the opening two districts. */
(function(root){
  'use strict';
  const C=root.KiriCore,D=root.KiriData;
  const itemNames={guideLamp:'引灯',lockerKey:'维修箱黄铜钥匙',dryMatches:'油纸包好的防潮火柴',redThread:'旧日的红线',waterJar:'一罐清水',ricePaste:'调好的米糊',oldParcel:'寄给制灯铺的旧包裹',routeCard:'婆婆标过的送灯路线图'};
  function inventory(state){return state.items.map(id=>id==='guideLamp'?`引灯（${state.flags.lantern?'已留火种，可照见回忆':'熄灭，尚缺火种'}）`:itemNames[id]);}
  function isComplete(state,obj){
    const f=state.flags;
    switch(obj.action||obj.id){
      case 'old-lantern':return !!f.lampFound;
      case 'parcel':return !!(f.parcelTaken||f.parcelDelivered);
      case 'toolbox':return !!(f.matchesFound||f.lantern);
      case 'basket':return !!(f.threadTaken||f.helpedNagi);
      case 'lighting-table':return !!f.lantern;
      case 'workbench':return !!f.helpedNagi;
      case 'paste-table':return C.hasItem(state,'ricePaste')||!!f.helpedNagi;
      case 'well':return C.hasItem(state,'waterJar')||C.hasItem(state,'ricePaste')||!!f.helpedNagi;
      default:return false;
    }
  }
  function objectName(state,obj){
    const names={
      'old-lantern':state.flags.lampFound?'已经取空的引灯柜':'柜中的旧引灯',
      toolbox:state.flags.matchesFound?'取过火柴的维修箱':'上锁的维修箱',
      parcel:state.flags.parcelTaken?'空下来的包裹架':'未送达的包裹',
      basket:state.flags.threadTaken?'空下来的针线篮':'檐边的针线篮',
      workbench:state.flags.helpedNagi?'修好的纸灯':'待修的纸灯',
      'paste-table':C.hasItem(state,'ricePaste')?'已调好的糨糊台':'干结的糨糊台'
    };return names[obj.id]||obj.name;
  }
  function tasks(state){
    const list=[];
    if(!state.flags.lantern)list.push(['点亮引灯',!state.flags.lampFound?'进入站房调查旧灯；值班簿与莲能帮助寻找火种。':!C.hasItem(state,'lockerKey')?'引灯已找到。向莲询问火种的去处。':!state.flags.matchesFound?'莲借出了黄铜钥匙。站台东端的维修箱里备有防潮用品。':state.flags.windTried?'火柴仍在背包里。找个没有穿堂风的室内，再试着点燃。':'火柴已收进背包。选择它，试着亲手点亮引灯。']);
    if(state.flags.lantern&&!state.solved.includes('station'))list.push(['照见旧事',`${state.clues.includes('date')?'✓':'◇'} 回忆中的时刻表 · ${state.memories.includes('photo')?'✓':'◇'} 长椅上的合照（可回访）\n先读出祭典日期，再调查南侧检票闸门。`]);
    if(state.solved.includes('station')&&!state.solved.includes('shrine'))list.push(['前往月见神社','主街向北是神社，西侧是制灯铺。修补纸灯与送包裹都可稍后完成；绘马架也留着点灯线索。']);
    if(state.solved.includes('shrine'))list.push(['归舟灯阵 · 已完成','旧校书库已开放。未完成的包裹、纸灯与回忆仍可返回车站和灯见街寻找。']);
    if(state.flags.repairRequested&&!state.flags.helpedNagi)list.push(['修补纸灯 · 可稍后完成',`${state.flags.threadTaken?'✓':'◇'} 在回忆里找红线 · ${C.hasItem(state,'waterJar')||C.hasItem(state,'ricePaste')?'✓':'◇'} 石井取水 · ${C.hasItem(state,'ricePaste')?'✓':'◇'} 铺内调米糊；准备好后找婆婆，或在铺里的工作台修灯。`]);
    if(state.flags.helpedNagi)list.push(['修补纸灯 · 已完成','纸灯已经修好，婆婆教的归舟歌已记入线索。']);
    if(state.flags.parcelTaken)list.push(['迟到的包裹'+(state.flags.parcelDelivered?' · 已送达':''),state.flags.parcelDelivered?'婆婆收到了备用灯芯，并把送灯路线图交给你。':'站房里找到的包裹，收件人是灯见街的凪婆婆。']);
    return list;
  }
  function run(action,state,{talk,changed}){
    const has=id=>C.hasItem(state,id);
    const apply=(id,message)=>()=>{const result=C.explore(state,id);changed(result==='done'?message:null);};
    const record=(id)=>()=>{C.addClue(state,id);changed('线索已记入手记 · '+D.clues[id].title);};
    const note=text=>talk([{text}]);
    const light=()=>{
      if(state.flags.lantern)return note('灯芯已经留住火种。平时护成余烬，需要时再开启引灯，不必再次消耗火柴。');
      if(!state.flags.lampFound)return note('台上放着油壶和备用灯芯，火柴槽里只有用过的旧杆。西侧矮柜似乎还收着一盏灯。');
      if(!has('dryMatches'))return note('你检查了干燥的灯芯，仍然需要火种。值班簿提到站台东端的维修箱；莲保管着钥匙。');
      note('这张整灯台没有穿堂风，油壶和灯芯都备齐了。\n打开背包，选中防潮火柴，试着自己点亮引灯。');
    };
    const repair=()=>{
      if(state.flags.helpedNagi)return note('纸面已经补好，红线把灯骨牢牢绑在一起。灯下压着婆婆写的归舟歌，手记里也留了一份。');
      if(!state.flags.nagiMet)return note('灯骨松了，纸面也裂开一角。先问问主街上的凪婆婆，她知道该怎样修，别贸然把旧纸撕开。');
      if(!has('redThread'))return talk([{who:'nagi',text:'灯骨得先用红线绑稳。东边民居门旁有个针线篮，小时候你们常把线忘在那里。\n若只看到空篮，就用引灯看看它以前的样子。'}]);
      if(!has('ricePaste'))return talk([{who:'nagi',text:has('waterJar')?'清水已经带来了。进西边的制灯铺，东侧糨糊台上有干米糊；加一点清水，慢慢调开就好。':'还缺能粘纸的米糊。主街南边的石井有干净水罐，取一罐清水，再到西边制灯铺的糨糊台调开。'}]);
      talk([{who:'nagi',text:'红线和米糊都齐了。先绑灯骨，再补破纸，别把那一点光遮住。你愿意现在修好吗？',choices:[
        {text:'把红线穿过灯骨，用米糊补好纸面。',effect:()=>C.explore(state,'repair-lamp'),reply:[{text:'你一点点收紧红线，抚平粘好的纸边。婆婆扶稳灯架，暖光终于不再从裂口漏出去。'},{who:'nagi',text:'谢谢你肯在这里多停一会儿。月、山、川、舟——这是神社灯阵认路的歌，我把整首教给你。'},{who:'nagi',text:'那天，栞也是这样替大家补灯。可她不是从来不怕黑，只是怕别人先害怕。找到她时，也问问她自己想去哪里。'}]},
        {text:'我想先去神社，稍后再来。',reply:[{who:'nagi',text:'好，材料替你留着，什么时候回来都能修。神社在主街北边，绘马里也留着同一首歌。'}]}
      ]}],()=>changed(state.flags.helpedNagi?'红线与米糊已使用 · 修好纸灯，学会归舟歌':null));
    };
    if(action==='old-lantern'){
      if(state.flags.lampFound)return note('矮柜上留下一个浅浅的圆印。引灯已经收在你的随身物品里；柜里没有第二盏灯。');
      talk([{text:'矮柜上放着一盏木框旧灯。灯纸没有破，里面却没有一点火光。提柄上系着姐姐用过的红结。'},{who:'mio',text:'是姐姐的灯……先带上吧。灯芯是干的，只要找到火种，应该还能点亮。'}],apply('take-lamp','获得引灯（熄灭） · 还需要引燃用的道具'));return true;
    }
    if(action==='toolbox'){
      if(state.flags.matchesFound||state.flags.lantern){note('维修箱里只剩几件修轨工具。防潮火柴已经取过，不能重复拿取。');return true;}
      if(!has('lockerKey')){note('黄铜锁扣把维修箱扣得很紧。箱盖内侧夹着防潮油纸，站务员莲应该知道钥匙在哪里。');return true;}
      talk([{text:'黄铜钥匙正好转动锁芯。你在维修箱的干燥夹层里找到一包用油纸仔细包好的火柴。'},{who:'mio',text:'没有受潮。先把它放进背包。灯芯已经干了，试着自己点亮吧。'}],apply('open-toolbox','获得防潮火柴 · 可以点燃引灯'));return true;
    }
    if(action==='lighting-table'||action==='light-lantern'){light();return true;}
    if(action==='duty-log'){talk([{text:D.clues.dutyLog.text},{text:'末页另记着：「西侧寄物架上，还有一包要送去凪家灯铺的灯芯。别让做灯的人再等一个夜晚。」'}],record('dutyLog'));return true;}
    if(action==='parcel'){
      if(state.flags.parcelTaken){note('包裹架已经空了。那份寄给凪家灯铺的旧包裹，不会再被留在这里。');return true;}
      talk([{text:'包裹绳没有拆开。收件人写着「灯见街 · 凪家制灯铺」，寄件人的字迹是姐姐的。'},{who:'mio',text:'如果灯铺还在，就顺路送过去。总该有人收到这份等了太久的东西。'}],apply('take-parcel','接下支线 · 把旧包裹送给凪婆婆'));return true;
    }
    if(action==='waiting-bench'){talk([{text:'木椅的坐板被来往旅人磨得发亮，座面上空空的，像是一直为谁留着位置。'},{who:'mio',text:'等灯亮起来，再照照这张长椅。姐姐也许曾和我坐在这里。'}]);return true;}
    if(action==='office-window'){note('从旧窗望出去，站台的最东端放着一只加锁的维修箱。莲站在站台中央，风吹不到他的帽檐。');return true;}
    if(action==='basket'){
      if(state.flags.threadTaken||state.flags.helpedNagi){note('针线篮已经空了。红线已经取走，门旁的屋檐在风里轻轻响着。');return true;}
      if(state.phase!=='echo'){note('篮底留下红色线轴压过的圆印，里面却只有几根断线。这里像是漏掉了一小段过去。\n试试按 Q，用引灯看看旧日的针线篮。');return true;}
      talk([{text:'回忆里的针线篮中，红线还缠在木轴上。一段线尾从篮沿垂下，像在等人拾起。'},{who:'mio',text:'线还结实，可以把婆婆松开的灯骨重新绑好。'}],apply('take-thread','获得旧日的红线'));return true;
    }
    if(action==='well'){
      if(has('waterJar')||has('ricePaste')||state.flags.helpedNagi){note('井边的水仍然清凉。修灯需要的水已经准备过，不必再多拿一罐。');return true;}
      talk([{text:'你放下井绳，提起一桶清水。井沿摆着供制灯人取水的小罐，你洗净一只，装好清水。'},{who:'mio',text:'可以拿去制灯铺调开米糊。不能直接把水泼在旧灯纸上。'}],apply('draw-water','获得一罐清水 · 带到制灯铺的糨糊台'));return true;
    }
    if(action==='paste-table'){
      if(has('ricePaste')||state.flags.helpedNagi){note('米糊已经调好。薄薄一层就能补住旧纸，不需要再做一份。');return true;}
      if(!has('waterJar')){note('碗里的米糊已经干结，刷子却还完好。桌边的便笺写着：「街南石井取清水，少量慢调，不要直接湿透灯纸。」');return true;}
      talk([{text:'你沿着碗边一点点加入清水，用刷柄把干结的米糊调开。纸边蘸过薄糊，终于能重新贴合。'}],apply('mix-paste','清水已使用 · 获得调好的米糊'));return true;
    }
    if(action==='workshop-record'){talk([{text:D.clues.repairRecipe.text},{text:'旧样本夹着一张小纸条：「小栞借灯两盏，澪一盏，自己一盏。灯坏了就回来，不要自己硬撑。」'}],record('repairRecipe'));return true;}
    if(action==='workbench'){repair();return true;}
    if(action==='notice'){talk([{text:D.clues.festivalNotice.text},{who:'mio',text:'街边这些篮子、水井和铺子，原来都是祭典的一部分。先去问问做灯的人。'}],record('festivalNotice'));return true;}
    if(action==='ren'){
      if(!state.flags.renMet&&state.flags.lampFound)C.setFlag(state,'renMet');
      if(!state.flags.renMet){talk([{who:'ren',text:'你是澪吧。我是当班的莲。你的姐姐把一盏引灯留在站房西侧矮柜里，说妹妹回来时，要让她亲手找到。'},{who:'ren',text:'先沿站台往西，进木屋正面的门。值班簿和寄物架也留在里面；灯若熄着，就带来给我看看，我替你找火种。'}],()=>{C.setFlag(state,'renMet');changed('莲指出了站房入口 · 从西侧木屋正门进入');});return true;}
      if(!state.flags.lampFound){note('莲指了指站台西边木屋的正门：「进门后，西侧矮柜上就是引灯。不是窗边的值班簿，也不是寄物架上的包裹。」');return true;}
      if(!state.flags.lantern&&!has('lockerKey')){talk([{who:'ren',text:'果然熄了。灯芯还好，缺的是干燥的火柴。拿这把黄铜钥匙，到站台最东端打开维修箱，油纸夹层里有备用火种。'},{who:'ren',text:'找到火柴后放进背包，自己试试看。那箱子别硬撬，里面的火柴怕潮。'}],apply('borrow-key','莲借出维修箱钥匙 · 去站台东端找火柴'));return true;}
      if(!state.flags.lantern&&has('dryMatches')){note(state.flags.windTried?'莲看了看被吹黑的火柴头：「站台的风从铁道那边灌来。木屋里应该安稳些，剩下的火柴先收好。」':'莲指了指你带着的油纸包：「东西都齐了。打开背包试试吧，灯芯很干，火会自己告诉你还缺什么。」');return true;}
      if(!state.flags.lantern){note('莲说：「钥匙已经借给你了。维修箱在站台最东端，那盏石灯旁边。取到火柴后，打开背包试着使用。」');return true;}
      if(!state.flags.promisedRen){talk([{who:'ren',text:'引灯能照见旧事，却不能替你决定该记住谁。如果见到栞，请替我带句话：我们已经不害怕天亮了。',choices:[{text:'我答应你。天亮后，我们一起回去。',effect:()=>C.setFlag(state,'promisedRen'),reply:[{who:'ren',text:'谢谢。找不到路就来问我。火种已经留在灯芯里了；平时护成一点余烬，需要时再让它照亮旧事。'}]},{text:'我想先找到姐姐，再作答。',reply:[{who:'ren',text:'好，约定可以等。现在先按 Q 调查西边的时刻表，读出四位日期，再去南边的检票闸门。'}]}]}],()=>changed(state.flags.promisedRen?'约定已记下 · 莲不再独自等待':null));return true;}
      note(state.solved.includes('tower')?'莲握紧帽檐：「钟又开始走了。我会和婆婆替你们照亮归路，你去渡灯桥见她。」':!state.solved.includes('station')?'莲说：「按 Q 后看西边时刻表的背面。日期按月、月、日、日写成四位，再去南边的检票闸门。长椅的旧照片也别落下。」':!state.flags.parcelTaken?'莲想起站房的寄物架：「那包灯芯是寄给灯见街凪婆婆的。你若顺路，就带去吧。她做的灯，照过很多人回家的路。」':'莲说：「出站后沿主街走，凪婆婆就在西侧灯铺附近。北边是神社，东边是书库；被雾拦住时，先看看手记里缺哪一道机关。」');return true;
    }
    if(action==='nagi'){
      if(!state.flags.nagiMet){talk([{who:'nagi',text:'澪？引灯又亮了……栞小时候也提着它跑过这条街。你肯先帮婆婆看看这盏破灯吗？灯铺在西侧，材料散在街边。'},{who:'nagi',text:'灯骨要用红线绑稳，破纸要用米糊补好。东边民居的针线篮留着红线；石井在主街南边，取清水到铺里调米糊。',choices:[{text:'我去找材料。也请您说说姐姐的事。',reply:[{who:'nagi',text:'好，路不急着赶完。找到东西就回来问，我会告诉你还缺什么。'}]},{text:'我想先知道去姐姐那里的路。',reply:[{who:'nagi',text:'沿主街向北去月见神社，绘马会教你归舟歌。修灯可以稍后再做，婆婆一直在这里。'}]}]}],apply('meet-nagi','婆婆说明了修灯材料 · 请求已记入手记'));return true;}
      if(has('oldParcel')&&!state.flags.parcelDelivered){talk([{who:'nagi',text:'这是站房留下的包裹？是栞给灯铺订的备用灯芯。那天谁都顾着送人，竟没能把它送到。'},{text:'你把旧包裹交给婆婆。她抚平纸角，把标过位置的送灯路线图递给你。'},{who:'nagi',text:'北边神社、东边书库、再往后的钟楼——我把顺序标好了。灯芯我会留给回来的人。修灯材料若没找齐，再问我。'}],apply('deliver-parcel','旧包裹已送达 · 获得送灯路线图'));return true;}
      if(state.flags.helpedNagi){note(state.solved.includes('shrine')&&!state.solved.includes('tower')?'婆婆指向主街东边：「神社的灯已经应了。沿街去旧校书库吧；没送完的东西、没补好的灯，我们还会替你留着。」':state.solved.includes('tower')?'婆婆把修好的纸灯提起来：「这一次，谁都不用独自撑住一整个夜晚。你去见她，我们会到桥上等你。」':'婆婆说：「归舟歌已写进你的手记：月、山、川、舟。沿主街向北就到神社。东侧屋檐的纸鹤也藏着栞的一段心愿，记得用引灯照照。」');return true;}
      repair();return true;
    }
    return false;
  }
  root.KiriExploration={run,inventory,tasks,objectName,itemNames,isComplete};
})(globalThis);
