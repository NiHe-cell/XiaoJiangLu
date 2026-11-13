/**
 * 游戏内可翻页阅读的协议摘要。
 * 完整成稿在 docs/提审材料。这里不填主体名称、邮箱、执照号。
 */
import { CONTACT_CONF, filled } from './ContactConf';

export const PRIVACY_SUMMARY: string[] = [
    '本游戏不设服务端。关卡、武将、货币、阵容与设置只保存在你的设备本地，不会上传。',
    '静默登录只取临时凭证，不获取昵称、头像、手机号。不收集地理位置、相册、麦克风、通讯录和好友关系。',
    '广告由微信广告平台展示。设备信息与广告标识符由该平台按其规则处理，用于投放和频次控制。',
    '你可以在设置里清除本地存档。拒绝隐私授权后仍可继续游玩，激励视频会直接发放奖励，插屏和 Banner 不再展示。',
    '微信后台《用户隐私保护指引》需在个体工商户小游戏账号提交并通过审核后，才能从这里打开正式文本。',
];

export const AGREEMENT_PAGES: string[] = [
    '《骁将录》用户服务协议（游戏内摘要，版本 V1.0）。运营主体类型为个体工商户。字号、统一社会信用代码、联系地址尚未填写，提审前须与营业执照及微信账号主体一致。',
    '本游戏是竖屏卡牌收集与回合制策略游戏。免费游玩，不设充值、内购或虚拟支付。运营靠广告。虚拟物品只在游戏内使用，不能兑换现金或转让。',
    '不设账号。进度在本机。清除微信缓存、卸载或换设备可能导致存档丢失。',
    '分享是可选功能，不分享也能玩。广告加载失败或你拒绝隐私授权时，游戏流程不中断。',
    '未成年人请在监护人指导下游戏。本游戏不设充值，不会产生消费。',
    '意见反馈在设置页。客服邮箱未填写前，无法通过邮件联系。请勿把占位符当成真实联系方式。',
];

/** 设置页「意见反馈」要展示的行。空字段明确写待填写。 */
export function contactStatusLines (): string[] {
    const name = filled(CONTACT_CONF.entityName);
    const license = filled(CONTACT_CONF.licenseNo);
    const email = filled(CONTACT_CONF.email);
    const wechat = filled(CONTACT_CONF.wechat);
    const address = filled(CONTACT_CONF.address);
    return [
        name ? ('运营主体：' + name) : '运营主体：个体工商户（名称待填写）',
        license ? ('统一社会信用代码：' + license) : '统一社会信用代码：待填写',
        email ? ('客服邮箱：' + email) : '客服邮箱：待填写，暂无法联系',
        wechat ? ('客服微信：' + wechat) : '客服微信：未填写',
        address ? ('联系地址：' + address) : '联系地址：待填写',
    ];
}

export function contactEmail (): string {
    return filled(CONTACT_CONF.email);
}
