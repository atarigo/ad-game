# 技能系統設計規格

## 系統概述

技能系統分為主動技能和被動技能兩大類。第一階段先實作主動技能，且僅限物理攻擊類型。

---

## 技能分類

### 主動技能（Active Skills）
- 需要玩家主動使用
- 消耗魔力（MP）
- 有冷卻時間
- 在戰鬥中使用

### 被動技能（Passive Skills）
- 自動生效
- 持續性效果
- 無需使用
- **第一階段不實作，延後**

---

## 第一階段：三種近戰主動技能

### 技能 1：真實打擊（True Strike）
- **類型**：主動技能，物理攻擊
- **傷害**：造成力量 60% 的真實傷害（無視防禦）
- **消耗**：20 MP
- **冷卻**：2 回合
- **價格**：15,000 點數
- **描述**：造成基於力量的真實傷害，無視敵人防禦

### 技能 2：重擊（Heavy Strike）
- **類型**：主動技能，物理攻擊
- **傷害**：造成 150% 的普通攻擊傷害
- **消耗**：25 MP
- **冷卻**：3 回合
- **價格**：25,000 點數
- **描述**：造成 1.5 倍普通攻擊傷害

### 技能 3：暈眩打擊（Stun Strike）
- **類型**：主動技能，物理攻擊 + 狀態效果
- **傷害**：造成普通攻擊傷害
- **效果**：使敵人暈眩，跳過 2 個回合
- **消耗**：30 MP
- **冷卻**：4 回合
- **價格**：35,000 點數
- **描述**：造成傷害並使敵人暈眩 2 回合

---

## 資料結構設計

### 技能介面

```typescript
/**
 * 技能類型
 */
export enum SkillType {
  Active = 'active',
  Passive = 'passive'
}

/**
 * 技能傷害類型
 */
export enum SkillDamageType {
  Physical = 'physical',    // 物理傷害
  Magic = 'magic',          // 魔法傷害
  True = 'true'             // 真實傷害（無視防禦）
}

/**
 * 技能效果類型
 */
export enum SkillEffectType {
  Damage = 'damage',        // 傷害
  Heal = 'heal',            // 回復
  Buff = 'buff',            // 增益
  Debuff = 'debuff',        // 減益
  Stun = 'stun'             // 暈眩
}

/**
 * 技能效果
 */
export interface SkillEffect {
  type: SkillEffectType;
  value?: number;           // 數值（傷害量、回復量等）
  multiplier?: number;      // 倍率（例如 1.5 倍傷害）
  duration?: number;        // 持續時間（回合數）
  attribute?: keyof PrimaryAttributes; // 基於哪個屬性（例如 strength）
  attributePercent?: number; // 屬性百分比（例如 0.6 = 60%）
}

/**
 * 技能定義
 */
export interface Skill {
  id: string;               // 技能 ID
  name: string;             // 技能名稱
  nameEn: string;           // 英文名稱
  description: string;      // 描述
  type: SkillType;          // 技能類型
  damageType?: SkillDamageType; // 傷害類型
  effects: SkillEffect[];   // 技能效果列表
  manaCost: number;         // 魔力消耗
  cooldown: number;         // 冷卻時間（回合數）
  price: number;            // 購買價格
  tier: Tier;               // 技能等級（用於商店顯示）
  icon?: string;            // 圖示 key
}

/**
 * 已學習的技能
 */
export interface LearnedSkill {
  skillId: string;          // 技能 ID
  currentCooldown: number;  // 當前冷卻時間
  isOnCooldown: boolean;    // 是否在冷卻中
}
```

---

## 狀態效果系統

### 狀態效果介面

```typescript
/**
 * 狀態效果類型
 */
export enum StatusEffectType {
  Stun = 'stun',            // 暈眩（無法行動）
  Poison = 'poison',        // 中毒（每回合損血）
  Burn = 'burn',            // 燃燒（持續傷害）
  Freeze = 'freeze'         // 冰凍（行動受限）
}

/**
 * 狀態效果
 */
export interface StatusEffect {
  type: StatusEffectType;
  duration: number;         // 剩餘持續時間（回合數）
  value?: number;           // 效果數值（例如每回合傷害）
}

/**
 * 暈眩狀態
 */
export interface StunStatus extends StatusEffect {
  type: StatusEffectType.Stun;
  duration: number;         // 剩餘回合數
}
```

### 狀態效果管理

需要在 `CharacterStats` 中加入狀態效果管理：

```typescript
export class CharacterStats {
  // ... 現有屬性
  
  /** 狀態效果列表 */
  public statusEffects: StatusEffect[] = [];
  
  /**
   * 添加狀態效果
   */
  addStatusEffect(effect: StatusEffect): void {
    // 檢查是否已有相同類型的狀態
    const existingIndex = this.statusEffects.findIndex(e => e.type === effect.type);
    if (existingIndex >= 0) {
      // 更新持續時間（取較大值）
      this.statusEffects[existingIndex].duration = Math.max(
        this.statusEffects[existingIndex].duration,
        effect.duration
      );
    } else {
      this.statusEffects.push(effect);
    }
  }
  
  /**
   * 更新狀態效果（每回合結束時調用）
   */
  updateStatusEffects(): void {
    this.statusEffects = this.statusEffects
      .map(effect => ({ ...effect, duration: effect.duration - 1 }))
      .filter(effect => effect.duration > 0);
  }
  
  /**
   * 檢查是否有特定狀態
   */
  hasStatusEffect(type: StatusEffectType): boolean {
    return this.statusEffects.some(e => e.type === type);
  }
  
  /**
   * 檢查是否被暈眩
   */
  isStunned(): boolean {
    return this.hasStatusEffect(StatusEffectType.Stun);
  }
}
```

---

## 技能使用流程

### 戰鬥中使用技能

1. **檢查條件**
   - 技能是否已學習
   - 魔力是否足夠
   - 技能是否在冷卻中

2. **執行技能**
   - 消耗魔力
   - 計算傷害/效果
   - 應用狀態效果（如果有）
   - 顯示傷害數字
   - 開始冷卻計時

3. **更新 UI**
   - 更新技能格顯示（冷卻狀態）
   - 更新魔力顯示

### 技能傷害計算

```typescript
/**
 * 計算技能傷害
 */
function calculateSkillDamage(
  skill: Skill,
  attacker: CharacterStats,
  defender: CharacterStats
): number {
  for (const effect of skill.effects) {
    if (effect.type === SkillEffectType.Damage) {
      if (effect.attribute && effect.attributePercent) {
        // 基於屬性的傷害（例如力量 60%）
        const baseDamage = attacker.primary[effect.attribute] * effect.attributePercent;
        
        if (skill.damageType === SkillDamageType.True) {
          // 真實傷害，無視防禦
          return baseDamage;
        } else {
          // 普通傷害，計算防禦
          const defense = defender.derived.defense;
          return Math.max(0, baseDamage - defense);
        }
      } else if (effect.multiplier) {
        // 倍率傷害（例如 150%）
        const baseDamage = attacker.derived.meleeAttack;
        const damage = baseDamage * effect.multiplier;
        const defense = defender.derived.defense;
        return Math.max(0, damage - defense);
      } else if (effect.value) {
        // 固定傷害
        const defense = defender.derived.defense;
        return Math.max(0, effect.value - defense);
      }
    }
  }
  return 0;
}
```

---

## 商店系統整合

### 技能商店

在 `SupplyScene` 中加入技能商店區域：

- 顯示可購買的技能列表
- 顯示技能價格
- 顯示技能描述
- 購買後技能加入玩家技能欄

### 技能價格

| 技能 | 價格 | 說明 |
|------|------|------|
| 真實打擊 | 15,000 | 基礎技能 |
| 重擊 | 25,000 | 中級技能 |
| 暈眩打擊 | 35,000 | 高級技能 |

---

## UI 設計

### 技能格顯示

- **空技能格**：灰色背景，無圖示
- **已學習技能**：顯示技能圖示或首字母
- **冷卻中**：顯示冷卻倒數，灰色遮罩
- **可用**：正常顯示，可點擊
- **魔力不足**：紅色邊框，不可點擊

### 技能格互動

- **點擊**：使用技能（如果可用）
- **懸停**：顯示技能資訊（名稱、描述、消耗、冷卻）

---

## 實作步驟

### 階段 1：基礎架構
1. [ ] 建立技能資料結構（`entities/Skill.ts`）
2. [ ] 定義三種技能資料
3. [ ] 在 `CharacterStats` 中加入技能欄位
4. [ ] 實作狀態效果系統

### 階段 2：技能使用
5. [ ] 實作技能傷害計算
6. [ ] 實作技能使用邏輯
7. [ ] 實作冷卻機制
8. [ ] 整合到戰鬥系統

### 階段 3：UI 整合
9. [ ] 更新技能格 UI（顯示技能、冷卻狀態）
10. [ ] 實作技能使用互動
11. [ ] 顯示技能資訊提示

### 階段 4：商店整合
12. [ ] 在商店中加入技能購買區域
13. [ ] 實作技能購買邏輯
14. [ ] 技能學習機制

### 階段 5：狀態效果
15. [ ] 實作暈眩狀態
16. [ ] 整合到回合系統（暈眩敵人跳過回合）
17. [ ] 狀態效果 UI 顯示

---

## 技術細節

### 真實傷害計算

真實傷害無視防禦，直接造成傷害：

```typescript
if (skill.damageType === SkillDamageType.True) {
  const damage = attacker.primary.strength * 0.6;
  defender.currentHealth -= damage;
  return damage;
}
```

### 倍率傷害計算

倍率傷害基於普通攻擊力：

```typescript
const baseDamage = attacker.derived.meleeAttack;
const damage = baseDamage * 1.5; // 150%
const actualDamage = Math.max(0, damage - defender.derived.defense);
```

### 暈眩效果

暈眩狀態會讓敵人在指定回合數內無法行動：

```typescript
// 添加暈眩狀態
defender.addStatusEffect({
  type: StatusEffectType.Stun,
  duration: 2 // 2 回合
});

// 回合開始時檢查
if (enemy.stats.isStunned()) {
  // 跳過敵人回合
  return;
}
```

---

## 未來擴充

### 被動技能（第二階段）
- 自動觸發效果
- 持續性增益
- 條件觸發

### 魔法技能（第三階段）
- 魔法傷害技能
- 回復技能
- 增益/減益技能

### 技能升級系統
- 技能等級
- 升級效果
- 升級消耗

---

## 更新記錄

- 2026-01-20: 建立技能系統設計規格
