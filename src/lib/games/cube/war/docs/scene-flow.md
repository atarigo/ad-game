# Cube War 場景與階段流程

## 場景 (Scenes)

### 1. 主選單場景 (MenuScene)
- 顯示遊戲標題
- 提供「開始遊戲」按鈕
- 點擊後進入 **GameScene**

### 2. 關卡場景 (GameScene)
- 遊戲的主要場景
- 包含開始階段、我方階段、敵方階段的循環
- 當玩家生命歸零時，進入 **ResultScene**

### 3. 結算場景 (ResultScene)
- 顯示「遊戲結束」訊息
- 顯示通關層數
- 提供「確認」按鈕回到 **MenuScene**

## 階段流程 (Phase Flow)

### 關卡流程
```
關卡開始
  ↓
進入開始階段 (START)
  ↓
進入我方階段 (PLAYER_TURN)
  ↓
進入敵方階段 (ENEMY_TURN)
  ↓
回合完成 → 回到我方階段（重複循環）
  ↓
敵人全滅 → 下一關卡（重新開始階段）
```

### 開始階段 (START)
**觸發時機**: 每回合開始時（每回合只進入一次）

**執行內容**:
1. 生成敵人（根據當前關卡數）
2. 自動進入我方階段

**方法**: `enterStartPhase()`

### 我方階段 (PLAYER_TURN)
**觸發時機**: 開始階段結束後，或敵方階段結束後

**執行內容**:
1. 產生可選方塊（3個）
2. 玩家拖曳放置方塊
3. 判斷是否可消除（攻擊敵方）
4. 判斷剩餘可選方塊是否可以繼續放置
5. 若剩餘可選方塊都無法放置，顯示「跳過階段」按鈕
6. 若所有可選方塊都已放置，在消除方塊（攻擊敵方）完成後，直接進入敵方階段

**方法**: `enterPlayerPhase()`

**結束條件**:
- 所有可選方塊放置完畢 → 自動進入敵方階段
- 剩餘方塊都無法放置，點擊「跳過階段」按鈕 → 進入敵方階段

### 敵方階段 (ENEMY_TURN)
**觸發時機**: 我方階段結束後

**執行內容**:
1. 依序走訪每個敵方方塊
2. 減少方塊的行動冷卻時間 -1
3. 若方塊冷卻結束（cooldown === 0），則：
   - 播放攻擊動畫（方塊上下動一下）
   - 對我方生命進行攻擊
   - 重置冷卻時間
   - 檢查玩家是否死亡（生命 <= 0）
4. 所有方塊行動完後：
   - 若敵人全滅 → 進入下一關卡
   - 否則 → 回到我方階段（進入下一回合）

**方法**: `enterEnemyPhase()`, `processEnemyTurn()`

## 關卡與回合管理

### 回合 (Round)
- 一個回合 = 我方階段 + 敵方階段
- 回合數在當前關卡內累加
- 完成回合：`completeRound()` → 回合數 +1，進入我方階段

### 關卡 (Level)
- 一個關卡包含多個回合
- 關卡完成條件：敵人全滅
- 完成關卡：`levelComplete()` → 關卡數 +1，回合數重置為 1，進入開始階段

### 遊戲結束
- 觸發條件：玩家生命 <= 0
- 跳轉到結算場景，傳遞通關層數
- 方法：`gameOver()`

## 代碼組織結構

GameScene.ts 的代碼已按功能分組：

```
// ==================== Phaser 生命週期 ====================
- create()
- update()

// ==================== 初始化 ====================
- initGameState()

// ==================== UI 繪製 ====================
- drawUI()
- getPhaseText()
- drawGrids()
- drawGrid()

// ==================== 子彈系統 ====================
- updateBullets()
- checkBulletEnemyCollision()
- removeBullet()

// ==================== 敵人系統 ====================
- spawnEnemies()
- drawEnemies()

// ==================== 玩家方塊系統 ====================
- generateOptions()
- setupDragAndDrop()
- resetPiecePosition()
- placePiece()
- handleLineClear()
- shootBulletsSequentially()
- shootBullet()
- attackEnemyAtPosition()
- drawPlayerGrid()

// ==================== 可放置性檢查 ====================
- hasPlaceablePieces()
- updatePiecePlaceability()
- showSkipButton()
- hideSkipButton()

// ==================== 敵方階段處理 ====================
- processEnemyTurn()
- playEnemyAttackAnimation()
- enemyAttack()

// ==================== 回合與關卡管理 ====================
- completeRound()
- levelComplete()
- gameOver()

// ==================== 遊戲流程控制 ====================
- startGameLoop()

// ==================== 階段管理 ====================
- enterStartPhase()
- enterPlayerPhase()
- endPlayerTurn()
- enterEnemyPhase()
```
