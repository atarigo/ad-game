# 關卡設計規格

## 核心概念

### 關卡結構

```
遊戲流程
├── 關卡（Stage）- 固定單位
│   ├── 波次 1（Wave）
│   ├── 波次 2
│   ├── ...
│   └── 波次 3~7
├── 修整場景（Supply Scene）
├── 關卡
├── 修整場景
└── ...（循環）
```

### 關卡等級系統

| 等級 | 敵人屬性倍率 | 通關次數晉級 |
|------|-------------|-------------|
| D 級 | 1.0x | 3 次 → C 級 |
| C 級 | 1.2x | 3 次 → B 級 |
| B 級 | 1.6x | 3 次 → A 級 |
| A 級 | 2.2x | 3 次 → S 級 |
| S 級 | 3.0x | 無限循環 |

---

## 波次系統（Wave System）

### 波次數量

- 每個關卡包含 **3~7 波**
- 波次數量由關卡配置決定

### 勝利條件類型

| 條件類型 | 說明 | 範例 |
|---------|------|------|
| `annihilation` | 全滅敵人 | 消滅所有敵人 |
| `survive` | 撐過指定回合 | 存活 10 回合 |
| `target` | 打倒特定敵人 | 擊敗 Boss |

### 波次配置範例

```typescript
interface WaveConfig {
  enemies: EnemySpawn[];
  winCondition: {
    type: 'annihilation' | 'survive' | 'target';
    // survive 需要的回合數
    rounds?: number;
    // target 需要的敵人 ID
    targetId?: string;
  };
  // 完成獎勵
  reward: {
    points: number;
  };
}
```

---

## 貨幣系統（Point System）

### 統一貨幣：點數（Points）

所有交易使用同一種貨幣：

- 升級屬性
- 購買裝備
- 強化裝備（未來）
- 購買道具
- 購買技能

### 點數獲取方式

| 來源 | 說明 |
|------|------|
| 擊倒敵人 | 每個敵人有固定點數獎勵 |
| 完成波次 | 每波完成有額外獎勵 |
| 裝備掉落 | 15% 機率掉落同等級裝備 |

### 各等級關卡總獎勵

| 等級 | 總獎勵點數 | 說明 |
|------|-----------|------|
| D 級 | ~10,000 | 新手關卡 |
| C 級 | ~20,000 | 初級關卡 |
| B 級 | ~30,000 | 中級關卡 |
| A 級 | ~40,000 | 高級關卡 |
| S 級 | ~50,000 | 最終關卡 |

---

## 商店系統（Shop System）

### 裝備價格

| 等級 | 裝備價格 | 說明 |
|------|---------|------|
| D 級 | ~5,000 | 每關可買約 2 件 |
| C 級 | ~10,000 | 每關可買約 2 件 |
| B 級 | ~15,000 | 每關可買約 2 件 |
| A 級 | ~20,000 | 每關可買約 2 件 |
| S 級 | ~25,000 | 每關可買約 2 件 |

### 消耗品價格

| 等級 | 血瓶價格 | 說明 |
|------|---------|------|
| D 級 | 1,000 | 關卡獎勵的 1/10 |
| C 級 | 2,000 | 關卡獎勵的 1/10 |
| B 級 | 3,000 | 關卡獎勵的 1/10 |
| A 級 | 4,000 | 關卡獎勵的 1/10 |
| S 級 | 5,000 | 關卡獎勵的 1/10 |

### 屬性升級價格

| 屬性區間 | 每點花費 | 累計花費（該區間） |
|---------|---------|------------------|
| 1~50 | 50 | 2,500 |
| 51~100 | 100 | 5,000 |
| 101~150 | 200 | 10,000 |
| 151~200 | 400 | 20,000 |
| 201~250 | 800 | 40,000 |

**單一屬性從 1 升到 250 的總花費：77,500 點**

---

## 掉落系統（Drop System）

### 裝備掉落

- **掉落機率**：15%
- **掉落等級**：與敵人同等級
- **掉落時機**：擊倒敵人時

### 掉落邏輯

```typescript
function onEnemyDefeated(enemy: Enemy) {
  // 獲得點數
  addPoints(enemy.pointReward);
  
  // 15% 機率掉落裝備
  if (Math.random() < 0.15) {
    const equipment = generateRandomEquipment(enemy.tier);
    addToInventory(equipment);
  }
}
```

---

## 修整場景（Supply Scene）

### 開放時機

- 每個關卡結束後進入
- 波次之間**不會**進入修整場景

### 可用功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| 購買技能 | 學習新技能 | 待實作 |
| 升級屬性 | 花費點數提升六維 | 待實作 |
| 購買裝備 | 購買當前等級裝備 | 待實作 |
| 購買道具 | 購買血瓶等消耗品 | 已實作 |
| 裝備強化 | 強化現有裝備 | 未來實作 |

---

## 數值設計範例

### D 級關卡（5 波）範例

| 波次 | 敵人數 | 勝利條件 | 敵人點數 | 波次獎勵 | 小計 |
|------|--------|---------|---------|---------|------|
| 1 | 3 | 全滅 | 300×3 | 500 | 1,400 |
| 2 | 4 | 全滅 | 350×4 | 600 | 2,000 |
| 3 | 5 | 全滅 | 400×5 | 700 | 2,700 |
| 4 | 3 | 撐 5 回合 | 300×3 | 1,000 | 1,900 |
| 5 | 1 (Boss) | 打倒 Boss | 1,500 | 500 | 2,000 |
| **合計** | | | | | **~10,000** |

### 敵人屬性縮放

```typescript
function scaleEnemyAttributes(base: number, tier: Tier): number {
  const multipliers = {
    D: 1.0,
    C: 1.2,
    B: 1.6,
    A: 2.2,
    S: 3.0
  };
  return Math.floor(base * multipliers[tier]);
}
```

---

## 進度系統

### 晉級條件

```typescript
interface ProgressState {
  currentTier: Tier;        // 當前等級
  stagesCleared: number;    // 該等級已完成關卡數
  totalPoints: number;      // 累計點數
}

function checkPromotion(state: ProgressState): boolean {
  // 完成 3 次關卡可晉級
  if (state.stagesCleared >= 3 && state.currentTier !== 'S') {
    return true;
  }
  return false;
}
```

### S 級無限循環

- S 級沒有晉級目標
- 可無限重複挑戰
- 每次獲得 ~50,000 點數

---

## 配置結構設計

### StageConfig（關卡配置）

```typescript
interface StageConfig {
  id: string;
  name: string;
  tier: Tier;
  waves: WaveConfig[];
}
```

### WaveConfig（波次配置）

```typescript
interface WaveConfig {
  id: string;
  enemies: EnemySpawn[];
  winCondition: WinCondition;
  reward: {
    points: number;
  };
}
```

### WinCondition（勝利條件）

```typescript
type WinCondition = 
  | { type: 'annihilation' }
  | { type: 'survive'; rounds: number }
  | { type: 'target'; targetId: string };
```

### EnemySpawn（敵人生成）

```typescript
interface EnemySpawn {
  monsterId: string;      // 引用怪物模板
  position: Position;
  pointReward: number;    // 擊倒獎勵
  isTarget?: boolean;     // 是否為目標敵人
}
```

---

## 更新記錄

- 2026-01-20: 建立關卡設計規格
