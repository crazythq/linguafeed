# 晨读

给中文母语程序员用的英文晨报：每天从**出版方自己的 RSS/Atom**采集前一日全球要闻和科技博客，对照阅读，点词/划短语积累生词本。

第一版不做登录。订阅、已读、生词本都在浏览器本地，可导出 JSON 备份。

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://127.0.0.1:43127](http://127.0.0.1:43127)。仓库里已有一份种子简报，即使还没采集也能开始对照阅读。

```bash
npm test          # 时区、分句、URL 校验
npm run collect   # 立刻采集「昨天」（Asia/Shanghai）的官方源
```

生产定时：每天 **22:00 UTC = 北京时间 06:00**，可跑 `npm run collect`，或使用仓库里的 GitHub Action。crontab 示例：

```
0 22 * * * cd /path/to/chendu && npm run collect
```

部署在 Vercel 时，函数文件系统只读，网页上点「采集昨日官方要闻」不会写入仓库 JSON，结果保存在本机浏览器。站点级共享简报请继续用 GitHub Action 提交 `data/digests/`。

## 学习方式

- **对照阅读**（第一版）：英文分句 + 可开关的中文译文
- **沉浸阅读**：同一篇文章，隐藏译文
- **先学后读 / 读后测验**：入口已留，尚未实现

点击单词查义和收藏；划选两个以上单词可收藏短语。阅读页始终提供「阅读原文」。

## 资讯来源

只消费官方 feed，**不解析正文页 HTML**。条目长度取决于 RSS 是否提供摘要或全文。

预置世界源：BBC World、NPR、The Guardian World、UN News、Al Jazeera。  
预置科技源：GitHub Blog、AWS News Blog、The Keyword（Google）、Microsoft DevBlogs、Cloudflare Blog、Kubernetes Blog。

自定义 RSS 可填任意公开 feed，经服务端代理拉取，结果只写入本机 Cookie。

## 翻译

设置页可填 OpenAI 兼容 API Key（只存在本机）。没有 Key 时用 MyMemory 等免费接口；失败则英文仍可阅读，中文显示「暂无译文」。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器，端口 43127 |
| `npm run collect` | 采集昨日官方源，写入 `data/digests/YYYY-MM-DD.json` |
| `npm test` | 核心逻辑测试 |
