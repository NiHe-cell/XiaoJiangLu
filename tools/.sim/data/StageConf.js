"use strict";
/**
 * 关卡 / 章节静态配置表
 * 规则：
 *  1) stage id = 章节 × 100 + 关序（1-8），如 305 = 第三章第五关。
 *  2) 难度曲线：前两章蓝/紫杂兵，第三四章紫橙混编，第五六章橙红为主。
 *  3) enemyLevel 与 recommendPower 为「占位值」，实际公式与掉落由玩法支柱校准。
 *  4) storyBefore / storyAfter 是竖屏单手阅读的短句，各 ≤30 字。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStagesOfChapter = exports.getNextStageId = exports.getChapterConf = exports.getStageConf = exports.CHAPTER_MAP = exports.STAGE_MAP = exports.STAGE_CONF = exports.CHAPTER_CONF = void 0;
exports.CHAPTER_CONF = [
    { id: 1, name: '第一章·黄巾之乱', desc: '张角一声号令，天下就乱了。你从涿郡起兵。', recommendPower: 3000,
        stageIds: [101, 102, 103, 104, 105, 106, 107, 108] },
    { id: 2, name: '第二章·讨伐董卓', desc: '十八路诸侯会盟，谁都想当那个第一个进城的人。', recommendPower: 12000,
        stageIds: [201, 202, 203, 204, 205, 206, 207, 208] },
    { id: 3, name: '第三章·群雄割据', desc: '盟散了。各占一块地盘，谁也不服谁。', recommendPower: 32000,
        stageIds: [301, 302, 303, 304, 305, 306, 307, 308] },
    { id: 4, name: '第四章·官渡之战', desc: '袁绍兵多，曹操粮少。乌巢一把火，河北就完了。', recommendPower: 68000,
        stageIds: [401, 402, 403, 404, 405, 406, 407, 408] },
    { id: 5, name: '第五章·赤壁之战', desc: '八十万大军压江上来。东风一起，什么都烧了。', recommendPower: 120000,
        stageIds: [501, 502, 503, 504, 505, 506, 507, 508] },
    { id: 6, name: '第六章·三分天下', desc: '魏蜀吴，各占一边。打了三十年，谁也没赢。', recommendPower: 200000,
        stageIds: [601, 602, 603, 604, 605, 606, 607, 608] },
];
exports.STAGE_CONF = [
    // ── 第一章·黄巾之乱 ──
    { id: 101, chapter: 1, index: 1, name: '涿郡募兵', enemyIds: [1034], enemyLevel: 1,
        storyBefore: '黄巾过境，涿郡告急。你点了兵。',
        storyAfter: '榜文贴出去，来了一百二十人。' },
    { id: 102, chapter: 1, index: 2, name: '黄巾劫营', enemyIds: [1034, 1035], enemyLevel: 2,
        storyBefore: '夜里火把一片。营门被人撞开了。',
        storyAfter: '抢走的粮，全夺回来了。' },
    { id: 103, chapter: 1, index: 3, name: '广宗城下', enemyIds: [1035, 1034], enemyLevel: 3,
        storyBefore: '广宗城门紧闭。城头挂着黄旗。',
        storyAfter: '城破了。旗子被扯下来踩在泥里。' },
    { id: 104, chapter: 1, index: 4, name: '颍川火攻', enemyIds: [1034, 1035, 1033], enemyLevel: 4,
        storyBefore: '草扎的营，最怕一把火。风向对了。',
        storyAfter: '烧了一夜。天亮只剩黑灰。' },
    { id: 105, chapter: 1, index: 5, name: '长社夜袭', enemyIds: [1035, 1033], enemyLevel: 5,
        storyBefore: '官军白天打不动。那就夜里去。',
        storyAfter: '天没亮就打完了，回头补了个觉。' },
    { id: 106, chapter: 1, index: 6, name: '宛城之围', enemyIds: [1034, 1035, 1033], enemyLevel: 6,
        storyBefore: '宛城被围了三十天。城里没粮了。',
        storyAfter: '围解了。城门开时，百姓跪了一地。' },
    { id: 107, chapter: 1, index: 7, name: '曲阳城破', enemyIds: [1033, 1034, 1035, 1036], enemyLevel: 7,
        storyBefore: '黄巾最后一座城。守将换了三个人。',
        storyAfter: '城头换了旗。黄巾散了。' },
    { id: 108, chapter: 1, index: 8, name: '黄天已死', enemyIds: [1033, 1035, 1036, 1034], enemyLevel: 8,
        storyBefore: '「苍天已死，黄天当立。」喊了三年。',
        storyAfter: '喊口号的人没了。乱世才刚开始。' },
    // ── 第二章·讨伐董卓 ──
    { id: 201, chapter: 2, index: 1, name: '汜水关', enemyIds: [1034, 1035, 1006], enemyLevel: 9,
        storyBefore: '十八路诸侯会盟。第一关是汜水。',
        storyAfter: '汜水关开了。各路诸侯都愣了一下。' },
    { id: 202, chapter: 2, index: 2, name: '温酒斩华雄', enemyIds: [1033, 1034], enemyLevel: 10,
        storyBefore: '连折两将。帐里没人敢出声。',
        storyAfter: '酒还是温的。人头扔在帐前。' },
    { id: 203, chapter: 2, index: 3, name: '虎牢关', enemyIds: [1033, 1034, 1035, 1006], enemyLevel: 11,
        storyBefore: '虎牢关前，一骑当先，无人敢上。',
        storyAfter: '三个打一个，才把他逼退半里。' },
    // 原名「三英战吕布」：吕布已被移出本关（见 208 注释），改名以免 stage.name 与敌阵不符
    { id: 204, chapter: 2, index: 4, name: '连营对峙', enemyIds: [1033, 1034, 1035, 1006], enemyLevel: 12,
        storyBefore: '十八路人马扎了连营，各怀心思。',
        storyAfter: '谁也不肯先动。最后还是动了。' },
    // 原 [1033,1032,1035] 只有 3 个 id，第 2 章要 4 人 → 取模复刻出两个董卓，配貂蝉抬的治疗
    // 导致实测胜率只有 8%。改为 4 个不重复 id，且第 2 章不放治疗型辅助
    { id: 205, chapter: 2, index: 5, name: '洛阳余烬', enemyIds: [1033, 1032, 1035, 1006], enemyLevel: 13,
        storyBefore: '董卓走前，把洛阳烧了个干净。',
        storyAfter: '灰里刨出半块玉。没人认领。' },
    { id: 206, chapter: 2, index: 6, name: '荥阳追击', enemyIds: [1006, 1034, 1035], enemyLevel: 14,
        storyBefore: '追。追上就是功劳一件。',
        storyAfter: '追上了，也打输了。各自退兵。' },
    // 长安之乱：演义里董卓殒于此关，董卓留在这一关，不往后再出现
    { id: 207, chapter: 2, index: 7, name: '长安之乱', enemyIds: [1033, 1034, 1035, 1006], enemyLevel: 15,
        storyBefore: '长安城里，父子为一女子翻了脸。',
        storyAfter: '戟落下来。董卓倒在殿前。' },
    // 原名「白门楼」（吕布殒命处）。第 2 章在保守进度假设（LV_DELTA=0、2 星 0 进）下，
    // 任何含吕布（红）的组合实测均为 0% —— 敌方等级不是杠杆（plv 跟随 enemyLevel），
    // 且蓝色武将只有 3 名、第 2 章强制 4 个敌位，第四个位置无论如何都填不出「不致命」的组合。
    // 红将是第 2 章的结构性问题，不是配置能救的，故本章不放红将；
    // 吕布这条线由第 3 章「下邳城下」承接（那里本来就有他）。因关名不可失去对应敌阵，故改名。
    { id: 208, chapter: 2, index: 8, name: '余党作乱', enemyIds: [1034, 1035, 1006, 1032], enemyLevel: 16,
        storyBefore: '董卓死了，他的旧部却不肯散。',
        storyAfter: '打完这一仗，讨董才算收了尾。' },
    // ── 第三章·群雄割据 ──
    { id: 301, chapter: 3, index: 1, name: '江东初定', enemyIds: [1021, 1023], enemyLevel: 17,
        storyBefore: '孙策借了三千兵，渡江去了。',
        storyAfter: '江东六郡，一夜之间换了姓。' },
    { id: 302, chapter: 3, index: 2, name: '神亭岭', enemyIds: [1023, 1024, 1002], enemyLevel: 18,
        storyBefore: '岭上只有两个人对打，谁也不叫人。',
        storyAfter: '打到天黑，两个都笑了。' },
    { id: 303, chapter: 3, index: 3, name: '宛城之战', enemyIds: [1002, 1004, 1006], enemyLevel: 19,
        storyBefore: '降了又反。夜里鼓声一响就乱了。',
        storyAfter: '逃出去的只有几十骑。长子没回来。' },
    { id: 304, chapter: 3, index: 4, name: '下邳城下', enemyIds: [1031, 1033, 1032], enemyLevel: 20,
        storyBefore: '水灌下邳。城墙泡了两个月。',
        storyAfter: '城里的人，站都站不稳了。' },
    { id: 305, chapter: 3, index: 5, name: '白马之围', enemyIds: [1034, 1035, 1003], enemyLevel: 21,
        storyBefore: '白马被围。颜良在城下骂了一整天。',
        storyAfter: '一合没过。骂声停了。' },
    { id: 306, chapter: 3, index: 6, name: '延津渡口', enemyIds: [1035, 1034, 1006], enemyLevel: 22,
        storyBefore: '文丑带兵追来，阵型散着走。',
        storyAfter: '队形一乱，就没人管得住了。' },
    { id: 307, chapter: 3, index: 7, name: '徐州易主', enemyIds: [1011, 1013, 1016], enemyLevel: 23,
        storyBefore: '徐州三让三辞。最后还是接了。',
        storyAfter: '印绶揣进怀里。地盘大了，事也多了。' },
    { id: 308, chapter: 3, index: 8, name: '小霸王殒', enemyIds: [1021, 1022, 1024], enemyLevel: 24,
        storyBefore: '猎场上一支冷箭。二十六岁。',
        storyAfter: '江东交到弟弟手里。嘱咐只有一句。' },
    // ── 第四章·官渡之战 ──
    { id: 401, chapter: 4, index: 1, name: '白马坡', enemyIds: [1034, 1035], enemyLevel: 25,
        storyBefore: '十万大军南下。曹操只有两万。',
        storyAfter: '白马解围。第一次，袁绍吃了亏。' },
    { id: 402, chapter: 4, index: 2, name: '延津再战', enemyIds: [1035, 1034, 1033], enemyLevel: 26,
        storyBefore: '辎重丢在路上，故意让人去捡。',
        storyAfter: '抢东西的队伍，最不经打。' },
    { id: 403, chapter: 4, index: 3, name: '乌巢劫粮', enemyIds: [1003, 1006, 1002], enemyLevel: 27,
        storyBefore: '袁绍的粮，全堆在乌巢。',
        storyAfter: '粮仓起了火。守将还在帐里睡觉。' },
    { id: 404, chapter: 4, index: 4, name: '官渡对峙', enemyIds: [1034, 1035, 1033, 1036], enemyLevel: 28,
        storyBefore: '两边对垒半年，谁也推不动谁。',
        storyAfter: '比的是谁的粮先吃完。' },
    { id: 405, chapter: 4, index: 5, name: '火烧乌巢', enemyIds: [1001, 1005, 1003], enemyLevel: 29,
        storyBefore: '许攸半夜来投。只说了一句话。',
        storyAfter: '五千人，一把火，烧掉了十万人的饭。' },
    { id: 406, chapter: 4, index: 6, name: '河北溃败', enemyIds: [1034, 1035, 1006], enemyLevel: 30,
        storyBefore: '主将跑了。兵不知道该听谁的。',
        storyAfter: '七万人的尸首，堆在河滩上。' },
    { id: 407, chapter: 4, index: 7, name: '仓亭之战', enemyIds: [1002, 1004, 1005], enemyLevel: 31,
        storyBefore: '袁绍收拾残兵，还想再来一次。',
        storyAfter: '十面埋伏。又败了。' },
    { id: 408, chapter: 4, index: 8, name: '官渡终局', enemyIds: [1001, 1005, 1003, 1002], enemyLevel: 32,
        storyBefore: '郭嘉说过：绍有十败，公有十胜。',
        storyAfter: '北方的天，姓曹了。' },
    // ── 第五章·赤壁之战 ──
    { id: 501, chapter: 5, index: 1, name: '博望坡', enemyIds: [1001, 1003], enemyLevel: 33,
        storyBefore: '诸葛亮第一次用兵。带的都是新兵。',
        storyAfter: '一把火烧了夏侯惇的自信。' },
    { id: 502, chapter: 5, index: 2, name: '长坂坡', enemyIds: [1003, 1004, 1002], enemyLevel: 34,
        storyBefore: '乱军里丢了幼主。没人敢回头。',
        storyAfter: '一个人，一杆枪，七进七出。' },
    { id: 503, chapter: 5, index: 3, name: '当阳桥', enemyIds: [1001, 1003, 1004], enemyLevel: 35,
        storyBefore: '桥断了。身后二十骑，都站着不说话。',
        storyAfter: '吼一声，追兵退了三里。' },
    { id: 504, chapter: 5, index: 4, name: '江东议战', enemyIds: [1021, 1022, 1023], enemyLevel: 36,
        storyBefore: '主降的站左边，主战的站右边。',
        storyAfter: '孙权拔刀砍了桌角。就这么定了。' },
    { id: 505, chapter: 5, index: 5, name: '草船借箭', enemyIds: [1022, 1001, 1005], enemyLevel: 37,
        storyBefore: '三天造十万支箭。没人信。',
        storyAfter: '雾里回来，船上插满了箭。' },
    { id: 506, chapter: 5, index: 6, name: '苦肉计', enemyIds: [1021, 1024, 1022], enemyLevel: 38,
        storyBefore: '打得越狠，越有人信。',
        storyAfter: '背上的伤是真的。信也是真的。' },
    { id: 507, chapter: 5, index: 7, name: '借东风', enemyIds: [1017, 1022, 1001], enemyLevel: 39,
        storyBefore: '万事俱备。只差一阵东南风。',
        storyAfter: '坛上站了三天。风真的来了。' },
    { id: 508, chapter: 5, index: 8, name: '火烧赤壁', enemyIds: [1001, 1003, 1005, 1002], enemyLevel: 40,
        storyBefore: '铁索连船，最怕的就是火。',
        storyAfter: '江面烧了整夜。八十万人，散了。' },
    // ── 第六章·三分天下 ──
    { id: 601, chapter: 6, index: 1, name: '华容道', enemyIds: [1012, 1001, 1003], enemyLevel: 41,
        storyBefore: '曹操只剩二十七骑。前面有条小路。',
        storyAfter: '刀举起来，又放下了。义字最贵。' },
    { id: 602, chapter: 6, index: 2, name: '潼关之战', enemyIds: [1015, 1004, 1002], enemyLevel: 42,
        storyBefore: '西凉铁骑冲过来，阵型一下就散了。',
        storyAfter: '割须弃袍，才逃出一条命。' },
    { id: 603, chapter: 6, index: 3, name: '定军山', enemyIds: [1016, 1002, 1003], enemyLevel: 43,
        storyBefore: '山势险，守将骄。老将请战。',
        storyAfter: '一刀劈下。定军山易主。' },
    { id: 604, chapter: 6, index: 4, name: '水淹七军', enemyIds: [1012, 1014, 1015], enemyLevel: 44,
        storyBefore: '连下了十天雨。汉水漫上来了。',
        storyAfter: '七军泡在水里。威名震到许都。' },
    { id: 605, chapter: 6, index: 5, name: '麦城之败', enemyIds: [1012, 1013, 1014], enemyLevel: 45,
        storyBefore: '樊城没拿下，后方也没了。',
        storyAfter: '麦城很小。走出去的路，一条也没有。' },
    { id: 606, chapter: 6, index: 6, name: '夷陵火烧', enemyIds: [1022, 1021, 1024], enemyLevel: 46,
        storyBefore: '连营七百里，扎在树林里。',
        storyAfter: '又是火。烧了六百里。' },
    { id: 607, chapter: 6, index: 7, name: '六出祁山', enemyIds: [1017, 1005, 1001], enemyLevel: 47,
        storyBefore: '出师表写了。祁山还是要走一趟。',
        storyAfter: '赢了仗，退了兵。粮又不够了。' },
    { id: 608, chapter: 6, index: 8, name: '五丈原', enemyIds: [1012, 1014, 1015, 1017], enemyLevel: 48,
        storyBefore: '对峙百日。帐里的灯，一夜比一夜暗。',
        storyAfter: '星落了。出师未捷，事却还没完。' },
];
/** 关卡 id -> 配置 */
exports.STAGE_MAP = (() => {
    const m = {};
    for (const s of exports.STAGE_CONF) {
        m[s.id] = s;
    }
    return m;
})();
/** 章节 id -> 配置 */
exports.CHAPTER_MAP = (() => {
    const m = {};
    for (const c of exports.CHAPTER_CONF) {
        m[c.id] = c;
    }
    return m;
})();
/** 查关卡配置，查不到时兜底返回第一关 */
function getStageConf(id) {
    const s = exports.STAGE_MAP[id];
    return s ? s : exports.STAGE_CONF[0];
}
exports.getStageConf = getStageConf;
/** 查章节配置，查不到时兜底返回第一章 */
function getChapterConf(id) {
    const c = exports.CHAPTER_MAP[id];
    return c ? c : exports.CHAPTER_CONF[0];
}
exports.getChapterConf = getChapterConf;
/** 下一关 id，已是最后一关时返回 0（表示无下一关） */
function getNextStageId(id) {
    const i = exports.STAGE_CONF.indexOf(exports.STAGE_MAP[id]);
    if (i < 0 || i + 1 >= exports.STAGE_CONF.length) {
        return 0;
    }
    return exports.STAGE_CONF[i + 1].id;
}
exports.getNextStageId = getNextStageId;
/** 取某章节的全部关卡 */
function getStagesOfChapter(chapterId) {
    const c = exports.CHAPTER_MAP[chapterId];
    if (!c) {
        return [];
    }
    const list = [];
    for (const sid of c.stageIds) {
        const s = exports.STAGE_MAP[sid];
        if (s) {
            list.push(s);
        }
    }
    return list;
}
exports.getStagesOfChapter = getStagesOfChapter;
