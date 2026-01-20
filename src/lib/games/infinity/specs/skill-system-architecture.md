# 技能系統架構設計

## 架構概述

技能系統需要整合多個子系統：
1. **傷害計算系統**：擴展現有傷害計算，支援真實傷害、倍率傷害等
2. **狀態效果系統**：管理 buff/debuff（暈眩、中毒等）
3. **技能管理系統**：技能學習、冷卻、使用
4. **戰鬥系統整合**：與 BattleManager 整合

---

## 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    MainScene (UI Layer)                  │
│  - 技能格顯示                                            │
│  - 技能使用互動                                          │
│  - 狀態效果 UI 顯示                                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              BattleManager (Combat Logic)                │
│  - executePlayerSkill()                                 │
│  - 整合技能傷害計算                                       │
│  - 處理狀態效果                                           │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────────────┐
│ DamageSystem │ │ Status  │ │ SkillManager    │
│              │ │ System │ │                 │
│ - 傷害計算    │ │        │ │ - 技能學習       │
│ - 真實傷害    │ │ - Buff │ │ - 冷卻管理       │
│ - 倍率傷害    │ │ - Debuff│ │ - 技能使用       │
└──────────────┘ └─────────┘ └─────────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │   CharacterStats        │
        │  - 技能欄位              │
        │  - 狀態效果列表           │
        │  - 擴展 takeDamage()     │
        └──────────────────────────┘
```

---

## 1. 傷害計算系統擴展

### 問題分析

目前 `takeDamage()` 方法只支援：
- 物理傷害（考慮物理防禦）
- 魔法傷害（考慮魔法防禦）

需要擴展支援：
- **真實傷害**：無視防禦
- **倍率傷害**：基於攻擊力的倍率
- **屬性傷害**：基於屬性的傷害

### 設計方案

#### 1.1 傷害類型擴展

```typescript
/**
 * 傷害類型
 */
export enum DamageType {
  Physical = 'physical',    // 物理傷害（考慮物理防禦）
  Magic = 'magic',          // 魔法傷害（考慮魔法防禦）
  True = 'true'             // 真實傷害（無視防禦）
}

/**
 * 傷害來源
 */
export interface DamageSource {
  type: DamageType;
  baseValue?: number;       // 基礎傷害值
  multiplier?: number;       // 倍率（例如 1.5 = 150%）
  attribute?: keyof PrimaryAttributes; // 基於哪個屬性
  attributePercent?: number; // 屬性百分比（例如 0.6 = 60%）
  attacker?: CharacterStats; // 攻擊者（用於計算基礎攻擊力）
}

/**
 * 傷害結果
 */
export interface DamageResult {
  baseDamage: number;       // 基礎傷害（計算防禦前）
  actualDamage: number;      // 實際傷害（計算防禦後）
  isCritical: boolean;      // 是否暴擊
  damageType: DamageType;   // 傷害類型
}
```

#### 1.2 擴展 CharacterStats.takeDamage()

```typescript
/**
 * 受到傷害（擴展版）
 * @param source 傷害來源
 * @param isCritical 是否為暴擊
 * @returns 傷害結果
 */
public takeDamageFromSource(
  source: DamageSource,
  isCritical: boolean = false
): DamageResult {
  // 計算基礎傷害
  let baseDamage = 0;
  
  if (source.type === DamageType.True) {
    // 真實傷害：基於屬性
    if (source.attribute && source.attributePercent && source.attacker) {
      baseDamage = source.attacker.primary[source.attribute] * source.attributePercent;
    } else if (source.baseValue) {
      baseDamage = source.baseValue;
    }
    // 真實傷害無視防禦
    const actualDamage = baseDamage;
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    
    return {
      baseDamage,
      actualDamage,
      isCritical,
      damageType: DamageType.True
    };
  }
  
  // 普通傷害：計算基礎值
  if (source.multiplier && source.attacker) {
    // 倍率傷害
    baseDamage = source.attacker.derived.meleeAttack * source.multiplier;
  } else if (source.attribute && source.attributePercent && source.attacker) {
    // 屬性傷害
    baseDamage = source.attacker.primary[source.attribute] * source.attributePercent;
  } else if (source.baseValue) {
    // 固定傷害
    baseDamage = source.baseValue;
  }
  
  // 計算防禦
  const defense = source.type === DamageType.Magic 
    ? this.derived.magicDefense 
    : this.derived.defense;
  
  const actualDamage = Math.max(0, baseDamage - defense);
  this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
  
  return {
    baseDamage,
    actualDamage,
    isCritical,
    damageType: source.type
  };
}

/**
 * 向後兼容：保留原有方法
 */
public takeDamage(damage: number, isMagic: boolean = false): number {
  const source: DamageSource = {
    type: isMagic ? DamageType.Magic : DamageType.Physical,
    baseValue: damage
  };
  const result = this.takeDamageFromSource(source);
  return result.actualDamage;
}
```

---

## 2. 狀態效果系統

### 設計方案

#### 2.1 狀態效果定義

```typescript
/**
 * 狀態效果類型
 */
export enum StatusEffectType {
  // Debuff（負面效果）
  Stun = 'stun',            // 暈眩（無法行動）
  Poison = 'poison',        // 中毒（每回合損血）
  Burn = 'burn',            // 燃燒（持續傷害）
  Freeze = 'freeze',        // 冰凍（行動受限）
  
  // Buff（正面效果，未來擴充）
  Strength = 'strength',     // 力量提升
  Defense = 'defense',      // 防禦提升
  Regeneration = 'regeneration' // 回復提升
}

/**
 * 狀態效果
 */
export interface StatusEffect {
  type: StatusEffectType;
  duration: number;          // 剩餘持續時間（回合數）
  value?: number;           // 效果數值（例如每回合傷害）
  source?: string;          // 來源（例如技能 ID）
}

/**
 * 狀態效果管理器
 */
export class StatusEffectManager {
  private effects: StatusEffect[] = [];
  
  /**
   * 添加狀態效果
   */
  addEffect(effect: StatusEffect): void {
    const existingIndex = this.effects.findIndex(e => e.type === effect.type);
    if (existingIndex >= 0) {
      // 更新持續時間（取較大值或疊加，根據效果類型決定）
      this.effects[existingIndex].duration = Math.max(
        this.effects[existingIndex].duration,
        effect.duration
      );
    } else {
      this.effects.push(effect);
    }
  }
  
  /**
   * 更新狀態效果（每回合結束時調用）
   */
  updateEffects(): StatusEffect[] {
    // 減少持續時間
    this.effects = this.effects
      .map(effect => ({ ...effect, duration: effect.duration - 1 }))
      .filter(effect => effect.duration > 0);
    
    return [...this.effects];
  }
  
  /**
   * 檢查是否有特定狀態
   */
  hasEffect(type: StatusEffectType): boolean {
    return this.effects.some(e => e.type === type);
  }
  
  /**
   * 取得所有狀態效果
   */
  getEffects(): StatusEffect[] {
    return [...this.effects];
  }
  
  /**
   * 清除所有狀態效果
   */
  clearAll(): void {
    this.effects = [];
  }
}
```

#### 2.2 整合到 CharacterStats

```typescript
export class CharacterStats {
  // ... 現有屬性
  
  /** 狀態效果管理器 */
  public statusEffects: StatusEffectManager = new StatusEffectManager();
  
  /**
   * 檢查是否被暈眩
   */
  isStunned(): boolean {
    return this.statusEffects.hasEffect(StatusEffectType.Stun);
  }
  
  /**
   * 更新狀態效果（回合結束時調用）
   */
  updateStatusEffects(): void {
    this.statusEffects.updateEffects();
    
    // 處理持續傷害效果
    for (const effect of this.statusEffects.getEffects()) {
      if (effect.type === StatusEffectType.Poison && effect.value) {
        this.takeDamage(effect.value, false);
      }
      if (effect.type === StatusEffectType.Burn && effect.value) {
        this.takeDamage(effect.value, false);
      }
    }
  }
}
```

---

## 3. 技能管理系統

### 設計方案

#### 3.1 技能定義

```typescript
/**
 * 技能類型
 */
export enum SkillType {
  Active = 'active',
  Passive = 'passive'
}

/**
 * 技能效果
 */
export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'stun';
  damageType?: DamageType;
  value?: number;
  multiplier?: number;
  attribute?: keyof PrimaryAttributes;
  attributePercent?: number;
  statusEffect?: {
    type: StatusEffectType;
    duration: number;
    value?: number;
  };
}

/**
 * 技能定義
 */
export interface Skill {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: SkillType;
  effects: SkillEffect[];
  manaCost: number;
  cooldown: number;
  price: number;
  tier: Tier;
  icon?: string;
}

/**
 * 已學習的技能
 */
export interface LearnedSkill {
  skillId: string;
  currentCooldown: number;
  isOnCooldown: boolean;
}
```

#### 3.2 技能管理器

```typescript
/**
 * 技能管理器
 */
export class SkillManager {
  private learnedSkills: Map<string, LearnedSkill> = new Map();
  private skillDefinitions: Map<string, Skill> = new Map();
  
  /**
   * 註冊技能定義
   */
  registerSkill(skill: Skill): void {
    this.skillDefinitions.set(skill.id, skill);
  }
  
  /**
   * 學習技能
   */
  learnSkill(skillId: string): boolean {
    if (this.learnedSkills.has(skillId)) {
      return false; // 已學習
    }
    
    this.learnedSkills.set(skillId, {
      skillId,
      currentCooldown: 0,
      isOnCooldown: false
    });
    
    return true;
  }
  
  /**
   * 檢查技能是否可用
   */
  canUseSkill(skillId: string, currentMana: number): boolean {
    const learned = this.learnedSkills.get(skillId);
    if (!learned) return false;
    
    const skill = this.skillDefinitions.get(skillId);
    if (!skill) return false;
    
    if (learned.isOnCooldown) return false;
    if (currentMana < skill.manaCost) return false;
    
    return true;
  }
  
  /**
   * 使用技能（開始冷卻）
   */
  useSkill(skillId: string): void {
    const learned = this.learnedSkills.get(skillId);
    if (!learned) return;
    
    const skill = this.skillDefinitions.get(skillId);
    if (!skill) return;
    
    learned.currentCooldown = skill.cooldown;
    learned.isOnCooldown = true;
  }
  
  /**
   * 更新冷卻（每回合結束時調用）
   */
  updateCooldowns(): void {
    for (const learned of this.learnedSkills.values()) {
      if (learned.isOnCooldown) {
        learned.currentCooldown--;
        if (learned.currentCooldown <= 0) {
          learned.currentCooldown = 0;
          learned.isOnCooldown = false;
        }
      }
    }
  }
  
  /**
   * 取得已學習的技能列表
   */
  getLearnedSkills(): LearnedSkill[] {
    return Array.from(this.learnedSkills.values());
  }
  
  /**
   * 取得技能定義
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skillDefinitions.get(skillId);
  }
}
```

#### 3.3 整合到 CharacterStats

```typescript
export class CharacterStats {
  // ... 現有屬性
  
  /** 技能管理器 */
  public skills: SkillManager = new SkillManager();
  
  /**
   * 學習技能
   */
  learnSkill(skillId: string): boolean {
    return this.skills.learnSkill(skillId);
  }
  
  /**
   * 檢查技能是否可用
   */
  canUseSkill(skillId: string): boolean {
    return this.skills.canUseSkill(skillId, this.currentMana);
  }
}
```

---

## 4. 戰鬥系統整合

### 設計方案

#### 4.1 擴展 BattleManager

```typescript
export class BattleManager {
  // ... 現有屬性
  
  /**
   * 執行玩家技能
   */
  public executePlayerSkill(
    skillId: string,
    targetIndex?: number
  ): SkillResult | null {
    const index = targetIndex ?? this.selectedTargetIndex;
    
    // 檢查技能是否可用
    if (!this.playerStats.canUseSkill(skillId)) {
      return null;
    }
    
    const target = this.enemyStats[index];
    if (!target || !target.isAlive) {
      return null;
    }
    
    const skill = this.playerStats.skills.getSkill(skillId);
    if (!skill) {
      return null;
    }
    
    // 消耗魔力
    if (!this.playerStats.consumeMana(skill.manaCost)) {
      return null;
    }
    
    // 開始冷卻
    this.playerStats.skills.useSkill(skillId);
    
    // 執行技能效果
    const result = this.executeSkillEffects(skill, this.playerStats, target);
    
    // 觸發回調
    this.callbacks.onPlayerSkillUse?.(skillId, result, index);
    
    if (result.targetDefeated) {
      this.callbacks.onEnemyDefeated?.(index);
    }
    
    return result;
  }
  
  /**
   * 執行技能效果
   */
  private executeSkillEffects(
    skill: Skill,
    attacker: CharacterStats,
    defender: CharacterStats
  ): SkillResult {
    const damageResults: DamageResult[] = [];
    const statusEffects: StatusEffect[] = [];
    
    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        // 計算傷害
        const damageSource: DamageSource = {
          type: effect.damageType ?? DamageType.Physical,
          multiplier: effect.multiplier,
          attribute: effect.attribute,
          attributePercent: effect.attributePercent,
          attacker
        };
        
        const damageResult = defender.takeDamageFromSource(damageSource);
        damageResults.push(damageResult);
      }
      
      if (effect.type === 'stun' && effect.statusEffect) {
        // 添加狀態效果
        defender.statusEffects.addEffect({
          type: effect.statusEffect.type,
          duration: effect.statusEffect.duration,
          value: effect.statusEffect.value,
          source: skill.id
        });
        statusEffects.push({
          type: effect.statusEffect.type,
          duration: effect.statusEffect.duration,
          value: effect.statusEffect.value
        });
      }
    }
    
    return {
      skillId: skill.id,
      damageResults,
      statusEffects,
      targetDefeated: !defender.isAlive
    };
  }
  
  /**
   * 更新狀態效果和冷卻（回合結束時調用）
   */
  public updateEffectsAndCooldowns(): void {
    // 更新玩家狀態效果
    this.playerStats.updateStatusEffects();
    
    // 更新敵人狀態效果
    for (const enemy of this.enemyStats) {
      if (enemy.isAlive) {
        enemy.updateStatusEffects();
      }
    }
    
    // 更新技能冷卻
    this.playerStats.skills.updateCooldowns();
  }
  
  /**
   * 檢查敵人是否被暈眩（跳過攻擊）
   */
  private shouldSkipEnemyTurn(enemy: CharacterStats): boolean {
    return enemy.isStunned();
  }
}
```

#### 4.2 技能結果介面

```typescript
/**
 * 技能使用結果
 */
export interface SkillResult {
  skillId: string;
  damageResults: DamageResult[];
  statusEffects: StatusEffect[];
  targetDefeated: boolean;
}
```

---

## 5. 檔案結構

```
src/lib/games/infinity/
├── entities/
│   ├── CharacterStats.ts      # 擴展：狀態效果、技能管理
│   ├── Skill.ts                # 新增：技能定義
│   └── StatusEffect.ts         # 新增：狀態效果定義
│
├── systems/
│   ├── BattleManager.ts         # 擴展：技能使用
│   ├── DamageSystem.ts          # 新增：傷害計算系統
│   └── SkillManager.ts          # 新增：技能管理器
│
├── data/
│   └── skills/
│       ├── index.ts             # 技能資料匯出
│       └── melee-skills.json    # 近戰技能定義
│
└── specs/
    ├── skill-system.md          # 技能系統規格
    └── skill-system-architecture.md  # 架構設計（本文件）
```

---

## 6. 實作順序

### 階段 1：基礎架構（核心系統）
1. [ ] 建立 `StatusEffect.ts` - 狀態效果定義和管理器
2. [ ] 建立 `DamageSystem.ts` - 傷害計算系統
3. [ ] 擴展 `CharacterStats.takeDamageFromSource()` - 支援多種傷害類型
4. [ ] 整合 `StatusEffectManager` 到 `CharacterStats`

### 階段 2：技能系統
5. [ ] 建立 `Skill.ts` - 技能定義介面
6. [ ] 建立 `SkillManager.ts` - 技能管理器
7. [ ] 建立 `data/skills/` - 技能資料
8. [ ] 定義三種近戰技能
9. [ ] 整合 `SkillManager` 到 `CharacterStats`

### 階段 3：戰鬥整合
10. [ ] 擴展 `BattleManager.executePlayerSkill()` - 技能使用
11. [ ] 實作 `executeSkillEffects()` - 技能效果執行
12. [ ] 整合狀態效果到回合系統（暈眩跳過回合）
13. [ ] 更新 `applyEndOfTurnEffects()` - 包含狀態效果更新

### 階段 4：UI 整合
14. [ ] 更新技能格 UI - 顯示技能、冷卻狀態
15. [ ] 實作技能使用互動
16. [ ] 顯示狀態效果圖示
17. [ ] 技能資訊提示

### 階段 5：商店整合
18. [ ] 在商店中加入技能購買區域
19. [ ] 實作技能購買邏輯
20. [ ] 技能學習機制

---

## 7. 關鍵設計決策

### 7.1 傷害計算擴展性

使用 `DamageSource` 介面，可以輕鬆擴展新的傷害類型：
- 真實傷害
- 倍率傷害
- 屬性傷害
- 未來可加入：元素傷害、百分比傷害等

### 7.2 狀態效果系統

使用 `StatusEffectManager` 獨立管理狀態，不污染 `CharacterStats`：
- 易於測試
- 易於擴展新狀態
- 清晰的職責分離

### 7.3 技能系統設計

技能使用流程：
1. 檢查條件（已學習、魔力、冷卻）
2. 消耗資源（魔力）
3. 執行效果（傷害、狀態）
4. 開始冷卻
5. 更新 UI

### 7.4 向後兼容

保留原有的 `takeDamage()` 方法，確保現有代碼不受影響。

---

## 8. 測試考量

### 單元測試重點

1. **傷害計算**
   - 真實傷害無視防禦
   - 倍率傷害計算正確
   - 屬性傷害計算正確

2. **狀態效果**
   - 暈眩效果正確應用
   - 狀態持續時間正確減少
   - 狀態效果正確清除

3. **技能系統**
   - 冷卻機制正確
   - 魔力消耗正確
   - 技能學習正確

---

## 更新記錄

- 2026-01-20: 建立技能系統架構設計文件
