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
	private roundText!: Phaser.GameObjects.Text;
	private phaseText!: Phaser.GameObjects.Text;
	private nextPieceId: number = 1;
	private previewGraphics: Phaser.GameObjects.Graphics | null = null;

	constructor() {
		super({ key: 'GameScene' });
	}

	create() {
		// 初始化遊戲狀態
		this.initGameState();

		// 繪製 UI
		this.drawUI();

		// 繪製格子
		this.drawGrids();

		// 生成初始敵人
		this.spawnEnemies();

		// 生成初始選項
		this.generateOptions();

		// 設置拖曳事件
		this.setupDragAndDrop();

		// 開始遊戲循環
		this.startGameLoop();
	}

	private initGameState() {
		this.gameState = {
			phase: GamePhase.START,
			playerHp: PLAYER_HP,
			round: 1,
			enemies: [],
			playerGrid: Array(GRID_CONFIG.playerRows)
				.fill(null)
				.map(() => Array(GRID_CONFIG.playerCols).fill(null)),
			options: []
		};
	}

	private drawUI() {
		// 玩家生命值（增加上方間距，避免被遮住）
		this.playerHpText = this.add
			.text(10, 20, `生命值: ${this.gameState.playerHp}`, {
				fontSize: '16px',
				color: COLORS.text
			});

		// 回合數
		this.roundText = this.add
			.text(10, 40, `回合: ${this.gameState.round}`, {
				fontSize: '16px',
				color: COLORS.text
			});

		// 階段
		this.phaseText = this.add
			.text(10, 60, `階段: ${this.getPhaseText()}`, {
				fontSize: '16px',
				color: COLORS.text
			});
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

	private spawnEnemies() {
		this.gameState.enemies = EnemySystem.generateEnemies(this.gameState.round);
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

			this.enemyGraphics.push(graphics);
		}
	}

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
			this.optionPieces.push(container);
		});

		// 重新設置拖曳事件
		this.setupDragAndDrop();
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

				const gridPos = GridSystem.worldToGrid(pointer.x, pointer.y, 'player');
				if (gridPos && this.draggedPieceIndex >= 0) {
					const piece = this.gameState.options[this.draggedPieceIndex];
					if (TetrisSystem.canPlacePiece(piece, gridPos, this.gameState.playerGrid)) {
						this.placePiece(piece, gridPos);
					} else {
						// 放回原位，恢復原始大小
						container.setScale(1);
						container.setAlpha(1);
						const optionSpacing = 8;
						const totalSpacing = optionSpacing * 2;
						const optionWidth = (GAME_WIDTH - AREA_POSITIONS.optionArea.x * 2 - totalSpacing) / 3;
						const optionStartX = AREA_POSITIONS.optionArea.x;
						const optionY = AREA_POSITIONS.optionArea.y + GRID_CONFIG.optionAreaHeight / 2;
						container.x = optionStartX + this.draggedPieceIndex * (optionWidth + optionSpacing) + optionWidth / 2;
						container.y = optionY;
					}
				} else {
					// 如果不在有效區域，恢復原始大小和位置
					container.setScale(1);
					container.setAlpha(1);
					const optionSpacing = 8;
					const totalSpacing = optionSpacing * 2;
					const optionWidth = (GAME_WIDTH - AREA_POSITIONS.optionArea.x * 2 - totalSpacing) / 3;
					const optionStartX = AREA_POSITIONS.optionArea.x;
					const optionY = AREA_POSITIONS.optionArea.y + GRID_CONFIG.optionAreaHeight / 2;
					container.x = optionStartX + this.draggedPieceIndex * (optionWidth + optionSpacing) + optionWidth / 2;
					container.y = optionY;
				}

				this.draggedPiece = null;
				this.draggedPieceIndex = -1;
			});
		});
	}

	private placePiece(piece: TetrisPiece, position: GridPosition) {
		// 放置方塊
		TetrisSystem.placePiece(piece, position, this.gameState.playerGrid, this.nextPieceId++);
		this.drawPlayerGrid();

		// 檢查消除
		const { clearedRows, clearedCols } = TetrisSystem.checkAndClearLines(this.gameState.playerGrid);
		if (clearedRows.length > 0 || clearedCols.length > 0) {
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
		}

		// 重新生成選項
		if (this.gameState.options.length === 0) {
			this.generateOptions();
		} else {
			// 更新索引並重新設置拖曳事件
			this.optionPieces.forEach((container, index) => {
				container.setData('pieceIndex', index);
			});
			// 重新設置拖曳事件以確保索引正確
			this.setupDragAndDrop();
		}

		// 檢查是否還有可放置的方塊
		if (!this.hasPlaceablePieces()) {
			this.endPlayerTurn();
		}
	}

	private handleLineClear(clearedRows: number[], clearedCols: number[]) {
		// 重新繪製玩家格子
		this.drawPlayerGrid();

		// 攻擊敵人
		for (const row of clearedRows) {
			for (let col = 0; col < GRID_CONFIG.playerCols; col++) {
				this.attackEnemyAtPosition({ row, col });
			}
		}

		for (const col of clearedCols) {
			for (let row = 0; row < GRID_CONFIG.playerRows; row++) {
				this.attackEnemyAtPosition({ row, col });
			}
		}

		// 檢查敵人是否全滅
		if (this.gameState.enemies.length === 0) {
			this.roundComplete();
		}
	}

	private attackEnemyAtPosition(position: GridPosition) {
		// 轉換到敵人區域的對應位置
		const enemyCol = position.col;
		const enemyRow = Math.floor(
			(position.row / GRID_CONFIG.playerRows) * GRID_CONFIG.enemyRows
		);

		if (enemyRow >= 0 && enemyRow < GRID_CONFIG.enemyRows) {
			const enemy = EnemySystem.getEnemyAtPosition(
				{ row: enemyRow, col: enemyCol },
				this.gameState.enemies
			);

			if (enemy) {
				// 造成傷害（暫時固定傷害）
				enemy.hp -= 10;
				if (enemy.hp <= 0) {
					// 移除敵人
					const index = this.gameState.enemies.indexOf(enemy);
					if (index > -1) {
						this.gameState.enemies.splice(index, 1);
					}
				}
			}
		}

		this.drawEnemies();
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

	private endPlayerTurn() {
		this.gameState.phase = GamePhase.ENEMY_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
		this.processEnemyTurn();
	}

	private processEnemyTurn() {
		// 減少冷卻時間
		EnemySystem.reduceCooldowns(this.gameState.enemies);
		this.drawEnemies(); // 更新冷卻時間顯示

		// 獲取可以攻擊的敵人（冷卻時間為 0）
		const readyEnemies = EnemySystem.getReadyEnemies(this.gameState.enemies);

		if (readyEnemies.length > 0) {
			// 敵人攻擊
			for (const enemy of readyEnemies) {
				this.enemyAttack(enemy);
				// 重置冷卻時間
				enemy.cooldown = enemy.maxCooldown;
			}

			// 更新顯示（顯示重置後的冷卻時間）
			this.drawEnemies();

			// 檢查玩家是否死亡
			if (this.gameState.playerHp <= 0) {
				this.gameOver();
				return;
			}
		}

		// 檢查敵人是否全滅
		if (this.gameState.enemies.length === 0) {
			this.roundComplete();
			return;
		}

		// 回到開始階段
		this.gameState.phase = GamePhase.START;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
		this.generateOptions();
		this.gameState.phase = GamePhase.PLAYER_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
	}

	private enemyAttack(enemy: Enemy) {
		// 造成傷害（暫時固定傷害）
		this.gameState.playerHp -= enemy.size * 5;
		this.playerHpText.setText(`生命值: ${this.gameState.playerHp}`);
	}

	private roundComplete() {
		this.gameState.round++;
		this.roundText.setText(`回合: ${this.gameState.round}`);
		this.spawnEnemies();
		this.gameState.phase = GamePhase.START;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
		this.generateOptions();
		this.gameState.phase = GamePhase.PLAYER_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
	}

	private gameOver() {
		this.gameState.phase = GamePhase.GAME_OVER;
		this.phaseText.setText('遊戲結束');

		// 顯示遊戲結束畫面
		this.add
			.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8)
			.setDepth(100);

		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '遊戲結束', {
				fontSize: '32px',
				color: COLORS.text
			})
			.setOrigin(0.5)
			.setDepth(101);

		const button = this.add
			.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 200, 60, COLORS.button)
			.setInteractive({ useHandCursor: true })
			.setDepth(101)
			.on('pointerdown', () => {
				this.scene.start('MenuScene');
			});

		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '返回主選單', {
				fontSize: '24px',
				color: '#ffffff'
			})
			.setOrigin(0.5)
			.setDepth(102);
	}

	private startGameLoop() {
		// 開始第一回合
		this.gameState.phase = GamePhase.PLAYER_TURN;
		this.phaseText.setText(`階段: ${this.getPhaseText()}`);
	}
}
