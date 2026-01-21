# Legion Game Specs

這個目錄包含 Legion 遊戲的所有設計規格文檔。

## 文檔列表

- [遊戲概述](./game-overview.md) - 遊戲基本概念和玩法
- [戰鬥系統](./combat-system.md) - 回合制戰鬥機制
- [角色系統](./character-system.md) - 角色屬性和成長
- [UI 佈局](./ui-layout.md) - 介面設計規格
- [ECS 架構](./ecs-architecture.md) - 實體組件系統設計

## 快速參考

### 棋盤尺寸
- 敵人棋盤：6x6 格
- 我方棋盤：3x6 格

### 角色屬性
- STR (力量) → ATK = STR
- VIT (體質) → HP = VIT × 10, DEF = VIT

### 回合階段
1. 玩家控制階段
2. 玩家自動攻擊階段
3. 小結算（檢查敵人全滅）
4. 敵人控制階段
5. 敵人自動攻擊階段
6. 最終結算（檢查我方全滅）
