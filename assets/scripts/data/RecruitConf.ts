/**
 * 招募概率配置。
 * 权重按「每一名武将一份」累加，不是按品质均分。
 * 品质人数不同时，公示百分比必须用本文件现算，禁止再手填 4/12/28/56。
 */
import { HERO_CONF, HeroConf, Quality } from './HeroConf';

/** 主角不进池 */
export const RECRUIT_EXCLUDE_IDS: number[] = [1000];

export const RECRUIT_COST_ONE = 100;
export const RECRUIT_COST_TEN = 900;

/** 单名武将的品质权重。缺档或 ≤0 的武将不进池。 */
export const QUALITY_WEIGHT: { [q: number]: number } = {
    [Quality.Blue]: 56,
    [Quality.Purple]: 28,
    [Quality.Orange]: 12,
    [Quality.Red]: 4,
};

export interface QualityRate {
    quality: number;
    count: number;
    weight: number;
    ratio: number;
}

export function recruitPool (): HeroConf[] {
    const out: HeroConf[] = [];
    for (let i = 0; i < HERO_CONF.length; i++) {
        const hero = HERO_CONF[i];
        if (RECRUIT_EXCLUDE_IDS.indexOf(hero.id) >= 0) continue;
        const weight = QUALITY_WEIGHT[hero.quality] || 0;
        if (weight <= 0) continue;
        out.push(hero);
    }
    return out;
}

export function qualityRates (): { total: number; rates: QualityRate[] } {
    const pool = recruitPool();
    const bucket: { [q: number]: QualityRate } = {};
    let total = 0;
    for (let i = 0; i < pool.length; i++) {
        const hero = pool[i];
        const weight = QUALITY_WEIGHT[hero.quality] || 0;
        if (!bucket[hero.quality]) {
            bucket[hero.quality] = { quality: hero.quality, count: 0, weight: 0, ratio: 0 };
        }
        bucket[hero.quality].count += 1;
        bucket[hero.quality].weight += weight;
        total += weight;
    }
    const order = [Quality.Red, Quality.Orange, Quality.Purple, Quality.Blue];
    const rates: QualityRate[] = [];
    for (let i = 0; i < order.length; i++) {
        const row = bucket[order[i]] || { quality: order[i], count: 0, weight: 0, ratio: 0 };
        row.ratio = total > 0 ? row.weight / total : 0;
        rates.push(row);
    }
    return { total, rates };
}

/**
 * 两位小数百分比。四舍五入后的差额补给权重最大的一档，保证合计 100.00%。
 */
export function formatRatePercent (rates: QualityRate[]): string[] {
    const total = rates.reduce((sum, row) => sum + row.weight, 0);
    if (total <= 0) {
        const zeros: string[] = [];
        for (let i = 0; i < rates.length; i++) zeros.push('0.00%');
        return zeros;
    }
    const hundredths: number[] = [];
    let sum = 0;
    let maxIndex = 0;
    for (let i = 0; i < rates.length; i++) {
        const value = Math.round((rates[i].weight * 10000) / total);
        hundredths.push(value);
        sum += value;
        if (rates[i].weight > rates[maxIndex].weight) maxIndex = i;
    }
    hundredths[maxIndex] += 10000 - sum;
    const labels: string[] = [];
    for (let i = 0; i < hundredths.length; i++) {
        const value = hundredths[i];
        const whole = Math.floor(value / 100);
        const frac = value % 100;
        const fracText = frac < 10 ? '0' + frac : String(frac);
        labels.push(whole + '.' + fracText + '%');
    }
    return labels;
}

export function rollRecruitHero (rng: () => number = Math.random): number {
    const pool = recruitPool();
    let total = 0;
    for (let i = 0; i < pool.length; i++) total += QUALITY_WEIGHT[pool[i].quality] || 0;
    if (total <= 0 || pool.length === 0) return 0;
    let cursor = rng() * total;
    for (let i = 0; i < pool.length; i++) {
        cursor -= QUALITY_WEIGHT[pool[i].quality] || 0;
        if (cursor <= 0) return pool[i].id;
    }
    return pool[pool.length - 1].id;
}

/** 十连保底：末位改为紫或橙，与单次概率表分开公示。 */
export function rollPityHero (rng: () => number = Math.random): number {
    const pool = recruitPool();
    const up: HeroConf[] = [];
    for (let i = 0; i < pool.length; i++) {
        const quality = pool[i].quality;
        if (quality === Quality.Purple || quality === Quality.Orange) up.push(pool[i]);
    }
    if (!up.length) return rollRecruitHero(rng);
    const index = Math.floor(rng() * up.length);
    return up[Math.max(0, Math.min(up.length - 1, index))].id;
}
