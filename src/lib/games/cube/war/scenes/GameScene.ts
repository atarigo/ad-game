import type Phaser from 'phaser';
import {
	GAME_WIDTH,
	GAME_HEIGHT,
	COLORS,
	GRID_CONFIG,
	AREA_POSITIONS,
	GamePhase,
	PLAYER_HP
} from '../config';
import { GridSystem } from '../systems/GridSystem';
import { TetrisSystem } from '../systems/TetrisSystem';
import { EnemySystem } from '../systems/EnemySystem';
import type { TetrisPiece, GridPosition, Enemy, GameState } from '../types';

export class GameScene extends Phaser.Scene {
	private gameState!: GameState;
	private enemyGraphics: Phaser.GameObjects.Graphics[] = [];
	private enemyTexts: Phaser.GameObjects.Text[] = [];
	private playerCellGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
	private optionPieces: Phaser.GameObjects.Container[] = [];
	private draggedPiece: Phaser.GameObjects.Container | null = null;
	private draggedPieceIndex: number = -1;
	private playerHpText!: Phaser.GameObjects.Text;
	private levelText!: Phaser.GameObjects.Text;
	private roundText!: Phaser.GameObjects.Text;
	private phaseText!: Phaser.GameObjects.Text;
	private nextPieceId: number = 1;
	private previewGraphics: Phaser.GameObjects.Graphics | null = null;
	private skipButton: Phaser.GameObjects.Container | null = null;
	private optionOriginalPositions: Map<number, { x: number; y: number }> = new Map();
	private previewGridPos: GridPosition | null = null;
	private bullets: Phaser.GameObjects.Graphics[] = [];
	private bulletData: Array<{ graphics: Phaser.GameObjects.Graphics; startX: number; startY: number; targetY: number; speed: number; fromCell: GridPosition }> = [];
	private shouldEndPlayerTurnAfterAttack: boolean = false; // 標記是否需要在攻擊完成後結束我方階段

	constructor() {
		super({ key: 'GameScene' });
	}

	// ==================== Phaser 生命週期 ====================

	create() {
		// 初始化遊戲狀態
		this.initGameState();

		// 繪製 UI
		this.drawUI();

		// 繪製格子
		this.drawGrids();

		// 開始遊戲循環（會自動生成敵人和選項）
		this.startGameLoop();
	}

	update() {
		// 更新子彈位置和碰撞檢測
		this.updateBullets();
	}

	// ==================== 初始化 ====================

	private initGameState() {
		this.gameState = {
			phase: GamePhase.START,
			playerHp: PLAYER_HP,
			level: 1, // 從關卡1開始
			round: 1, // 從回合1開始
			enemies: [],
			playerGrid: Array(GRID_CONFIG.playerRows)
				.fill(null)
				.map(() => Array(GRID_CONFIG.playerCols).fill(null)),
			options: []
		};
	}

	// ==================== UI 繪製 ====================

	private drawUI() {
		// 左上方
		// 玩家生命值（第一行）
		this.playerHpText = this.add
			.text(10, 30, `生命值: ${this.gameState.playerHp}`, {
				fontSize: '16px',
				color: COLORS.text
			});

		// 階段（第二行）
		this.phaseText = this.add
			.text(10, 54, `階段: ${this.getPhaseText()}`, {
				fontSize: '16px',
				color: COLORS.text
			});

		// 右上方
		// 關卡數（第一行，右對齊）
		this.levelText = this.add
			.text(GAME_WIDTH - 10, 30, `關卡: ${this.gameState.level}`, {
				fontSize: '16px',
				color: COLORS.text
			})
			.setOrigin(1, 0); // 右對齊

		// 回合數（第二行，右對齊）
		this.roundText = this.add
			.text(GAME_WIDTH - 10, 54, `回合: ${this.gameState.round}`, {
				fontSize: '16px',
				color: COLORS.text
			})
			.setOrigin(1, 0); // 右對齊
	}

	private getPhaseText(): string {
		switch (this.gameState.phase) {
			case GamePhase.START:
				return '開始階段';
			case GamePhase.PLAYER_TURN:
				return '我方階段';
			case GamePhase.ENEMY_TURN:
				return '敵方階段';
			default:
				return '';
		}
	}

	private drawGrids() {
		// 繪製敵人區域格子
		this.drawGrid(
			AREA_POSITIONS.enemyArea.x,
			AREA_POSITIONS.enemyArea.y,
			GRID_CONFIG.enemyRows,
			GRID_CONFIG.enemyCols,
			'enemy'
		);

		// 繪製玩家區域格子
		this.drawGrid(
			AREA_POSITIONS.playerArea.x,
			AREA_POSITIONS.playerArea.y,
			GRID_CONFIG.playerRows,
			GRID_CONFIG.playerCols,
			'player'
		);
	}

	private drawGrid(x: number, y: number, rows: number, cols: number, type: string) {
		const graphics = this.add.graphics();

		// 繪製背景格子
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				graphics.fillStyle(COLORS.cellEmpty, 0.3);
				graphics.fillRect(
					x + col * GRID_CONFIG.cellSize,
					y + row * GRID_CONFIG.cellSize,
					GRID_CONFIG.cellSize,
					GRID_CONFIG.cellSize
				);
			}
		}

		// 繪製格子線條（更明顯）
		graphics.lineStyle(2, COLORS.gridLine, 0.8);

		for (let row = 0; row <= rows; row++) {
			graphics.moveTo(x, y + row * GRID_CONFIG.cellSize);
			graphics.lineTo(x + cols * GRID_CONFIG.cellSize, y + row * GRID_CONFIG.cellSize);
		}

		for (let col = 0; col <= cols; col++) {
			graphics.moveTo(x + col * GRID_CONFIG.cellSize, y);
			graphics.lineTo(x + col * GRID_CONFIG.cellSize, y + rows * GRID_CONFIG.cellSize);
		}

		graphics.strokePath();
	}

	// ==================== 子彈系統 ====================

	private updateBullets() {
		const deltaTime = this.game.loop.delta / 1000; // 轉換為秒

		for (let i = this.bulletData.length - 1; i >= 0; i--) {
			const bulletInfo = this.bulletData[i];
			const bullet = bulletInfo.graphics;

			// 移動子彈向上
			bullet.y -= bulletInfo.speed * deltaTime;

			// 檢查是否到達畫面上方
			if (bullet.y <= AREA_POSITIONS.enemyArea.y - 20) {
				// 子彈到達目標，移除
				this.removeBullet(i);
				continue;
			}

			// 檢查是否碰撞到敵方方塊
			const hitEnemy = this.checkBulletEnemyCollision(bullet);
			if (hitEnemy) {
				// 子彈碰撞到敵人，直接對該敵人造成傷害
				this.damageEnemy(hitEnemy, 10);
				this.removeBullet(i);
				this.drawEnemies();

				// 檢查敵人是否全滅（關卡完成）
				if (this.gameState.enemies.length === 0) {
					this.levelComplete();
				}
				continue;
			}
		}

		// 檢查是否所有子彈都已清除，且需要結束我方階段
		if (this.bulletData.length === 0 && this.shouldEndPlayerTurnAfterAttack) {
			this.shouldEndPlayerTurnAfterAttack = false;
			this.endPlayerTurn();
		}
	}

	private checkBulletEnemyCollision(bullet: Phaser.GameObjects.Graphics): Enemy | null {
		// 將子彈位置轉換為敵人區域的格子座標
		const gridPos = GridSystem.worldToGrid(bullet.x, bullet.y, 'enemy');
		if (!gridPos) {
			return null;
		}
		
		// 檢查該位置是否有敵人（會檢查敵人佔據的所有格子）
		const enemy = EnemySystem.getEnemyAtPosition(gridPos, this.gameState.enemies);
		return enemy;
	}

	private removeBullet(index: number) {
		if (index >= 0 && index < this.bulletData.length) {
			const bulletInfo = this.bulletData[index];
			bulletInfo.graphics.destroy();
			this.bulletData.splice(index, 1);
			this.bullets.splice(index, 1);
		}
	}

	// ==================== 敵人系統 ====================

	private spawnEnemies() {
		// 根據關卡數生成敵人（關卡越高，敵人越強）
		this.gameState.enemies = EnemySystem.generateEnemies(this.gameState.level);
		this.drawEnemies();
	}

	private drawEnemies() {
		// 清除舊的敵人圖形和文字
		this.enemyGraphics.forEach((g) => g.destroy());
		this.enemyGraphics = [];
		this.enemyTexts.forEach((t) => t.destroy());
		this.enemyTexts = [];

		for (const enemy of this.gameState.enemies) {
			// 使用左上角位置計算世界座標
			const topLeftWorldPos = GridSystem.gridToWorld(enemy.position, 'enemy');
			// 調整到格子的左上角（而不是中心）
			const cellSize = GRID_CONFIG.cellSize;
			const startX = topLeftWorldPos.x - cellSize / 2;
			const startY = topLeftWorldPos.y - cellSize / 2;
			
			const size = enemy.size * GRID_CONFIG.cellSize;
			
			// 計算方塊的中心位置（用於顯示）
			const centerX = startX + size / 2;
			const centerY = startY + size / 2;

			// 繪製敵人方塊
			const graphics = this.add.graphics();
			graphics.fillStyle(COLORS.enemy, 0.8);
			graphics.fillRect(
				startX + GRID_CONFIG.cellPadding,
				startY + GRID_CONFIG.cellPadding,
				size - GRID_CONFIG.cellPadding * 2,
				size - GRID_CONFIG.cellPadding * 2
			);
			graphics.lineStyle(2, 0xcc0000, 1);
			graphics.strokeRect(
				startX + GRID_CONFIG.cellPadding,
				startY + GRID_CONFIG.cellPadding,
				size - GRID_CONFIG.cellPadding * 2,
				size - GRID_CONFIG.cellPadding * 2
			);

			// 顯示冷卻時間
			if (enemy.cooldown > 0) {
				const cooldownText = this.add
					.text(startX + 5, startY + 5, `${enemy.cooldown}`, {
						fontSize: '12px',
						color: '#ffffff'
					});
				this.enemyTexts.push(cooldownText);
			}

			// 繪製血條
			const hpBarWidth = size - GRID_CONFIG.cellPadding * 4;
			const hpBarHeight = 6;
			const hpBarX = startX + GRID_CONFIG.cellPadding * 2;
			const hpBarY = startY + size - GRID_CONFIG.cellPadding - hpBarHeight - 2;

			// 血量百分比
			const hpPercent = enemy.hp / enemy.maxHp;

			// 血條背景（灰色）
			graphics.fillStyle(0x333333, 0.8);
			graphics.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

			// 血條前景（根據血量百分比改變顏色）
			let hpColor = 0x00ff00; // 綠色（>50%）
			if (hpPercent <= 0.25) {
				hpColor = 0xff0000; // 紅色（≤25%）
			} else if (hpPercent <= 0.5) {
				hpColor = 0xff9900; // 橙色（≤50%）
			} else if (hpPercent <= 0.75) {
				hpColor = 0xffff00; // 黃色（≤75%）
			}

			graphics.fillStyle(hpColor, 1);
			graphics.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

			// 顯示血量數字
			const hpText = this.add
				.text(centerX, hpBarY + hpBarHeight + 8, `${enemy.hp}/${enemy.maxHp}`, {
					fontSize: '10px',
					color: '#ffffff'
				})
				.setOrigin(0.5, 0);
			this.enemyTexts.push(hpText);

			this.enemyGraphics.push(graphics);
		}
	}

	// ==================== 玩家方塊系統 ====================

	private generateOptions() {
		// 清除舊的選項
		this.optionPieces.forEach((container) => container.destroy());
		this.optionPieces = [];

		this.gameState.options = TetrisSystem.generateOptions();

		// 調整選項區域寬度，確保三個區域不重疊，並留出間距
		const optionSpacing = 8; // 選項之間的間距
		const totalSpacing = optionSpacing * 2; // 兩側間距
		const optionWidth = (GAME_WIDTH - AREA_POSITIONS.optionArea.x * 2 - totalSpacing) / 3;
		const optionStartX = AREA_POSITIONS.optionArea.x;
		const optionY = AREA_POSITIONS.optionArea.y + GRID_CONFIG.optionAreaHeight / 2;

		// 為每個選項區域繪製方塊（不繪製格子）
		this.gameState.options.forEach((piece, index) => {
			const areaX = optionStartX + index * (optionWidth + optionSpacing);
			const areaY = AREA_POSITIONS.optionArea.y;
			
			const container = this.add.container(
				areaX + optionWidth / 2,
				optionY
			);

			// 繪製方塊（使用縮放後的大小）
			const displayCellSize = GRID_CONFIG.cellSize * GRID_CONFIG.optionPieceScale;
			
			// 計算方塊的邊界框以進行居中對齊
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;
			
			piece.shape.forEach((offset) => {
				minX = Math.min(minX, offset.x);
				maxX = Math.max(maxX, offset.x);
				minY = Math.min(minY, offset.y);
				maxY = Math.max(maxY, offset.y);
			});
			
			// 計算中心偏移量（相對於邊界框中心）
			const centerOffsetX = (minX + maxX) / 2;
			const centerOffsetY = (minY + maxY) / 2;
			
			piece.shape.forEach((offset) => {
				// 相對於邊界框中心的座標
				const cellX = (offset.x - centerOffsetX) * displayCellSize;
				const cellY = (offset.y - centerOffsetY) * displayCellSize;

				const cell = this.add.graphics();
				cell.fillStyle(piece.color, 0.8);
				cell.fillRect(
					cellX - displayCellSize / 2 + GRID_CONFIG.cellPadding,
					cellY - displayCellSize / 2 + GRID_CONFIG.cellPadding,
					displayCellSize - GRID_CONFIG.cellPadding * 2,
					displayCellSize - GRID_CONFIG.cellPadding * 2
				);
				cell.lineStyle(2, 0xffffff, 0.8);
				cell.strokeRect(
					cellX - displayCellSize / 2 + GRID_CONFIG.cellPadding,
					cellY - displayCellSize / 2 + GRID_CONFIG.cellPadding,
					displayCellSize - GRID_CONFIG.cellPadding * 2,
					displayCellSize - GRID_CONFIG.cellPadding * 2
				);

				container.add(cell);
			});

			// 設置初始縮放
			container.setScale(1);
			container.setData('originalScale', 1);

			// 設置可拖曳
			container.setInteractive(
				new Phaser.Geom.Rectangle(
					-optionWidth / 2,
					-GRID_CONFIG.optionAreaHeight / 2,
					optionWidth,
					GRID_CONFIG.optionAreaHeight
				),
				Phaser.Geom.Rectangle.Contains
			);

			container.setData('pieceIndex', index);
			// 保存原始位置
			this.optionOriginalPositions.set(index, {
				x: areaX + optionWidth / 2,
				y: optionY
			});
			this.optionPieces.push(container);
		});

		// 重新設置拖曳事件
		this.setupDragAndDrop();
		
		// 更新可放置性檢查和視覺效果
		this.updatePiecePlaceability();
	}

	private setupDragAndDrop() {
		this.optionPieces.forEach((container) => {
			this.input.setDraggable(container);

			// 移除舊的事件監聽器以避免重複綁定
			container.removeAllListeners('dragstart');
			container.removeAllListeners('drag');
			container.removeAllListeners('dragend');

			container.on('dragstart', (pointer: Phaser.Input.Pointer) => {
				if (this.gameState.phase !== GamePhase.PLAYER_TURN) return;

				this.draggedPiece = container;
				this.draggedPieceIndex = container.getData('pieceIndex');
				this.previewGridPos = null; // 重置預覽位置
				
				// 保存當前位置作為原始位置（如果還沒保存）
				if (!this.optionOriginalPositions.has(this.draggedPieceIndex)) {
					this.optionOriginalPositions.set(this.draggedPieceIndex, {
						x: container.x,
						y: container.y
					});
				}
				
				// 放大方塊到與中間區域一樣大
				const targetScale = 1 / GRID_CONFIG.optionPieceScale;
				const originalScale = container.scaleX;
				
				// 計算滑鼠相對於 container 中心的偏移
				const localX = pointer.x - container.x;
				const localY = pointer.y - container.y;
				
				// 設置新縮放
				container.setScale(targetScale);
				container.setAlpha(0.7);
				
				// 調整位置，使滑鼠點保持在同一位置
				container.setPosition(
					pointer.x - localX * (targetScale / originalScale),
					pointer.y - localY * (targetScale / originalScale)
				);
			});

			container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
				if (this.draggedPiece !== container) return;

				container.x = dragX;
				container.y = dragY;

				// 清除舊的預覽
				if (this.previewGraphics) {
					this.previewGraphics.destroy();
					this.previewGraphics = null;
				}

				// 顯示預覽位置
				const gridPos = GridSystem.worldToGrid(dragX, dragY, 'player');
				if (gridPos && this.draggedPieceIndex >= 0) {
					const piece = this.gameState.options[this.draggedPieceIndex];
					const canPlace = TetrisSystem.canPlacePiece(piece, gridPos, this.gameState.playerGrid);
					
					// 如果可以放置，保存這個位置作為預覽位置
					if (canPlace) {
						this.previewGridPos = gridPos;
					} else {
						this.previewGridPos = null;
					}
					
					// 繪製預覽
					this.previewGraphics = this.add.graphics();
					const previewColor = canPlace ? 0x00ff00 : 0xff0000;
					const previewAlpha = canPlace ? 0.5 : 0.3;
					
					piece.shape.forEach((offset) => {
						const previewRow = gridPos.row + offset.y;
						const previewCol = gridPos.col + offset.x;
						
						if (previewRow >= 0 && previewRow < GRID_CONFIG.playerRows && 
						    previewCol >= 0 && previewCol < GRID_CONFIG.playerCols) {
							const worldPos = GridSystem.gridToWorld({ row: previewRow, col: previewCol }, 'player');
							
							this.previewGraphics!.fillStyle(previewColor, previewAlpha);
							this.previewGraphics!.fillRect(
								worldPos.x - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
								worldPos.y - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
								GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2,
								GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2
							);
							this.previewGraphics!.lineStyle(2, previewColor, 0.8);
							this.previewGraphics!.strokeRect(
								worldPos.x - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
								worldPos.y - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
								GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2,
								GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2
							);
						}
					});
				} else {
					// 如果不在有效區域，清除預覽位置
					this.previewGridPos = null;
				}
			});

			container.on('dragend', (pointer: Phaser.Input.Pointer) => {
				if (this.draggedPiece !== container) return;

				container.setAlpha(1);

				// 清除預覽
				if (this.previewGraphics) {
					this.previewGraphics.destroy();
					this.previewGraphics = null;
				}

				// 使用預覽時保存的位置（淺綠色標示的位置）
				if (this.previewGridPos && this.draggedPieceIndex >= 0) {
					const piece = this.gameState.options[this.draggedPieceIndex];
					// 再次確認可以放置（以防狀態改變）
					if (TetrisSystem.canPlacePiece(piece, this.previewGridPos, this.gameState.playerGrid)) {
						this.placePiece(piece, this.previewGridPos);
					} else {
						// 放回原始位置，恢復原始大小
						this.resetPiecePosition(container, this.draggedPieceIndex);
					}
				} else {
					// 如果沒有有效的預覽位置，恢復原始位置和大小
					this.resetPiecePosition(container, this.draggedPieceIndex);
				}

				// 清除預覽位置
				this.previewGridPos = null;
				this.draggedPiece = null;
				this.draggedPieceIndex = -1;
			});
		});
	}

	private resetPiecePosition(container: Phaser.GameObjects.Container, index: number) {
		container.setScale(1);
		container.setAlpha(1);
		const originalPos = this.optionOriginalPositions.get(index);
		if (originalPos) {
			container.x = originalPos.x;
			container.y = originalPos.y;
		}
	}

	private placePiece(piece: TetrisPiece, position: GridPosition) {
		// 放置方塊
		TetrisSystem.placePiece(piece, position, this.gameState.playerGrid, this.nextPieceId++);
		this.drawPlayerGrid();

		// 檢查消除
		const { clearedRows, clearedCols } = TetrisSystem.checkAndClearLines(this.gameState.playerGrid);
		const hasAttack = clearedRows.length > 0 || clearedCols.length > 0;
		if (hasAttack) {
			this.handleLineClear(clearedRows, clearedCols);
		}

		// 移除已使用的選項
		if (this.draggedPieceIndex >= 0 && this.draggedPieceIndex < this.gameState.options.length) {
			this.gameState.options.splice(this.draggedPieceIndex, 1);
			if (this.draggedPiece) {
				this.draggedPiece.destroy();
			}
			if (this.draggedPieceIndex < this.optionPieces.length) {
				this.optionPieces.splice(this.draggedPieceIndex, 1);
			}
			// 清除原始位置記錄
			this.optionOriginalPositions.delete(this.draggedPieceIndex);
		}

		// 檢查是否所有可選方塊都已放置
		if (this.gameState.options.length === 0) {
			// 根據規格：若所有可選方塊都已放置，在消除方塊（攻擊敵方）完成後，直接進入敵方階段
			if (hasAttack && this.bulletData.length > 0) {
				// 如果有攻擊且有子彈正在飛行，設置標記等待攻擊完成
				this.shouldEndPlayerTurnAfterAttack = true;
			} else {
				// 沒有攻擊或子彈已經清空，直接進入敵方階段
				this.endPlayerTurn();
			}
		} else {
			// 更新索引並重新設置拖曳事件
			this.optionPieces.forEach((container, index) => {
				container.setData('pieceIndex', index);
			});
			// 重新設置拖曳事件以確保索引正確
			this.setupDragAndDrop();
			// 更新可放置性檢查
			this.updatePiecePlaceability();
		}
	}

	private handleLineClear(clearedRows: number[], clearedCols: number[]) {
		// 收集所有需要發射子彈的位置
		const cellsToShoot: GridPosition[] = [];
		
		// 收集行的方塊位置
		for (const row of clearedRows) {
			for (let col = 0; col < GRID_CONFIG.playerCols; col++) {
				cellsToShoot.push({ row, col });
			}
		}

		// 收集列的方塊位置
		for (const col of clearedCols) {
			for (let row = 0; row < GRID_CONFIG.playerRows; row++) {
				// 避免重複（如果行和列都消除）
				const exists = cellsToShoot.some(cell => cell.row === row && cell.col === col);
				if (!exists) {
					cellsToShoot.push({ row, col });
				}
			}
		}

		// 依序發射子彈
		this.shootBulletsSequentially(cellsToShoot);
	}

	private async shootBulletsSequentially(cells: GridPosition[]) {
		// 先清除格子（視覺上）
		for (const cell of cells) {
			this.gameState.playerGrid[cell.row][cell.col] = null;
		}
		this.drawPlayerGrid();

		// 依序發射子彈
		for (const cell of cells) {
			await this.shootBullet(cell);
			// 小延遲，讓子彈有間隔
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		// 注意：實際傷害和關卡完成檢查在子彈碰撞時處理（updateBullets 方法中）
	}

	private shootBullet(fromCell: GridPosition): Promise<void> {
		return new Promise((resolve) => {
			// 計算起始位置（玩家區域的格子中心）
			const startPos = GridSystem.gridToWorld(fromCell, 'player');
			
			// 計算目標位置（畫面上方）
			const targetY = AREA_POSITIONS.enemyArea.y - 20;
			
			// 創建子彈圖形
			const bullet = this.add.graphics();
			bullet.fillStyle(0x00ff00, 1);
			bullet.fillCircle(0, 0, 5);
			bullet.x = startPos.x;
			bullet.y = startPos.y;
			bullet.setDepth(50);
			
			// 保存子彈數據（使用手動更新而不是 tween）
			const bulletInfo = {
				graphics: bullet,
				startX: startPos.x,
				startY: startPos.y,
				targetY: targetY,
				speed: 300, // 像素/秒
				fromCell: fromCell
			};
			this.bulletData.push(bulletInfo);
			this.bullets.push(bullet);
			
			resolve();
		});
	}

	/**
	 * 對敵人造成傷害
	 */
	private damageEnemy(enemy: Enemy, damage: number): void {
		enemy.hp -= damage;
		if (enemy.hp <= 0) {
			// 移除敵人
			const index = this.gameState.enemies.indexOf(enemy);
			if (index > -1) {
				this.gameState.enemies.splice(index, 1);
			}
		}
	}

	private drawPlayerGrid() {
		// 清除舊的圖形
		this.playerCellGraphics.forEach((g) => g.destroy());
		this.playerCellGraphics.clear();

		for (let row = 0; row < GRID_CONFIG.playerRows; row++) {
			for (let col = 0; col < GRID_CONFIG.playerCols; col++) {
				if (this.gameState.playerGrid[row][col] !== null) {
					const worldPos = GridSystem.gridToWorld({ row, col }, 'player');
					const graphics = this.add.graphics();
					graphics.fillStyle(COLORS.cellFilled, 0.8);
					graphics.fillRect(
						worldPos.x - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
						worldPos.y - GRID_CONFIG.cellSize / 2 + GRID_CONFIG.cellPadding,
						GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2,
						GRID_CONFIG.cellSize - GRID_CONFIG.cellPadding * 2
					);

					const key = `${row}_${col}`;
					this.playerCellGraphics.set(key, graphics);
				}
			}
		}
	}

	private hasPlaceablePieces(): boolean {
		// 檢查是否還有可以放置的方塊
		if (this.gameState.options.length === 0) {
			return false;
		}

		// 檢查每個選項是否可以放置在玩家區域的任何位置
		for (const piece of this.gameState.options) {
			for (let row = 0; row < GRID_CONFIG.playerRows; row++) {
				for (let col = 0; col < GRID_CONFIG.playerCols; col++) {
					if (TetrisSystem.canPlacePiece(piece, { row, col }, this.gameState.playerGrid)) {
						return true;
					}
				}
			}
		}

		return false;
	}

	private updatePiecePlaceability() {
		// 檢查每個方塊是否可以放置
		const placeableStatus: boolean[] = [];
		
		for (let i = 0; i < this.gameState.options.length; i++) {
			const piece = this.gameState.options[i];
			let canPlace = false;
			
			// 檢查是否可以放置在玩家區域的任何位置
			for (let row = 0; row < GRID_CONFIG.playerRows; row++) {
				for (let col = 0; col < GRID_CONFIG.playerCols; col++) {
					if (TetrisSystem.canPlacePiece(piece, { row, col }, this.gameState.playerGrid)) {
						canPlace = true;
						break;
					}
				}
				if (canPlace) break;
			}
			
			placeableStatus.push(canPlace);
			
			// 更新視覺效果（灰色表示無法放置）
			if (i < this.optionPieces.length) {
				const container = this.optionPieces[i];
				// 使用 alpha 來表示無法放置（降低透明度）
				container.setAlpha(canPlace ? 1 : 0.3);
				
				// 對 Container 內部的 Graphics 對象，通過修改顏色來實現灰色效果
				// 由於 Graphics 不支持 tint，我們使用 alpha 就足夠了
			}
		}
		
		// 檢查是否所有方塊都無法放置
		const allUnplaceable = placeableStatus.length > 0 && placeableStatus.every(status => !status);
		
		// 顯示或隱藏跳過按鈕
		if (allUnplaceable && this.gameState.phase === GamePhase.PLAYER_TURN) {
			this.showSkipButton();
		} else {
			this.hideSkipButton();
		}
	}

	private showSkipButton() {
		if (this.skipButton) {
			return; // 已經顯示
		}
		
		const buttonX = GAME_WIDTH / 2;
		const buttonY = GAME_HEIGHT - 30;
		
		const buttonBg = this.add.rectangle(buttonX, buttonY, 150, 40, COLORS.button, 0.9);
		const buttonText = this.add.text(buttonX, buttonY, '跳過階段', {
			fontSize: '18px',
			color: '#ffffff'
		}).setOrigin(0.5);
		
		buttonBg.setInteractive({ useHandCursor: true });
		buttonBg.on('pointerdown', () => {
			this.endPlayerTurn();
		});
		
		this.skipButton = this.add.container(0, 0);
		this.skipButton.add([buttonBg, buttonText]);
		this.skipButton.setDepth(100);
	}

	private hideSkipButton() {
		if (this.skipButton) {
			this.skipButton.destroy();
			this.skipButton = null;
		}
	}

	// ==================== 敵方階段處理 ====================

	private async processEnemyTurn() {
		// 依序走訪每個敵方方塊
		for (let i = 0; i < this.gameState.enemies.length; i++) {
			const enemy = this.gameState.enemies[i];

			// 減少方塊的行動冷卻時間 -1
			if (enemy.cooldown > 0) {
				enemy.cooldown--;
			}

			// 更新顯示
			this.drawEnemies();

			// 若方塊冷卻結束，則上下位移動一下，對我方生命進行攻擊，再重置冷卻時間
			if (enemy.cooldown === 0) {
				// 播放攻擊動畫（方塊上下動一下）
				await this.playEnemyAttackAnimation(enemy);

				// 執行攻擊
				this.enemyAttack(enemy);

				// 重置冷卻時間
				enemy.cooldown = enemy.maxCooldown;

				// 更新顯示
				this.drawEnemies();

				// 檢查玩家是否死亡
				if (this.gameState.playerHp <= 0) {
					this.gameOver();
					return;
				}
			}

			// 每個敵人處理後添加間隔時間（除了最後一個）
			if (i < this.gameState.enemies.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 300));
			}
		}

		// 檢查敵人是否全滅（關卡完成）
		if (this.gameState.enemies.length === 0) {
			this.levelComplete();
			return;
		}

		// 所有方塊行動完後，回到我方階段（完成當前回合，進入下一回合）
		this.completeRound();
	}

	private playEnemyAttackAnimation(enemy: Enemy): Promise<void> {
		return new Promise((resolve) => {
			// 找到對應的敵人圖形
			const enemyIndex = this.gameState.enemies.indexOf(enemy);
			if (enemyIndex >= 0 && enemyIndex < this.enemyGraphics.length) {
				const graphics = this.enemyGraphics[enemyIndex];
				const originalY = graphics.y;
				
				// 上下動畫
				this.tweens.add({
					targets: graphics,
					y: originalY - 5,
					duration: 100,
					yoyo: true,
					ease: 'Power2',
					onComplete: () => {
						graphics.y = originalY;
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	}

	private enemyAttack(enemy: Enemy) {
		// 計算傷害
		const damage = enemy.size * 5;

		// 造成傷害
		this.gameState.playerHp -= damage;
		this.playerHpText.setText(`生命值: ${this.gameState.playerHp}`);

		// 顯示傷害數字（在生命值文字旁邊）
		this.showDamageText(damage);
	}

	private showDamageText(damage: number) {
		// 在生命值文字右側顯示傷害
		const damageText = this.add
			.text(this.playerHpText.x + this.playerHpText.width + 10, this.playerHpText.y, `-${damage}`, {
				fontSize: '20px',
				color: '#ff0000',
				fontStyle: 'bold'
			})
			.setOrigin(0, 0);

		// 向上浮動並淡出的動畫
		this.tweens.add({
			targets: damageText,
			y: damageText.y - 50,
			alpha: 0,
			duration: 1000,
			ease: 'Power2',
			onComplete: () => {
				damageText.destroy();
			}
		});
	}

	// ==================== 回合與關卡管理 ====================

	/**
	 * 完成當前回合，進入下一回合
	 * 根據規格：敵方階段結束後，回到我方階段（不生成新敵人）
	 * 只有在敵人全滅時才進入下一關卡，每個回合只是階段的循環
	 */
	private completeRound() {
		this.gameState.round++;
		this.roundText.setText(`回合: ${this.gameState.round}`);

		// 進入我方階段（開始新回合）
		this.enterPlayerPhase();
	}

	/**
	 * 完成當前關卡，進入下一關卡
	 * 根據規格：關卡包含數個回合，直到敵方方塊全滅則進入下一關卡
	 */
	private levelComplete() {
		this.gameState.level++;
		this.gameState.round = 1; // 重置回合數
		this.levelText.setText(`關卡: ${this.gameState.level}`);
		this.roundText.setText(`回合: ${this.gameState.round}`);

		// 進入開始階段（新關卡的第一回合）
		this.enterStartPhase();
	}

	/**
	 * 遊戲結束，進入結算場景
	 */
	private gameOver() {
		this.gameState.phase = GamePhase.GAME_OVER;
		// 跳轉到結算場景，傳遞通關層數
		this.scene.start('ResultScene', { level: this.gameState.level });
	}

	// ==================== 遊戲流程控制 ====================

	/**
	 * 開始遊戲循環
	 * 從關卡1、回合1開始
	 */
	private startGameLoop() {
		this.enterStartPhase();
	}

	// ==================== 階段管理 ====================

	/**
	 * 顯示階段通知
	 */
	private async showPhaseNotification(phaseText: string): Promise<void> {
		return new Promise((resolve) => {
			// 半透明黑色背景
			const bg = this.add
				.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
				.setDepth(1000);

			// 階段文字
			const text = this.add
				.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, phaseText, {
					fontSize: '48px',
					color: '#ffffff',
					fontStyle: 'bold'
				})
				.setOrigin(0.5)
				.setDepth(1001)
				.setAlpha(0);

			// 淡入動畫
			this.tweens.add({
				targets: text,
				alpha: 1,
				duration: 300,
				ease: 'Power2',
				onComplete: () => {
					// 顯示1秒後淡出
					this.time.delayedCall(1000, () => {
						this.tweens.add({
							targets: [bg, text],
							alpha: 0,
							duration: 300,
							ease: 'Power2',
							onComplete: () => {
								bg.destroy();
								text.destroy();
								resolve();
							}
						});
					});
				}
			});
		});
	}

	/**
	 * 進入開始階段
	 * 根據規格：此階段每回合只會進入一次，生成怪物
	 */
	private enterStartPhase() {
		this.gameState.phase = GamePhase.START;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);

		// 生成怪物（根據當前關卡數）
		this.spawnEnemies();

		// 自動進入我方階段
		this.enterPlayerPhase();
	}

	/**
	 * 進入我方階段
	 * 根據規格：
	 * 1. 產生可選方塊
	 * 2. 玩家放置可選方塊
	 * 3. 判斷是否可消除（攻擊敵方）
	 * 4. 判斷剩餘可選方塊是否可以繼續放置
	 * 5. 若剩餘可選方塊都無法放置，顯示按鈕跳出階段，即進入敵方階段
	 * 6. 若所有可選方塊都已放置，在消除方塊（攻擊敵方）完成後，直接進入敵方階段
	 */
	private async enterPlayerPhase() {
		this.gameState.phase = GamePhase.PLAYER_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);

		// 顯示階段通知
		await this.showPhaseNotification('我方階段');

		// 產生可選方塊
		this.generateOptions();

		// 更新可放置性檢查
		this.updatePiecePlaceability();
	}

	/**
	 * 結束我方階段，進入敵方階段
	 */
	private endPlayerTurn() {
		this.hideSkipButton();
		this.enterEnemyPhase();
	}

	/**
	 * 進入敵方階段
	 * 根據規格：
	 * 1. 依序走訪每個敵方方塊
	 * 2. 減少方塊的行動冷卻時間 -1
	 * 3. 若方塊冷卻結束，則上下位移動一下，對我方生命進行攻擊，在重置冷卻時間
	 * 4. 所有方塊行動完後，回到我方階段
	 */
	private async enterEnemyPhase() {
		this.gameState.phase = GamePhase.ENEMY_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);

		// 顯示階段通知
		await this.showPhaseNotification('敵方階段');

		// 處理敵方回合
		this.processEnemyTurn();
	}
}
