// assets/bangumi.js
// 你可以把这份示例改成自己的完整数据；只要保持字段名一致即可。
/**
 * 字段说明：
 * - id: 唯一 ID
 * - mainTitle: 日文原名
 * - otherTitle: 中文译名 / 英文名
 * - year: 年份（数字）
 * - episodes: 话数（数字）
 * - rating: 评分（0-10）
 * - tags: 标签数组（字符串）
 * - cover: 相对路径到海报
 * - status: "watching" | "planned" | "finished" 等
 * - desc: 简介
 */
const BANGUMI_DATA = [
    {
        id: "kny",
        mainTitle: "鬼滅の刃",
        otherTitle: ["鬼灭之刃", "Kimetsu no Yaiba", "Demon Slayer"],
        year: 2019,
        episodes: 26,
        rating: 8.7,
        tags: ["热血", "奇幻", "战斗"],
        cover: "https://moegirl.uk/images/1/18/%E9%AC%BC%E7%81%AD%E4%B9%8B%E5%88%8323.jpg",
        // cover: "assets/posters/kny.jpg",
        status: "finished",
        desc: "灶门炭治郎为治愈鬼化的妹妹祢豆子而踏上的历练之旅。"
    },
];

