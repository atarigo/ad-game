# Ad Game — 假廣告遊戲集合

## 概述

一個以趣味為主的 web game 網站，實作各種「假廣告」中常見的遊戲畫面。
每個遊戲都很短、很簡單，純粹好玩。

## 技術架構

- **框架**: SvelteKit
- **部署**: 靜態網站 (adapter-static)
- **樣式**: Kung Fury synthwave 風格（見下方視覺規範）

## 路由結構

```
/                       — Landing page（遊戲總覽、網站介紹）
/game/game-name-1       — 第一個遊戲
/game/game-name-2       — 第二個遊戲
...
```

- 首頁作為遊戲入口，列出所有可玩的遊戲
- 每個遊戲獨立一個路由，單一頁面完成所有邏輯（不需多頁流程）

## 視覺風格 — Kung Fury / Synthwave

**參考電影**: Kung Fury (2015)

### 色彩系統

- **背景**: 深色系（#0a0a12 ~ #1a0a2e 深紫黑漸層）
- **主色**: 霓虹粉紅 #ff2d7b、青色 #00f0ff、黃色 #ffe156
- **文字**: 白色帶微弱發光效果
- **強調**: 霓虹色 glow / text-shadow

### 質感元素

- VHS 掃描線（CSS overlay）
- CRT 畫面微彎曲效果（可選）
- 故障 (glitch) 文字動畫
- 粗獷誇張的字體（標題用）
- 刻意的廉價復古感 — 越 cheap 越對味

### 字體

- 標題：粗體無襯線 or 像素風格（Google Fonts: Press Start 2P / Orbitron / Audiowide）
- 內文：乾淨的無襯線（系統字體即可）

### 設計原則

1. 深色為主，霓虹色點綴
2. 動畫要有存在感但不妨礙操作
3. 每個遊戲可以有自己的色彩變體，但整體調性統一
4. Mobile-first，遊戲本身就是模仿手機假廣告

## 遊戲規格管理

每個遊戲都有對應的規格文件：

```
spec/index.md           — 本文件，專案總覽
spec/<game-name>.md     — 各遊戲的獨立規格書
```

新增或修改遊戲時，必須同步更新對應的規格文件。

## 遊戲清單

| 路由                  | 規格文件                             | 說明                 | 技術               |
| --------------------- | ------------------------------------ | -------------------- | ------------------ |
| `/game/pull-the-pin`  | [pull-the-pin.md](pull-the-pin.md)   | 拔釘子讓水流到杯子   | PixiJS + Matter.js |
| `/game/hero-rescue`   | [hero-rescue.md](hero-rescue.md)     | 選對道具救英雄       | PixiJS             |
| `/game/number-merge`  | [number-merge.md](number-merge.md)   | 丟數字球合併到 2048  | PixiJS + Matter.js |
| `/game/parking-jam`   | [parking-jam.md](parking-jam.md)     | 滑動車輛讓紅車離開   | PixiJS             |
| `/game/stick-hero`    | [stick-hero.md](stick-hero.md)       | 長按伸棍搭橋過平台   | PixiJS             |
| `/game/ball-sort`     | [ball-sort.md](ball-sort.md)         | 同色球分到同一管     | PixiJS             |
| `/game/money-run`     | [money-run.md](money-run.md)         | 穿過乘法門累積金幣   | PixiJS             |
| `/game/bug-squash`    | [bug-squash.md](bug-squash.md)       | 30 秒內消滅蟲子      | PixiJS             |
| `/game/fish-hook`     | [fish-hook.md](fish-hook.md)         | 放魚鉤釣魚得分       | PixiJS             |
| `/game/tower-stack`   | [tower-stack.md](tower-stack.md)     | 對準疊方塊疊高塔     | PixiJS             |
| `/game/survival-loop` | [survival-loop.md](survival-loop.md) | 砍柴打獵賺錢升級營地 | PixiJS             |
