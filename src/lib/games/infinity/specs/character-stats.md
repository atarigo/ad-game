# 角色狀態系統規格

敵我雙方皆使用相同的屬性公式計算系統。

## 主屬性 (Primary Attributes)

所有主屬性基礎值為 **10 點**。

| 英文名       | 中文名 | 縮寫 | 基礎值 |
| ------------ | ------ | ---- | ------ |
| Strength     | 力量   | STR  | 10     |
| Agility      | 敏捷   | AGI  | 10     |
| Vitality     | 體力   | VIT  | 10     |
| Intelligence | 智力   | INT  | 10     |
| Willpower    | 意志   | WIL  | 10     |
| Luck         | 幸運   | LUK  | 10     |

## 延伸屬性 (Derived Attributes)

延伸屬性由主屬性與裝備加成計算而來。

### 攻擊類

| 屬性名稱     | 英文名            | 計算公式                                   |
| ------------ | ----------------- | ------------------------------------------ |
| 近距離攻擊力 | Melee Attack      | `Strength + 武器攻擊力`（優先使用裝備欄位）|
| 魔法攻擊力   | Magic Attack      | `Intelligence + magicAttack + magicWeaponAttack` |
| 遠程攻擊力   | Ranged Attack     | `weaponAttack + ammoAttack`                |

### 生存類

| 屬性名稱 | 英文名        | 計算公式         |
| -------- | ------------- | ---------------- |
| 血量     | Health Points | `Vitality * 10`  |
| 魔力     | Mana Points   | `Intelligence * 10` |

### 防禦類

| 屬性名稱   | 英文名        | 計算公式                        |
| ---------- | ------------- | ------------------------------- |
| 物理防禦   | Defense       | `Vitality + armorDefense`       |
| 魔法防禦力 | Magic Defense | `Intelligence + armorMagicDefense` |

### 回復類

| 屬性名稱       | 英文名              | 計算公式          |
| -------------- | ------------------- | ----------------- |
| 每回合回復血量 | Health Regeneration | `Willpower`       |
| 每回合恢復魔力 | Mana Regeneration   | `Willpower * 0.2` |

### 暴擊類

| 屬性名稱   | 英文名          | 計算公式         |
| ---------- | --------------- | ---------------- |
| 暴擊機率   | Critical Chance | `Luck * 0.1`     |
| 暴擊傷害   | Critical Damage | `Willpower * 0.1` |

## 裝備加成 (Equipment Bonuses)

以下為裝備提供的額外數值：

| 加成名稱       | 英文名            | 說明                   |
| -------------- | ----------------- | ---------------------- |
| 武器攻擊力     | weaponAttack      | 武器提供的物理攻擊加成 |
| 魔法攻擊力     | magicAttack       | 裝備提供的魔法攻擊加成 |
| 魔法武器攻擊力 | magicWeaponAttack | 魔法武器提供的攻擊加成 |
| 子彈攻擊力     | ammoAttack        | 彈藥提供的攻擊加成     |
| 防具魔法防禦力 | armorMagicDefense | 防具提供的魔法防禦加成 |

## 回合流程 (Turn Flow)

每回合按照以下順序執行：

### 1. 回合開始 - 玩家攻擊階段

1. 玩家對隨機敵人發動攻擊
2. 計算傷害值 = `近距離攻擊力 (meleeAttack)`
3. 判定暴擊：擲骰 < `暴擊機率` 則觸發
4. 若暴擊：傷害 = `傷害 * (1 + 暴擊傷害)`
5. 計算實際傷害 = `max(0, 傷害 - 敵人防禦)`
6. 敵人扣血

### 2. 回合結束 - 敵人攻擊階段

1. 敵人對玩家發動攻擊
2. 計算方式同上

### 3. 回合結束 - 回復階段

1. 雙方回復血量：`currentHealth += healthRegeneration`（不超過上限）
2. 雙方回復魔力：`currentMana += manaRegeneration`（不超過上限）

### 傷害計算公式

```
實際傷害 = max(0, 攻擊力 - 防禦力)

若暴擊：
  最終傷害 = 攻擊力 * (1 + 暴擊傷害)
```

## 使用範例

```typescript
// 建立基礎角色
const player = new CharacterStats();
// 所有主屬性預設為 10

// 設定裝備加成
player.equipment.weaponAttack = 15;
player.equipment.armorMagicDefense = 5;

// 取得計算後的延伸屬性
player.derived.meleeAttack;    // 10 + 15 = 25
player.derived.healthPoints;   // 10 * 10 = 100
player.derived.magicDefense;   // 10 + 5 = 15
```
