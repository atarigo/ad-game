# ECS 架構設計

## 為什麼使用 ECS？

Entity-Component-System 架構特別適合這個遊戲，因為：

1. **高度模組化**：技能、屬性、裝備可以靈活組合
2. **易於擴展**：新增功能只需要新增組件和系統
3. **效能優秀**：組件導向設計便於批次處理
4. **維護性好**：邏輯分離，職責清晰

## 核心概念

### Entity（實體）
遊戲中的物件容器，本身不包含任何邏輯或資料。

```typescript
class Entity {
  id: EntityId;
  components: Map<string, Component>;
}
```

**範例**：
- 玩家角色是一個 Entity
- 敵人是一個 Entity
- 技能效果可以是一個 Entity

### Component（組件）
純資料結構，不包含邏輯。

```typescript
interface PositionComponent {
  row: number;
  col: number;
  width: number;
  height: number;
}
```

### System（系統）
包含遊戲邏輯，處理特定組件的實體。

```typescript
class BattleSystem {
  update(entities: Entity[]): void;
}
```

## 現有組件

### 1. PositionComponent（位置組件）
```typescript
{
  row: number;      // 棋盤行
  col: number;      // 棋盤列
  width: number;    // 占用寬度（格數）
  height: number;   // 占用高度（格數）
}
```

**用途**：追蹤實體在棋盤上的位置和大小

### 2. TeamComponent（陣營組件）
```typescript
{
  isEnemy: boolean; // true = 敵人, false = 我方
}
```

**用途**：區分敵我陣營

### 3. StatsComponent（屬性組件）
```typescript
{
  str: number;      // 力量
  vit: number;      // 體質
}
```

**用途**：基礎屬性

### 4. CombatComponent（戰鬥組件）
```typescript
{
  currentHp: number; // 當前生命值
  maxHp: number;     // 最大生命值
  atk: number;       // 攻擊力
  def: number;       // 防禦力
}
```

**用途**：戰鬥相關的即時數據

### 5. RenderComponent（渲染組件）
```typescript
{
  color: number;                    // 顏色
  sprite?: Phaser.GameObjects.Rectangle; // Phaser 物件
}
```

**用途**：視覺呈現

## 現有系統

### 1. GridSystem（格子系統）
**職責**：
- 計算格子位置
- 檢查位置有效性
- 處理格子占用

**主要方法**：
- `getEnemyCellPosition(row, col)`
- `getAllyCellPosition(row, col)`
- `isValidEnemyPosition(...)`
- `markOccupied(...)`

### 2. BattleSystem（戰鬥系統）
**職責**：
- 管理回合流程
- 處理攻擊邏輯
- 判定勝負

**主要方法**：
- `endPlayerControl()`
- `attack(attacker, target)`
- `findEnemyInFront(position)`
- `getAliveEnemies()`

## World（世界）

管理所有 Entity 的容器。

```typescript
class World {
  createEntity(): Entity;
  getEntity(id): Entity;
  removeEntity(id): void;
  getEntitiesWith(...components): Entity[];
}
```

## 資料流

```
1. 創建 Entity
   ↓
2. 添加 Components
   ↓
3. System 查詢符合條件的 Entities
   ↓
4. System 處理這些 Entities 的 Components
   ↓
5. Components 數據更新
   ↓
6. 渲染系統讀取 Components 並更新畫面
```

## 擴展範例

### 新增狀態效果系統

1. **新增組件**
```typescript
interface StatusEffectComponent {
  effects: Array<{
    type: 'poison' | 'stun' | 'burn';
    duration: number;
    power: number;
  }>;
}
```

2. **新增系統**
```typescript
class StatusEffectSystem {
  update(world: World) {
    const entities = world.getEntitiesWith(
      COMPONENTS.STATUS_EFFECT,
      COMPONENTS.COMBAT
    );

    for (const entity of entities) {
      // 處理狀態效果
    }
  }
}
```

3. **整合到回合流程**
```typescript
// 在 BattleSystem 的適當階段調用
statusEffectSystem.update(world);
```

## 最佳實踐

### ✅ DO
- 保持組件只包含數據
- 系統之間不直接調用
- 使用 World 查詢實體
- 一個系統專注一個功能

### ❌ DON'T
- 在組件中寫邏輯
- 組件之間互相引用
- 系統直接修改其他系統的狀態
- 在組件中儲存 Phaser 物件（除了 RenderComponent）

## 未來規劃

### 計畫新增的組件
1. **SkillComponent**：技能資料
2. **EquipmentComponent**：裝備資料
3. **StatusEffectComponent**：狀態效果
4. **MovementComponent**：移動能力
5. **AIComponent**：AI 行為

### 計畫新增的系統
1. **SkillSystem**：技能施放和效果
2. **MovementSystem**：移動處理
3. **AISystem**：敵人 AI
4. **EquipmentSystem**：裝備效果計算
5. **StatusEffectSystem**：狀態效果處理
