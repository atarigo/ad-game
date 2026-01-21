# 數據驅動的敵人系統

## 設計理念

使用 **JSON 配置文件** 來定義敵人，而不是硬編碼在代碼中。這種方式帶來以下優點：

### 優點

1. **易於擴展** - 新增敵人種類只需編輯 JSON，無需改動代碼
2. **易於平衡** - 調整數值不需要重新編譯，快速迭代
3. **支持熱更新** - 可以在遊戲運行時動態載入新配置
4. **數據與邏輯分離** - 遊戲設計師可以直接編輯配置，不需要接觸代碼
5. **易於版本控制** - JSON 格式易讀，git diff 清晰
6. **支持多語言** - 可以輕鬆添加不同語言的敵人名稱

## 系統架構

```
數據層 (JSON)
    ├── enemies.json      - 普通敵人配置
    └── bosses.json       - Boss 配置
         ↓
配置層 (TypeScript)
    └── enemyTypes.ts     - 類型定義 + 難度計算
         ↓
邏輯層 (TypeScript)
    └── EnemySystem.ts    - 敵人生成邏輯
         ↓
表現層 (Phaser)
    └── GameScene.ts      - 敵人顯示
```

## 配置文件結構

### 普通敵人配置 (`enemies.json`)

```json
{
  "enemies": [
    {
      "id": "slime",              // 唯一標識符
      "name": "史萊姆",            // 顯示名稱
      "size": 1,                  // 大小 (1x1, 2x2, 3x3)
      "baseHp": 10,               // 基礎血量
      "baseAttack": 5,            // 基礎攻擊力
      "baseCooldown": {           // 基礎冷卻時間範圍
        "min": 2,
        "max": 4
      },
      "spawnWeight": 50,          // 生成權重（越高越容易出現）
      "color": 0xff6b6b           // 顏色（十六進制）
    }
  ]
}
```

### Boss 配置 (`bosses.json`)

```json
{
  "bosses": [
    {
      "id": "golem",              // 唯一標識符
      "name": "石像鬼",            // 顯示名稱
      "size": 3,                  // Boss 通常是 3x3
      "baseHp": 100,              // 基礎血量（較高）
      "baseAttack": 20,           // 基礎攻擊力（較高）
      "baseCooldown": {           // 基礎冷卻時間範圍
        "min": 3,
        "max": 5
      },
      "color": 0x9e9e9e,          // 顏色（十六進制）
      "description": "堅硬的石頭巨人"  // 描述（未來可用於圖鑑）
    }
  ]
}
```

## 難度系統

### 難度加成公式

```typescript
// 每 5 關為一個難度檔次
const tier = Math.floor((level - 1) / 5);
const multiplier = 1 + tier * 0.2;  // 每檔增加 20%

hpMultiplier = multiplier
attackMultiplier = multiplier
```

### 難度加成表

| 關卡 | 檔次 | 倍率 | 說明 |
|------|------|------|------|
| 1-5  | 0    | 1.0x | 基礎難度 |
| 6-10 | 1    | 1.2x | 提升 20% |
| 11-15| 2    | 1.4x | 提升 40% |
| 16-20| 3    | 1.6x | 提升 60% |
| 21-25| 4    | 1.8x | 提升 80% |

### Boss 額外加成

Boss 在基礎難度上還有額外加成：
- **血量**: 額外 x1.5 倍
- **攻擊**: 額外 x1.3 倍

## 當前敵人配置

### 普通敵人（4 種）

| ID     | 名稱   | 大小 | 基礎HP | 基礎攻擊 | 冷卻 | 權重 | 顏色 |
|--------|--------|------|--------|---------|------|------|------|
| slime  | 史萊姆 | 1x1  | 10     | 5       | 2-4  | 50   | 紅色 |
| goblin | 哥布林 | 1x1  | 15     | 8       | 1-3  | 30   | 橙色 |
| orc    | 獸人   | 2x2  | 25     | 12      | 2-4  | 15   | 深紅 |
| troll  | 巨魔   | 2x2  | 30     | 15      | 3-5  | 5    | 暗紅 |

**生成概率**:
- 史萊姆: 50% (50/100)
- 哥布林: 30% (30/100)
- 獸人: 15% (15/100)
- 巨魔: 5% (5/100)

### Boss（4 種）

| ID           | 名稱     | 大小 | 基礎HP | 基礎攻擊 | 冷卻 | 顏色 |
|--------------|----------|------|--------|---------|------|------|
| golem        | 石像鬼   | 3x3  | 100    | 20      | 3-5  | 灰色 |
| dragon       | 火龍     | 3x3  | 120    | 25      | 2-4  | 橙色 |
| demon_lord   | 魔王     | 3x3  | 150    | 30      | 2-3  | 紫色 |
| ancient_beast| 遠古巨獸 | 3x3  | 180    | 35      | 3-4  | 綠色 |

## Boss 生成機制

### 觸發條件
- **每 10 關必定出現 Boss**（關卡 10, 20, 30...）
- Boss 關卡只生成 1 個 Boss，不生成普通敵人

### Boss 選擇
- 從 4 個 Boss 中**隨機**選擇一個
- 未來可以根據關卡數選擇特定 Boss

### Boss 位置
- 優先放置在**敵人區域中央**
- 如果中央無法放置，則隨機尋找有效位置

### Boss 強化
```typescript
// 以關卡 10 的火龍為例
基礎 HP: 120
難度倍率: 1.2x (關卡 6-10)
Boss 加成: 1.5x
最終 HP: 120 * 1.2 * 1.5 = 216

基礎攻擊: 25
難度倍率: 1.2x
Boss 加成: 1.3x
最終攻擊: 25 * 1.2 * 1.3 = 39
```

## 視覺差異

### 普通敵人
- 顏色：依配置文件
- 邊框：深色，寬度 2px
- 血條：標準樣式

### Boss
- 顏色：依配置文件
- 邊框：**金色**，寬度 **3px**（更粗）
- 血條：標準樣式
- 大小：固定 3x3

## 如何添加新敵人

### 添加普通敵人

1. 編輯 `src/lib/games/cube/war/data/enemies.json`
2. 在 `enemies` 數組中添加新對象：

```json
{
  "id": "skeleton",
  "name": "骷髏",
  "size": 1,
  "baseHp": 20,
  "baseAttack": 10,
  "baseCooldown": {
    "min": 2,
    "max": 3
  },
  "spawnWeight": 20,
  "color": 0xeeeeee
}
```

3. 保存文件，重新載入遊戲即可！

### 添加 Boss

1. 編輯 `src/lib/games/cube/war/data/bosses.json`
2. 在 `bosses` 數組中添加新對象：

```json
{
  "id": "titan",
  "name": "泰坦巨人",
  "size": 3,
  "baseHp": 200,
  "baseAttack": 40,
  "baseCooldown": {
    "min": 4,
    "max": 5
  },
  "color": 0x424242,
  "description": "遠古神話中的巨人"
}
```

3. 保存文件，重新載入遊戲即可！

## 調整建議

### 增加敵人多樣性
- 添加更多 1x1 小型敵人（快速、低血）
- 添加特殊機制的敵人（未來擴展）

### 平衡建議
- 如果遊戲太難：降低 `baseHp` 或 `baseAttack`
- 如果遊戲太簡單：提高基礎數值或難度加成
- 如果某種敵人太常見：降低 `spawnWeight`

### Boss 平衡
- Boss 關卡應該是**挑戰關卡**
- 如果 Boss 太強：降低 Boss 加成倍率
- 如果 Boss 太弱：提高基礎數值或加成倍率

## 未來擴展

### 1. 敵人技能系統
在配置中添加 `skills` 字段：
```json
{
  "id": "mage",
  "skills": ["multi_attack", "shield"]
}
```

### 2. 關卡特定敵人
```json
{
  "id": "ice_golem",
  "minLevel": 15,  // 只在關卡 15+ 出現
  "biome": "snow"  // 只在雪地關卡出現
}
```

### 3. 動態難度
根據玩家表現調整難度倍率

### 4. 敵人圖鑑
記錄玩家遇到的敵人，顯示描述和統計數據

## 實作位置

- **配置文件**: `src/lib/games/cube/war/data/`
  - `enemies.json` - 普通敵人
  - `bosses.json` - Boss
  - `enemyTypes.ts` - 類型定義

- **生成系統**: `src/lib/games/cube/war/systems/EnemySystem.ts`
  - `generateEnemies()` - 主要生成邏輯
  - `generateNormalEnemy()` - 普通敵人
  - `generateBoss()` - Boss
  - `selectTemplateByWeight()` - 權重抽取

- **類型定義**: `src/lib/games/cube/war/types.ts`
  - `Enemy` interface - 添加了新字段
