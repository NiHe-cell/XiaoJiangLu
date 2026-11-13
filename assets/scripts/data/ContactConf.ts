/**
 * 客服与主体信息占位。
 * 全部留空。界面看到空值必须写「待填写 / 暂无法联系」，禁止编造邮箱、微信号、执照号或字号。
 * 主体路径已定为个体工商户；名称须等营业执照下来后，与 mp 后台主体逐字一致再填。
 */
export const CONTACT_CONF = {
    /** 个体工商户字号。空串 = 尚未填写 */
    entityName: '',
    /** 统一社会信用代码。空串 = 尚未填写 */
    licenseNo: '',
    /** 客服邮箱。空串 = 尚未填写，不能当作可联系 */
    email: '',
    /** 客服微信或公众号。空串 = 未填写，不要显示成已开通 */
    wechat: '',
    /** 联系地址。空串 = 尚未填写 */
    address: '',
};

export function filled (value: string): string {
    return (value || '').replace(/^\s+|\s+$/g, '');
}
