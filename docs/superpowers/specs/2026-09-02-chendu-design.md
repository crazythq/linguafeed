# 晨读：程序员英文新闻学习站

日期：2026-09-02  
状态：已确认，第一版按此实现

## 问题与目标

中文母语程序员需要通过官方英文时事与科技更新提升阅读能力，最终能直接看懂英文原文。晨读把「昨天的官方要闻」做成可对照阅读的晨报，并在阅读中积累单词与短语。

成功标准：

- 每天 06:00（Asia/Shanghai）能从官方 RSS/Atom 拿到前一日条目。
- 用户可以开关预置源与分类，可添加白名单内的官方 RSS。
- 对照阅读：英文分句 + 可开关的中文译文；点词/划短语可查义并写入生词本。
- 无登录：进度在本机，可整包 JSON 导出/导入。
- 无 LLM Key 时站点仍能打开、阅读、收藏。

## 非目标（第一版）

- 账号、云同步、评论。
- 听力、口语、间隔重复算法。
- 解析正文页 HTML、付费墙绕过、聚合站（Google News 等）。
- Reuters / AP 等已关闭公共 RSS 的源。
- 学习模式 D（读后测验）的完整实现。

## 方案

Next.js 应用 + 每日 JSON 简报（digest）。采集脚本拉取官方 feed，写成 `data/digests/YYYY-MM-DD.json`。学习界面只读这份简报。本地 `npm run collect` 可立即采集；生产用定时任务（每天 22:00 UTC = 北京时间 06:00）。

不采用 SQLite 常驻调度（预览环境进程不可靠），也不采用纯 GitHub Action 静态站（本地无法点一下刷新、自定义源难代理）。

## 信息架构

```
Cron 06:00 CST → CollectScript → Official RSS → DailyDigest JSON
User → 今日列表 → 对照阅读 → 生词本
User → 设置（源 / 分类 / API Key / 立即采集 / 导入导出）
```

页面：

| 路由 | 作用 |
| --- | --- |
| `/` | 今日（昨天要闻）按分类浏览 |
| `/read/[id]` | 对照阅读 |
| `/vocab` | 生词本 |
| `/settings` | 源、分类、Key、采集、导入导出 |

## 学习模式

第一版主模式为 **B 对照阅读**：英文正文 + 可开关的句级中文。

- **A 沉浸阅读**：同一数据，隐藏全部译文。第一版用阅读页开关实现。
- **C 先学后读**：打开该模式时先展示本篇关键词（从标题与分句本地抽取，最多 8 个）。每张卡按需查义，可加入生词本。点「开始阅读」后进入对照阅读，这些词在正文中高亮。无 LLM Key 时仍可学习与阅读。
- **D 读后测验**：架构预留，UI 标记即将推出。

阅读交互：

- 按句拆分；默认中英对照。
- 点击单词：弹出音标、中英释义、本句例句，可加入生词本。
- 划选两个及以上词：加入短语。
- 顶部始终有「阅读原文」（指向出版方链接）。

## 官方源与分类

只消费出版方自己的 RSS/Atom，不解析正文页 HTML。条目使用 feed 提供的标题、摘要或 `content:encoded`、链接、发布时间。

预置世界源：BBC World、NPR News、The Guardian World、UN News、Al Jazeera。  
预置科技源：GitHub Blog、AWS News Blog、Google Developers Blog、Microsoft DevBlogs、Cloudflare Blog、Kubernetes Blog。  
实现时逐个验证 feed；失效则从预置列表去掉。

预置分类：World、Business、Science、AI、Cloud、Open Source、Security、Release Notes。源有默认分类；标题关键词做弱分类，不用大模型做主分类。

采集边界：

- 站点级预置源：每天 06:00 全量写入当日 digest。
- 用户开关：只影响展示。
- 用户自定义源：域名必须在官方白名单内，经 `POST /api/collect` 现拉现译，结果写入该浏览器本地附加条目，不写共享 digest。

时区：过滤「昨天」使用 `Asia/Shanghai` 日历日。06:00 采集的是前一个上海日历日的条目。

## 数据形状

每日 digest：

```ts
type Digest = {
  date: string; // YYYY-MM-DD，上海时区的「昨天」
  collectedAt: string; // ISO
  items: DigestItem[];
  failures: { sourceId: string; error: string }[];
};

type DigestItem = {
  id: string;
  sourceId: string;
  category: string;
  title: string;
  url: string;
  publishedAt: string;
  sentences: { en: string; zh: string | null }[];
};
```

本地 `localStorage` 整包（可导出，不含 API Key 可选；Key 单独字段，导出默认排除）：

- `feeds.enabled` / `categories.enabled` / `customFeeds`
- `customItems`：自定义源拉取的附加条目
- `vocab[]`：`term`、`type: "word" | "phrase"`、`definition`、`sentence`、`articleId`、`articleTitle`、`createdAt`
- `readIds[]`
- `settings`：`learningMode`、`showTranslation`、`llmBaseUrl`、`llmModel`（Key 存本机，请求时带到自己的 API Route）

## 翻译与词典

采集后按句翻译并写入 digest，阅读页不等待整篇现场翻译。

1. 设置了 OpenAI 兼容 Key：句译与点词释义走该接口（短超时，失败降级）。
2. 否则：免费句译（LibreTranslate 或同类）+ 免费 Dictionary API，中文释义尽力而为。
3. 全部失败：仍展示英文，中文处显示「暂无译文」，不挡住阅读和收藏。

点词查义可在阅读时按需请求 `/api/define`，结果可缓存到生词本条目。

## 错误与空状态

- 某源超时或非 XML：跳过该源，digest 记录失败，设置页可见。
- 昨天 0 条：说明时区与「前一日」规则，并列出仍可阅读的最近一天。
- 翻译失败：英文可用。
- 自定义源不在白名单：拒绝，并说明只允许官方域名。
- 预览环境若无「昨天」digest：回退到仓库内最近一份种子数据。

## 技术选型

- Next.js App Router、TypeScript、Tailwind、shadcn/ui
- `fast-xml-parser` 解析 RSS/Atom
- 时区用 `Intl` 或 `luxon`
- `scripts/collect-news.ts` + README 中的 crontab / GitHub Action（`0 22 * * *` UTC）

## 测试要点

- 分句：缩写、引号、换行不会把段落切碎到不可读。
- 昨日过滤：上海时区边界（UTC 晚上对应上海次日）正确。
- 白名单：非官方域名被拒绝。
- 无 Key 时对照阅读仍能打开种子文章并收藏单词。
