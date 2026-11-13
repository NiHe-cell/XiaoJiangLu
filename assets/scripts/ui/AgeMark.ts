/** 12+ 标识与健康游戏忠告。Graphics 画圆，不引入外部贴图。 */
import { Color, HorizontalTextAlignment, Node } from 'cc';
import { circleAdd, nd, txt } from '../core/Ui';
import { AGE_HINT, HEALTH_LINES, HEALTH_TITLE } from '../data/ComplianceConf';

const AGE_BLUE = new Color(0x1E, 0x88, 0xE5, 255);
const AGE_TEXT = new Color(0xC9, 0xB4, 0x8A, 255);
const HEALTH_COLOR = new Color(0x8A, 0x7A, 0x66, 255);
const WHITE = new Color(255, 255, 255, 255);

/** 直径默认 64。文字是 12+，底色是适龄蓝。 */
export function ageBadge (parent: Node, x: number, y: number, diameter = 64): Node {
    const node = nd('ageBadge', diameter, diameter, parent);
    node.setPosition(x, y);
    circleAdd(node, 0, 0, diameter / 2, AGE_BLUE);
    const label = txt(node, '12+', 20, WHITE, diameter, diameter);
    label.lineHeight = 24;
    return node;
}

export function ageHint (parent: Node, x: number, y: number, width = 560): void {
    const label = txt(parent, AGE_HINT, 20, AGE_TEXT, width, 64, x, y, HorizontalTextAlignment.CENTER, true);
    label.lineHeight = 28;
}

/** 从 topY 往下排标题和四行忠告。返回最后一行的 y。 */
export function healthBlock (parent: Node, x: number, topY: number, width = 560): number {
    const title = txt(parent, HEALTH_TITLE, 18, HEALTH_COLOR, width, 28, x, topY);
    title.lineHeight = 28;
    let y = topY - 32;
    for (let i = 0; i < HEALTH_LINES.length; i++) {
        const line = txt(parent, HEALTH_LINES[i], 18, HEALTH_COLOR, width, 28, x, y);
        line.lineHeight = 28;
        y -= 32;
    }
    return y + 32;
}
