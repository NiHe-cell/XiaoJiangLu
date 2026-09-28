/**
 * 战斗界面：3×2 阵列 · 速度出手 · 怒气手动必杀 · 羁绊合击 · 倍速/自动
 * 坐标来源：docs/UI视觉规格-温绘.md §5.5 战斗 Battle（单位 150×180 / 技能条 cy=-350 / 控制条 cy=-456）
 */
import { _decorator, Component, Node, Color, Vec3, tween, UIOpacity, Label, HorizontalTextAlignment, VerticalTextAlignment } from 'cc';
import { nd, box, boxAdd, triAdd, txt, fullBg, gfx } from '../core/Ui';
import { C, FS, campColor, qualityColor } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, roleGlyph, hexColor } from './Common';
import { getHeroConf } from '../data/HeroConf';
import { getSkillConf } from '../data/SkillConf';
import { BOND_CONF } from '../data/BondConf';
import { getStageConf, STAGE_CONF } from '../data/StageConf';
import { BattleCore, Unit, Ev } from '../model/BattleCore';
import { BAL } from '../data/Balance';

const { ccclass } = _decorator;

const UW = 150;
const UH = 180;
const COLS = [-172, 0, 172];
const ENEMY_ROW = [450, 250];
const ALLY_ROW = [-2, -202];

interface View {
    node: Node; nameL: Label; hp: (v: number) => void; rage: ((v: number) => void) | null;
    x: number; y: number;
}

@ccclass('BattleCtrl')
export class BattleCtrl extends Component {
    private stageId = 0;
    private core: BattleCore | null = null;
    private views: { [uid: number]: View } = {};
    private skillBtns: { [uid: number]: Node } = {};
    private skillBars: { [uid: number]: (v: number) => void } = {};
    private speed = 1;
    private auto = false;
    private state: 'idle' | 'wait' | 'busy' | 'end' = 'idle';
    private pendingUid = -1;
    private roundL: Label | null = null;
    private tipL: Label | null = null;
    private logL: Label | null = null;
    private comboBtn: Node | null = null;
    private deadAllies = 0;
    private field: Node | null = null;

    setup (stageId: number): void { this.stageId = stageId; }

    start (): void {
        const s = getStageConf(this.stageId);
        const root = this.node;
        fullBg(root, C.bgDeep);
        topBar(root, s ? s.name : '战斗', () => {
            Fx.confirm('放弃本场战斗？体力不会返还', () => Router.back(), '放弃', '继续打');
        });

        // 回合 / 提示（y=520，敌阵上方）
        const stBar = nd('stBar', 580, 34, root);
        stBar.setPosition(0, 520);
        this.roundL = txt(stBar, '第 1 回合', FS.small, C.star, 200, 30, -200, 0);
        this.tipL = txt(stBar, '准备', FS.small, C.textSub, 400, 30, 90, 0);

        this.field = nd('field', 700, 1000, root);
        this.field.setPosition(0, 0);

        // ---- 组建单位 ----
        const units: Unit[] = [];
        let uid = 1;
        const bonds = Store.activeBonds();
        Store.data.lineup.forEach((confId, i) => {
            const a = Store.attrOf(confId);
            const c = getHeroConf(confId);
            let comboSkillId = 0; let bondId = 0;
            for (const b of bonds) {
                if (b.heroIds.indexOf(confId) >= 0 && b.heroIds.every((h) => Store.inLineup(h))) {
                    comboSkillId = b.comboSkillId; bondId = b.id; break;
                }
            }
            units.push({
                uid: uid++, side: 0, confId, slot: i,
                hp: a.hp, maxHp: a.hp, atk: a.atk, pdef: a.pdef, mdef: a.mdef, speed: a.speed,
                rage: 0, role: c.role, skillId: c.skillId, comboSkillId, bondId, alive: true, buffs: [],
            });
        });
        const level = s ? s.enemyLevel : 1;
        const pool = s ? s.enemyIds : [];
        // 敌人数走 BAL.stageEnemyCountFor：在关卡配置基础上按「我方上阵人数」封顶。
        // 直接照搬 enemyIds 会出现新手 3 人打 4 人 —— 裴策实测 107/108/203/204/207/208 胜率 0%。
        // 再叠一层「同武将最多复刻一次」：与 tools/sim.js 的 enemyCount() 同口径，
        // 否则 101 这种只配了 1 个敌将 id 的关卡会刷出 3 个一模一样的克隆体，
        // 且运行时结果对不上裴策那 1920 场带此封顶的实证数据。
        const enemyCount = pool.length && s
            ? Math.min(
                BAL.stageEnemyCountFor(s.chapter, s.index - 1, Store.data.lineup.length),
                Math.max(1, pool.length * 2),
            )
            : 0;
        for (let i = 0; i < enemyCount; i++) {
            const confId = pool[i % pool.length];
            const a = Store.enemyAttr(confId, level);
            const c = getHeroConf(confId);
            units.push({
                uid: uid++, side: 1, confId, slot: i,
                hp: a.hp, maxHp: a.hp, atk: a.atk, pdef: a.pdef, mdef: a.mdef, speed: a.speed,
                rage: 0, role: c.role, skillId: c.skillId, comboSkillId: 0, bondId: 0, alive: true, buffs: [],
            });
        }

        this.core = new BattleCore(units, this.stageId * 7919 + 13);
        for (const u of units) this.views[u.uid] = this.makeUnit(this.field, u);

        // ---- 中央战报条 cy=124 ----
        const log = nd('log', 576, 72, root);
        log.setPosition(0, 124);
        box(log, 12, new Color(24, 18, 13, 235), C.panelLine, 2);
        this.logL = txt(log, '两军对阵，战鼓将起', FS.body, C.textSub, 540, 40);

        // ---- 技能指令条 cy=-350 ----
        const bar = nd('skillBar', 580, 116, root);
        bar.setPosition(0, -350);
        box(bar, 14, new Color(28, 21, 15, 235), C.panelLine, 2);
        const mine = units.filter((u) => u.side === 0);
        const sxs = [-240, -144, -48, 48, 144, 240];
        mine.forEach((u, i) => {
            const b = nd('sk' + u.uid, 80, 80, bar);
            b.setPosition(sxs[i], 0);
            this.makeSkillBtn(b, u);
            this.skillBtns[u.uid] = b;
        });

        // ---- 控制条 cy=-456 ----
        const ctrl = nd('ctrl', 580, 96, root);
        ctrl.setPosition(0, -456);
        this.mkBtn(ctrl, -192, '自动：关', () => {
            this.auto = !this.auto;
            this.refreshCtrl();
            if (this.auto && this.state === 'wait') this.doAct(this.pendingUid, true);
        });
        this.mkBtn(ctrl, 0, '倍速 1x', () => {
            this.speed = this.speed === 1 ? 2 : (this.speed === 2 ? 3 : 1);
            this.refreshCtrl();
        }, 'speedBtn');
        this.comboBtn = this.mkBtn(ctrl, 192, '合击', () => {
            if (!this.core) return;
            const r = this.core.readyCombos();
            if (!r.length) { Fx.toast('暂无可合击羁绊'); return; }
            const evs = this.core.tryCombo(r[0]);
            if (evs) this.play(evs);
        }, 'comboBtn');

        this.refreshCtrl();
        this.scheduleOnce(() => this.nextTurn(), 0.6 / this.speed);
    }

    private autoLabel: Label | null = null;
    private speedLabel: Label | null = null;
    private comboLabel: Label | null = null;
    private hlTween: any = null;

    private mkBtn (parent: Node, x: number, text: string, fn: () => void, tag?: string): Node {
        const b = nd(tag || ('c' + x), 176, 72, parent);
        b.setPosition(x, 0);
        box(b, 14, C.btnGhost, C.goldDim, 2);
        const l = txt(b, text, FS.body, C.textSub, 176, 46);
        if (tag === 'speedBtn') this.speedLabel = l;
        if (tag === 'comboBtn') this.comboLabel = l;
        if (!tag) this.autoLabel = l;
        b.on(Node.EventType.TOUCH_END, fn);
        return b;
    }

    private refreshCtrl (): void {
        if (this.autoLabel) this.autoLabel.string = `自动：${this.auto ? '开' : '关'}`;
        if (this.speedLabel) this.speedLabel.string = `倍速 ${this.speed}x`;
    }

    private makeSkillBtn (b: Node, u: Unit): void {
        const c = getHeroConf(u.confId);
        box(b, 12, C.panel, qualityColor(c.quality), 2);
        boxAdd(b, -32, 6, 64, 56, 8, hexColor(c.avatarColor));
        triAdd(b, -38, 34, 18, campColor(c.camp), 'br');
        roleGlyph(gfx(b), c.role, 0, 6, 24, new Color(255, 255, 255, 215));
        txt(b, c.name, 18, C.text, 80, 22, 0, -14);
        const rg = nd('rg', 64, 8, b);
        rg.setPosition(0, -28);
        this.skillBars[u.uid] = this.mkBar(rg, 64, 8, C.rageFill, C.rageBack);
        b.on(Node.EventType.TOUCH_END, () => {
            if (this.state === 'end') return;
            if (this.state !== 'wait') { Fx.toast('不是该武将的回合'); return; }
            if (u.uid !== this.pendingUid) { Fx.toast('请等待当前武将行动'); return; }
            const uu = this.core!.get(u.uid);
            if (uu.rage < BAL.rageMax) { Fx.toast('怒气未满'); return; }
            this.doAct(u.uid, true);
        });
    }

    private mkBar (parent: Node, w: number, h: number, fill: Color, back: Color): (v: number) => void {
        box(parent, h / 2, back);
        const inner = nd('f', w, h, parent);
        inner.setPosition(0, 0);
        return (v: number) => {
            const r = Math.max(0, Math.min(1, v));
            const g = gfx(inner);
            g.clear();
            g.fillColor = fill;
            if (r > 0) { g.roundRect(-w / 2, -h / 2, Math.max(h, w * r), h, h / 2); g.fill(); }
        };
    }

    private makeUnit (parent: Node, u: Unit): View {
        const c = getHeroConf(u.confId);
        const isAlly = u.side === 0;
        const frontRow = u.slot < 3;
        const col = COLS[u.slot % 3];
        const y = isAlly ? ALLY_ROW[frontRow ? 0 : 1] : ENEMY_ROW[frontRow ? 0 : 1];
        const n = nd('u' + u.uid, UW, UH, parent);
        n.setPosition(col, y);
        box(n, 14, C.panel, qualityColor(c.quality), 3);
        // 名字条（品质色描边 + 白字）
        const nm = nd('nm', 130, 28, n);
        nm.setPosition(0, 74);
        box(nm, 8, C.panelLight, qualityColor(c.quality), 2);
        const nameL = txt(nm, c.name, 20, C.text, 126, 26);
        // 头像区（个人主色）
        boxAdd(n, -65, -40, 130, 96, 10, hexColor(c.avatarColor));
        // 阵营角标（左上三角，色 + 形状双编码）
        triAdd(n, -71, 86, 26, campColor(c.camp), 'br');
        // 类型纹样
        roleGlyph(gfx(n), c.role, 0, 8, 34, new Color(255, 255, 255, 215));

        const hpNode = nd('hp', 118, 14, n);
        hpNode.setPosition(0, -52);
        const hp = this.mkBar(hpNode, 118, 14, isAlly ? C.hpFill : C.hpEnemy, C.hpBack);
        hp(1);

        let rage: ((v: number) => void) | null = null;
        if (isAlly) {
            const rgNode = nd('rg', 118, 10, n);
            rgNode.setPosition(0, -70);
            rage = this.mkBar(rgNode, 118, 10, C.rageFill, C.rageBack);
            rage(0);
        }
        return { node: n, nameL, hp, rage, x: col, y };
    }

    private d (base: number): number { return base / this.speed; }

    private nextTurn (): void {
        if (!this.core || this.state === 'end') return;
        if (this.core.isEnd()) { this.finish(); return; }
        const uid = this.core.next();
        if (uid < 0) { this.finish(); return; }
        const u = this.core.get(uid);
        if (this.roundL) this.roundL.string = `第 ${this.core.round} 回合`;

        if (u.side === 1 || this.auto) {
            this.state = 'busy';
            this.doAct(uid, this.auto);
            return;
        }
        if (u.rage >= BAL.rageMax) {
            this.state = 'wait';
            this.pendingUid = uid;
            if (this.tipL) this.tipL.string = `${getHeroConf(u.confId).name} 怒气已满，点头像放大招`;
            this.highlight(uid, true);
            this.scheduleOnce(() => {
                if (this.state === 'wait' && this.pendingUid === uid) this.doAct(uid, false);
            }, this.d(8));
        } else {
            this.state = 'busy';
            if (this.tipL) this.tipL.string = `${getHeroConf(u.confId).name} 行动中`;
            this.scheduleOnce(() => this.doAct(uid, false), this.d(0.25));
        }
    }

    private highlight (uid: number, on: boolean): void {
        const b = this.skillBtns[uid];
        if (!b || !this.core) return;
        const c = getHeroConf(this.core.get(uid).confId);
        box(b, 12, on ? C.slotActive : C.panel, qualityColor(c.quality), on ? 4 : 2);
        boxAdd(b, -32, 6, 64, 56, 8, hexColor(c.avatarColor));
        triAdd(b, -38, 34, 18, campColor(c.camp), 'br');
        roleGlyph(gfx(b), c.role, 0, 6, 24, new Color(255, 255, 255, 215));
        txt(b, c.name, 18, on ? C.textDark : C.text, 80, 22, 0, -14);
        const o = b.getComponent(UIOpacity) || b.addComponent(UIOpacity)!;
        if (this.hlTween) { this.hlTween.stop(); this.hlTween = null; }
        if (on) {
            this.hlTween = tween(o).to(0.45, { opacity: 150 }).to(0.45, { opacity: 255 }).union().repeatForever();
            this.hlTween.start();
        } else {
            o.opacity = 255;
        }
    }

    private doAct (uid: number, useSkill: boolean): void {
        if (!this.core || this.state === 'end') return;
        this.state = 'busy';
        if (this.pendingUid === uid) { this.highlight(uid, false); this.pendingUid = -1; }
        const evs = this.core.act(uid, useSkill);
        this.play(evs);
    }

    private play (evs: Ev[]): void {
        let t = 0;
        for (const e of evs) {
            const ev = e;
            this.scheduleOnce(() => this.applyEv(ev), t);
            t += this.d(0.34);
        }
        this.scheduleOnce(() => {
            if (this.core && this.core.isEnd()) this.finish();
            else { this.state = 'idle'; this.nextTurn(); }
        }, t + this.d(0.2));
    }

    private applyEv (e: Ev): void {
        if (!this.core || !this.field) return;
        if (e.k === 'atk' || e.k === 'skill' || e.k === 'combo') this.lunge(e.from);

        if (e.k === 'atk') {
            const v = this.views[e.to];
            const from = this.core.get(e.from);
            if (v) {
                Fx.floatText(this.field, v.x, v.y + 30, e.crit ? `暴击 ${e.dmg}` : String(e.dmg),
                    e.crit ? C.ember : (from.side === 0 ? C.text : C.textDown), e.crit ? FS.title : FS.h1);
                Fx.hitFlash(this.field, v.x, v.y, UW, UH, C.red);
            }
            this.log(`${getHeroConf(from.confId).name} 攻击 ${getHeroConf(this.core.get(e.to).confId).name}，造成 ${e.dmg}`);
        } else if (e.k === 'skill') {
            const from = this.core.get(e.from);
            const sk = getSkillConf(e.skillId);
            this.log(`${getHeroConf(from.confId).name} 施放【${sk ? sk.name : '必杀'}】`);
            if (sk && sk.cast) Fx.floatText(this.field, 0, 200, sk.cast, C.gold, FS.h1, 50);
            for (let i = 0; i < e.to.length; i++) {
                const v = this.views[e.to[i]];
                if (!v) continue;
                if (e.dmg[i] > 0) {
                    Fx.floatText(this.field, v.x, v.y + 30, String(e.dmg[i]), e.crit[i] ? C.ember : C.text, FS.h1);
                    Fx.hitFlash(this.field, v.x, v.y, UW, UH, C.red);
                }
                if (e.heal[i] > 0) Fx.floatText(this.field, v.x, v.y + 30, `+${e.heal[i]}`, C.green, FS.h2);
            }
            Fx.shake(this.node, 6);
        } else if (e.k === 'combo') {
            const from = this.core.get(e.from);
            const bd = BOND_CONF.find((b) => b.id === e.bondId);
            Fx.floatText(this.field, 0, 220, `${bd ? bd.name : '羁绊'}·合击`, C.ember, FS.title, 60);
            this.log(`${getHeroConf(from.confId).name} 触发【${bd ? bd.name : '羁绊'}】合击！`);
            for (let i = 0; i < e.to.length; i++) {
                const v = this.views[e.to[i]];
                if (v) {
                    Fx.floatText(this.field, v.x, v.y + 30, String(e.dmg[i]), C.ember, FS.title);
                    Fx.hitFlash(this.field, v.x, v.y, UW, UH, C.red);
                }
            }
            Fx.shake(this.node, 16);
        } else if (e.k === 'heal') {
            const v = this.views[e.to];
            if (v) Fx.floatText(this.field, v.x, v.y + 30, `+${e.val}`, C.green, FS.h2);
        } else if (e.k === 'die') {
            const v = this.views[e.uid];
            const u = this.core.get(e.uid);
            if (v) {
                const o = v.node.getComponent(UIOpacity) || v.node.addComponent(UIOpacity)!;
                tween(o).to(0.25, { opacity: 55 }).start();
            }
            if (u.side === 0) this.deadAllies++;
            this.log(`${getHeroConf(u.confId).name} 阵亡`);
        } else if (e.k === 'end') {
            this.log(e.winner === 0 ? '敌军溃败！' : '我军败退…');
        }

        // 同步血条 / 怒气
        for (const key of Object.keys(this.views)) {
            const id = Number(key);
            const u = this.core.get(id);
            const v = this.views[id];
            v.hp(u.hp / Math.max(1, u.maxHp));
            if (v.rage) v.rage(u.rage / BAL.rageMax);
            const sb = this.skillBars[id];
            if (sb) sb(u.rage / BAL.rageMax);
        }
        if (this.comboLabel) {
            const ready = this.core.readyCombos().length > 0;
            this.comboLabel.string = ready ? '合击！' : '合击';
            this.comboLabel.color = ready ? C.star : C.textSub;
        }
    }

    private lunge (uid: number): void {
        const v = this.views[uid];
        if (!v || !this.core) return;
        const u = this.core.get(uid);
        const dir = u.side === 0 ? 1 : -1;
        const p = v.node.position.clone();
        tween(v.node)
            .to(this.d(0.12), { position: new Vec3(p.x, p.y + 28 * dir, 0) })
            .to(this.d(0.16), { position: new Vec3(p.x, p.y, 0) })
            .start();
    }

    private log (s: string): void {
        if (this.logL) this.logL.string = s;
    }

    private finish (): void {
        if (this.state === 'end') return;
        this.state = 'end';
        const w = this.core ? this.core.winner() : 1;
        Store.addStamina(-BAL.staminaPerStage);
        const stars = w === 0 ? BAL.calcStars(this.core ? this.core.round : 0, this.deadAllies) : 0;
        const s = getStageConf(this.stageId);
        const chapter = s ? s.chapter : 1;
        const index = s ? s.index - 1 : 0;
        const first = w === 0 && (Store.data.stageStars[this.stageId] || 0) === 0;
        let reward = { exp: 0, silver: 0, items: [] as { id: number; n: number }[] };
        let bonus = { exp: 0, silver: 0, jade: 0 };
        if (w === 0) {
            reward = BAL.stageReward(chapter, index, s ? s.enemyLevel : 1);
            if (first) bonus = BAL.firstClearBonus(chapter, index);
            Store.addPlayerExp(reward.exp + bonus.exp);
            Store.addSilver(reward.silver + bonus.silver);
            Store.addJade(bonus.jade);
            for (const it of reward.items) Store.addItem(it.id, it.n);
            if (stars > (Store.data.stageStars[this.stageId] || 0)) Store.data.stageStars[this.stageId] = stars;
            // 记「本关已通关」而不是「下一关已通关」：解锁判定是 id <= maxStageId + 1，
            // 若记 nextId 会把下一关也判成已通关，直接跳关。
            if (this.stageId >= Store.data.maxStageId) Store.data.maxStageId = Math.min(this.stageId, 599);
            Store.save();
        }
        const rounds = this.core ? this.core.round : 0;
        this.scheduleOnce(() => {
            Router.go('result', { stageId: this.stageId, win: w === 0, stars, reward, bonus, first, rounds });
        }, this.d(0.9));
    }
}

export function buildBattlePanel (parent: Node, param?: any): Node {
    const root = nd('Battle', 720, 1280, parent);
    root.setPosition(0, 0);
    const ctrl = root.addComponent(BattleCtrl)!;
    // 兜底必须给一个真实存在的关卡 id：旧值 1 在 StageConf 里查不到（关卡从 101 起）
    ctrl.setup(param && param.stageId ? param.stageId : (STAGE_CONF[0] ? STAGE_CONF[0].id : 101));
    return root;
}
