/**
 * 视觉主题常量
 * 来源：docs/UI视觉规格-温绘.md §0 Tokens / §2 色板 / §3 字号阶梯
 * 调性：暗底靛青 + 灯火暖金 + 阵营彩；平涂 + 硬描边，零外部资源。
 * 所有面板只消费本文件的 C / FS / LAYOUT 令牌，换肤只改这里。
 */
import { Color } from 'cc';

function rgb (hex: string): Color {
    const h = hex.replace('#', '');
    return new Color(
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
        255,
    );
}

/** 布局常量（温绘 §0） */
export const LAYOUT = {
    W: 720, H: 1280,
    SAFE_X: 290,        // 可点击元素左右硬边界
    CONTENT_W: 580,     // 面板内容区标准宽 = SAFE_X × 2（禁止写 592/600/620 这类越界宽度）
    MARGIN: 32,
    GUTTER: 16,
    TOP_BAR_H: 100,
    HIT_MIN: 44,        // 最小热区
    HIT_GAP_MIN: 12,
    THUMB_LINE: 128,    // y <= 128 视为拇指热区
};

export const C = {
    // ---- 底色与面板 ----
    bg: rgb('#1E2A3C'),          // BG_MAIN 主背景
    bgDeep: rgb('#141C2B'),      // BG_DEEP 最底层（战斗背景）
    panel: rgb('#2C3B52'),       // BG_PANEL
    panelLight: rgb('#364766'),  // BG_CARD
    panelLine: rgb('#40536F'),   // LINE 默认描边
    hole: rgb('#2A1B24'),        // BG_HOLE 空槽
    mask: rgb('#000000'),

    // ---- 主色 / 辅色 / 强调 ----
    gold: rgb('#F5C451'),        // GOLD 主色
    goldDim: rgb('#C9902F'),     // GOLD_DEEP 底沿 / 按下
    goldLight: rgb('#FFF0C9'),   // GOLD_LIGHT
    green: rgb('#4CA863'),       // JADE 成功 / 治疗
    cyan: rgb('#3B8FD8'),        // AZURE 法术 / 信息
    red: rgb('#D9542F'),         // VERMILION 敌方 / 警示
    ember: rgb('#FF6B4A'),       // EMBER 暴击 / 合击
    star: rgb('#FFD76E'),        // STAR 星级
    rage: rgb('#63E0C8'),        // RAGE 怒气

    // ---- 文字 ----
    text: rgb('#F2EADC'),        // TXT_1 主文本（8.9:1）
    textSub: rgb('#AEBBD0'),     // TXT_2 次级
    textWeak: rgb('#7C8AA3'),    // TXT_3 禁用 / 空态
    textNum: rgb('#FFD76E'),     // TXT_NUM 关键数值
    textDown: rgb('#FF8B7A'),    // TXT_DOWN 扣血 / 失败
    textLink: rgb('#6FB7FF'),    // TXT_LINK 可点文本
    textDark: rgb('#3A2A10'),    // TXT_ON_GOLD 金底上的深字（金底绝不用白字）

    // ---- 品质：绿 蓝 紫 橙 红 ----
    q0: rgb('#5FB85F'),
    q1: rgb('#4A9BE8'),
    q2: rgb('#A96BE0'),
    q3: rgb('#F59A3C'),
    q4: rgb('#E8503C'),

    // ---- 阵营：魏 蜀 吴 群 ----
    camp1: rgb('#2E5FD9'),
    camp2: rgb('#D9542F'),
    camp3: rgb('#1FA5A0'),
    camp4: rgb('#8B5CF6'),

    // ---- 战场 ----
    hpBack: rgb('#2A1B24'),
    hpFill: rgb('#4CA863'),
    hpEnemy: rgb('#D9542F'),
    rageBack: rgb('#223049'),
    rageFill: rgb('#63E0C8'),
    slot: rgb('#2A1B24'),
    slotActive: rgb('#F5C451'),

    // ---- 按钮 ----
    btn: rgb('#F5C451'),          // 金底 + textDark
    btnDown: rgb('#C9902F'),
    btnDisable: rgb('#4A5468'),
    btnPrimary: rgb('#FF6B4A'),   // EMBER 主行动
    btnGhost: rgb('#2C3B52'),
};

/** 品质 → 颜色 */
export function qualityColor (q: number): Color {
    return [C.q0, C.q1, C.q2, C.q3, C.q4][Math.max(0, Math.min(4, q))];
}

/** 阵营 → 颜色 */
export function campColor (c: number): Color {
    return [C.camp4, C.camp1, C.camp2, C.camp3][Math.max(1, Math.min(4, c)) - 1];
}

/** 品质名 */
export const QUALITY_NAME = ['绿', '蓝', '紫', '橙', '红'];
/** 阵营名 */
export const CAMP_NAME = ['', '魏', '蜀', '吴', '群'];
/** 类型名 */
export const ROLE_NAME = ['', '物攻', '法攻', '辅助', '防御'];

/** 设计分辨率 */
export const DESIGN_W = 720;
export const DESIGN_H = 1280;
/** 可视安全半宽：9:19.5 机型可见设计宽度约 591（温绘 R2 红线） */
export const SAFE_HALF_W = LAYOUT.SAFE_X;

/** 字号阶梯（温绘 §3，下限 18） */
export const FS = {
    title: 36,
    h1: 32,
    h2: 28,
    body: 24,
    small: 20,
    tiny: 18,
};
