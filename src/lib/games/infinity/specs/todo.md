# Infinity 遊戲開發 TODO

## 已完成功能 ✅

### 基礎框架
- [x] Phaser + SvelteKit 整合
- [x] SSR 處理（禁用 SSR）
- [x] 動態載入 Phaser 模組

### 角色系統
- [x] 主屬性（力量、體力、敏捷、智力、意志、幸運）
- [x] 延伸屬性計算（攻擊力、防禦力、血量、暴擊等）
- [x] CharacterStats 類別

### 裝備系統
- [x] 武器系統（木劍/鐵劍/鋼劍）
- [x] 防具系統（布甲/皮甲/鐵甲）
- [x] 裝備屬性加成計算

### 道具系統
- [x] 四級血瓶（D/C/B/A，回復 25%/50%/75%/100%）
- [x] 道具欄位（初始 1 格，最多 3 格）
- [x] 道具使用功能（點擊道具格使用）
- [x] 不溢補機制

### 戰鬥系統
- [x] 回合制戰鬥
- [x] 攻擊/暴擊/傷害計算
- [x] 每回合自動回復（血量、魔力）
- [x] 戰鬥勝負判定

### UI 系統
- [x] 血量條（動態更新、低血量變紅）
- [x] 資訊抽屜（查看角色詳細資訊）
- [x] 回合按鈕與回合數顯示
- [x] 技能格 UI（3 格）
- [x] 道具格 UI（動態數量）
- [x] 關卡資訊顯示（等級、關卡名稱）

### 進度系統
- [x] 5 地圖等級（D → C → B → A → S）
- [x] 每級 3 關，共 15 關
- [x] 補給場景（SupplyScene）
- [x] 血瓶等級開放（依地圖等級）
- [x] 道具欄擴充購買

### 關卡系統
- [x] JSON 關卡配置
- [x] 隨機關卡選擇
- [x] 敵人屬性/裝備/位置配置
- [x] D 級關卡設計（5 種）

### 視覺效果
- [x] 攻擊閃爍效果
- [x] 玩家精靈圖片
- [x] 敵人格子系統（5x4）

---

## 待完成功能 ⬜

### 優先度：高 🔴

#### 貨幣系統
- [ ] 金幣獲取（戰鬥獎勵）
- [ ] 金幣消耗（商店購買）
- [ ] 金幣顯示 UI
- [ ] 設定物品價格

#### 傷害數字顯示
- [ ] 攻擊時顯示傷害數字
- [ ] 暴擊特效（不同顏色/大小）
- [ ] 回復數字顯示
- [ ] 數字浮動動畫

#### 敵人圖片
- [ ] 敵人精靈圖片（替換紅色方塊）
- [ ] 不同敵人不同圖片
- [ ] 敵人死亡動畫

#### 技能系統
- [ ] 技能設計（主動技能）
- [ ] 技能冷卻機制
- [ ] 技能使用 UI
- [ ] 技能效果實作

### 優先度：中 🟡

#### 多敵人戰鬥
- [ ] 支援多個敵人同時存在
- [ ] 敵人選擇機制
- [ ] 多敵人血量條
- [ ] 全滅判定

#### 戰鬥動畫
- [ ] 攻擊移動動畫
- [ ] 受擊動畫
- [ ] 死亡動畫

#### 狀態效果
- [ ] 中毒（每回合損血）
- [ ] 燃燒（持續傷害）
- [ ] 冰凍（行動受限）
- [ ] 狀態圖示顯示

#### 裝備更換 UI
- [ ] 裝備欄 UI
- [ ] 裝備比較
- [ ] 裝備更換操作

#### 音效系統
- [ ] 攻擊音效
- [ ] 受擊音效
- [ ] 購買音效
- [ ] 使用道具音效
- [ ] 背景音樂

### 優先度：低 🟢

#### 遊戲流程
- [ ] 遊戲結束畫面（通關/失敗）
- [ ] 重新開始按鈕
- [ ] 結算統計（總回合、總傷害等）

#### 存檔系統
- [ ] 本地存檔（LocalStorage）
- [ ] 讀取存檔
- [ ] 多存檔槽位

#### 內容擴充
- [ ] C 級關卡設計（目前只有 1 種）
- [ ] B 級關卡設計（目前只有 1 種）
- [ ] A 級關卡設計（目前只有 1 種）
- [ ] S 級關卡設計（目前只有 1 種）
- [ ] 更多道具類型（魔力藥水、增益藥劑）
- [ ] 魔法武器/防具
- [ ] 裝備套裝效果

#### 進階功能
- [ ] 防禦/閃避機制
- [ ] 連擊系統
- [ ] 地圖選擇
- [ ] 成就系統

---

## 建議開發順序

```
第一階段：核心體驗
├── 1. 傷害數字顯示（提升戰鬥回饋感）
├── 2. 敵人圖片（視覺一致性）
└── 3. 貨幣系統（讓商店有意義）

第二階段：遊戲深度
├── 4. 技能系統（增加戰鬥策略）
├── 5. 多敵人戰鬥（增加挑戰）
└── 6. 關卡內容擴充

第三階段：完善體驗
├── 7. 音效系統
├── 8. 戰鬥動畫
├── 9. 遊戲結束畫面
└── 10. 存檔系統
```

---

## 架構重構計畫 🔧

> 根據 [關卡設計規格](./stage-design.md) 制定的重構計畫

### 重構階段總覽

```
階段 0：資料結構重構（必須先做）
├── 0.1 怪物模板系統
├── 0.2 波次系統
├── 0.3 勝利條件系統
└── 0.4 點數/獎勵系統

階段 1：系統抽離
├── 1.1 BattleManager（戰鬥管理）
├── 1.2 WaveManager（波次管理）
└── 1.3 ProgressManager（進度管理）

階段 2：商店重構
├── 2.1 統一物品系統
├── 2.2 屬性升級系統
└── 2.3 裝備購買系統
```

---

### 階段 0：資料結構重構

#### 0.1 怪物模板系統
- [ ] 建立 `data/monsters/` 資料夾
- [ ] 定義 `MonsterTemplate` 介面
- [ ] 建立怪物 JSON（史萊姆、哥布林、Boss 等）
- [ ] 關卡配置改為引用 `monsterId`
- [ ] 實作屬性縮放（D=1x, C=1.2x, B=1.6x, A=2.2x, S=3x）

```typescript
interface MonsterTemplate {
  id: string;           // "slime_green"
  name: string;         // "綠史萊姆"
  sprite?: string;      // 圖片 key
  baseAttributes: PrimaryAttributes;
  weapon: WeaponType;
  armor: ArmorType;
  basePointReward: number;  // 基礎擊殺點數
}
```

#### 0.2 波次系統
- [ ] 重構 `StageConfig` 加入 `waves[]`
- [ ] 定義 `WaveConfig` 介面
- [ ] 修改關卡 JSON 結構
- [ ] MainScene 支援波次切換

```typescript
interface StageConfig {
  id: string;
  name: string;
  tier: Tier;
  waves: WaveConfig[];
}

interface WaveConfig {
  id: string;
  enemies: EnemySpawn[];
  winCondition: WinCondition;
  reward: { points: number };
}
```

#### 0.3 勝利條件系統
- [ ] 定義 `WinCondition` 類型
- [ ] 實作全滅判定（annihilation）
- [ ] 實作存活判定（survive）
- [ ] 實作目標判定（target）
- [ ] UI 顯示當前勝利條件

```typescript
type WinCondition = 
  | { type: 'annihilation' }
  | { type: 'survive'; rounds: number }
  | { type: 'target'; targetId: string };
```

#### 0.4 點數/獎勵系統
- [ ] GameState 加入 `points: number`
- [ ] 擊倒敵人獲得點數
- [ ] 完成波次獲得獎勵
- [ ] UI 顯示點數
- [ ] 15% 機率掉落裝備

---

### 階段 1：系統抽離

#### 1.1 BattleManager
- [ ] 建立 `systems/BattleManager.ts`
- [ ] 抽離攻擊/傷害計算
- [ ] 抽離回合管理
- [ ] 事件回調（onDamage, onDefeat 等）
- [ ] MainScene 只負責渲染

#### 1.2 WaveManager
- [ ] 建立 `systems/WaveManager.ts`
- [ ] 管理波次流程
- [ ] 勝利條件檢查
- [ ] 波次切換邏輯

#### 1.3 ProgressManager
- [x] 建立 `systems/ProgressManager.ts`
- [x] 關卡完成計數
- [x] 晉級判定（3 次通關 → 晉級）
- [x] S 級無限循環
- [x] 從 GameState 抽離進度相關邏輯

---

### 階段 2：商店重構

#### 2.1 統一物品系統
- [ ] 建立 `data/items/` 資料夾
- [ ] 統一 `ItemDefinition` 結構
- [ ] 所有物品有 `tier` 和 `price`
- [ ] 裝備價格：D=5000, C=10000, B=15000, A=20000, S=25000
- [ ] 血瓶價格：D=1000, C=2000, B=3000, A=4000, S=5000

#### 2.2 屬性升級系統
- [ ] 建立屬性升級 UI
- [ ] 實作價格計算

```typescript
function getAttributeUpgradeCost(currentValue: number): number {
  if (currentValue <= 50) return 50;
  if (currentValue <= 100) return 100;
  if (currentValue <= 150) return 200;
  if (currentValue <= 200) return 400;
  return 800; // 201-250
}
```

#### 2.3 裝備商店
- [ ] 依當前等級顯示可購買裝備
- [ ] 裝備比較功能
- [ ] 購買確認

---

### 目標資料夾結構

```
src/lib/games/infinity/
├── config.ts
├── index.ts
│
├── data/
│   ├── monsters/           # 怪物模板
│   │   ├── index.ts
│   │   ├── slimes.json
│   │   ├── goblins.json
│   │   └── bosses.json
│   │
│   ├── items/              # 統一物品
│   │   ├── index.ts
│   │   ├── weapons.json
│   │   ├── armors.json
│   │   └── consumables.json
│   │
│   ├── stages/             # 關卡配置
│   │   ├── index.ts
│   │   └── stage-*.json
│   │
│   └── constants.ts        # 數值常數
│       - TIER_MULTIPLIERS
│       - REWARD_POINTS
│       - EQUIPMENT_PRICES
│       - POTION_PRICES
│       - ATTRIBUTE_UPGRADE_COSTS
│
├── systems/                # 遊戲系統
│   ├── BattleManager.ts
│   ├── WaveManager.ts
│   ├── DropManager.ts
│   ├── ProgressManager.ts
│   └── ShopManager.ts
│
├── entities/
├── scenes/
├── state/
└── specs/
```

---

### 重構優先順序建議

```
Week 1: 階段 0（資料結構）
├── Day 1-2: 怪物模板系統
├── Day 3-4: 波次系統 + 勝利條件
└── Day 5: 點數系統

Week 2: 階段 1（系統抽離）
├── Day 1-2: BattleManager
├── Day 3: WaveManager
└── Day 4-5: ProgressManager

Week 3: 階段 2（商店重構）
├── Day 1-2: 統一物品系統
├── Day 3-4: 屬性升級
└── Day 5: 裝備商店
```

---

## 技術債務

- [ ] 抽取魔法數字到 config.ts
- [ ] 統一錯誤處理
- [ ] 加入單元測試
- [ ] 效能優化（大量敵人時）

---

## 次要功能（非核心機制）

### 掉落系統（DropManager）
- [ ] 建立 `systems/DropManager.ts`
- [ ] 掉落機率計算（15% 機率）
- [ ] 裝備生成邏輯（依敵人等級）
- [ ] 掉落物 UI 顯示
- [ ] 掉落物拾取機制

> 註：此功能非主要遊戲機制，可延後實作

---

## 更新記錄

- 2026-01-20: 建立 TODO 清單
- 2026-01-20: 新增架構重構建議（待確認）
- 2026-01-20: 確認關卡設計，更新架構重構計畫
