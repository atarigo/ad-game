import type Phaser from 'phaser';
import {
	GAME_WIDTH,
	GAME_HEIGHT,
	COLORS,
	GRID,
	UI,
	ENEMY_SIZES,
	HP_BAR,
	calculateStats,
	DEBUG_MODE
} from '../config';
import { World } from '../ecs/Entity';
import {
	COMPONENTS,
	type PositionComponent,
	type TeamComponent,
	type StatsComponent,
	type CombatComponent,
	type RenderComponent
} from '../ecs/Components';
import { GridSystem } from '../systems/GridSystem';
import { BattleSystem, TurnPhase, BattleResult } from '../systems/BattleSystem';

export class MainScene extends Phaser.Scene {
	private world!: World;
	private battleSystem!: BattleSystem;
	private endTurnButton!: Phaser.GameObjects.Rectangle;
	private endTurnButtonText!: Phaser.GameObjects.Text;

	constructor() {
		super({ key: 'MainScene' });
	}

	create() {
		if (DEBUG_MODE) console.log('=== 遊戲開始 ===');

		this.world = new World();
		this.battleSystem = new BattleSystem(this.world, (entity) => this.updateHpBar(entity));

		this.drawUI();
		this.spawnAlly();
		this.spawnEnemies();
		this.createEndTurnButton();

		if (DEBUG_MODE) console.log('🎮 [Phase] 玩家回合');
	}

	private drawUI() {
		// 繪製敵人棋盤
		this.drawEnemyGrid();

		// 繪製我方棋盤
		this.drawAllyGrid();

		// 繪製操作UI
		this.drawControlUI();
	}

	private drawEnemyGrid() {
		const totalWidth = GRID.enemy.cols * GRID.enemy.cellSize + (GRID.enemy.cols - 1) * GRID.enemy.gap;
		const startX = (GAME_WIDTH - totalWidth) / 2;

		const graphics = this.add.graphics();

		for (let row = 0; row < GRID.enemy.rows; row++) {
			for (let col = 0; col < GRID.enemy.cols; col++) {
				const x = startX + col * (GRID.enemy.cellSize + GRID.enemy.gap);
				const y = GRID.enemy.offsetY + row * (GRID.enemy.cellSize + GRID.enemy.gap);

				// 繪製格子背景
				graphics.fillStyle(COLORS.enemyCell, 1);
				graphics.fillRect(x, y, GRID.enemy.cellSize, GRID.enemy.cellSize);

				// 繪製格子邊框
				graphics.lineStyle(1, COLORS.gridLine, 1);
				graphics.strokeRect(x, y, GRID.enemy.cellSize, GRID.enemy.cellSize);
			}
		}
	}

	private drawAllyGrid() {
		const totalWidth = GRID.ally.cols * GRID.ally.cellSize + (GRID.ally.cols - 1) * GRID.ally.gap;
		const startX = (GAME_WIDTH - totalWidth) / 2;

		const graphics = this.add.graphics();

		for (let row = 0; row < GRID.ally.rows; row++) {
			for (let col = 0; col < GRID.ally.cols; col++) {
				const x = startX + col * (GRID.ally.cellSize + GRID.ally.gap);
				const y = GRID.ally.offsetY + row * (GRID.ally.cellSize + GRID.ally.gap);

				// 繪製格子背景
				graphics.fillStyle(COLORS.allyCell, 1);
				graphics.fillRect(x, y, GRID.ally.cellSize, GRID.ally.cellSize);

				// 繪製格子邊框
				graphics.lineStyle(1, COLORS.gridLine, 1);
				graphics.strokeRect(x, y, GRID.ally.cellSize, GRID.ally.cellSize);
			}
		}
	}

	private drawControlUI() {
		const graphics = this.add.graphics();

		// UI背景
		graphics.fillStyle(COLORS.uiBackground, 1);
		graphics.fillRect(0, UI.offsetY, GAME_WIDTH, UI.height);

		// 第一行：道具格（靠左對齊）
		let itemX = UI.padding;
		const firstRowY = UI.offsetY + UI.padding;

		for (let i = 0; i < UI.itemSlots.count; i++) {
			graphics.fillStyle(COLORS.itemSlot, 1);
			graphics.fillRect(itemX, firstRowY, UI.itemSlots.size, UI.itemSlots.size);

			graphics.lineStyle(2, COLORS.gridLine, 1);
			graphics.strokeRect(itemX, firstRowY, UI.itemSlots.size, UI.itemSlots.size);

			// 在格子內寫「空」
			this.add
				.text(itemX + UI.itemSlots.size / 2, firstRowY + UI.itemSlots.size / 2, '空', {
					fontSize: '14px',
					color: COLORS.text
				})
				.setOrigin(0.5, 0.5);

			itemX += UI.itemSlots.size + UI.itemSlots.gap;
		}

		// 第二行：技能格（靠左對齊）
		let skillX = UI.padding;
		const secondRowY = firstRowY + UI.itemSlots.size + UI.rowGap;

		for (let i = 0; i < UI.skillSlots.count; i++) {
			graphics.fillStyle(COLORS.skillSlot, 1);
			graphics.fillRect(skillX, secondRowY, UI.skillSlots.size, UI.skillSlots.size);

			graphics.lineStyle(2, COLORS.gridLine, 1);
			graphics.strokeRect(skillX, secondRowY, UI.skillSlots.size, UI.skillSlots.size);

			// 在格子內寫「無」
			this.add
				.text(skillX + UI.skillSlots.size / 2, secondRowY + UI.skillSlots.size / 2, '無', {
					fontSize: '14px',
					color: COLORS.text
				})
				.setOrigin(0.5, 0.5);

			skillX += UI.skillSlots.size + UI.skillSlots.gap;
		}
	}

	private spawnAlly() {
		// 預設在中間位置 (row: 1, col: 2)
		const row = 1;
		const col = 2;

		const entity = this.world.createEntity();

		// 位置組件
		const position: PositionComponent = {
			row,
			col,
			width: 1,
			height: 1
		};
		entity.addComponent(COMPONENTS.POSITION, position);

		// 陣營組件
		const team: TeamComponent = { isEnemy: false };
		entity.addComponent(COMPONENTS.TEAM, team);

		// 屬性組件
		const stats: StatsComponent = {
			str: 10,
			vit: 10
		};
		entity.addComponent(COMPONENTS.STATS, stats);

		// 戰鬥組件
		const calculatedStats = calculateStats(stats);
		const combat: CombatComponent = {
			currentHp: calculatedStats.hp,
			maxHp: calculatedStats.hp,
			atk: calculatedStats.atk,
			def: calculatedStats.def
		};
		entity.addComponent(COMPONENTS.COMBAT, combat);

		// 渲染
		this.renderCharacter(entity, false);
	}

	private spawnEnemies() {
		const enemyCount = Phaser.Math.Between(2, 6);
		const occupiedCells = GridSystem.createEmptyEnemyGrid();

		for (let i = 0; i < enemyCount; i++) {
			// 隨機選擇尺寸
			const sizeType = Phaser.Math.Between(0, ENEMY_SIZES.length - 1);
			const size = ENEMY_SIZES[sizeType];

			// 嘗試找到有效位置
			let placed = false;
			let attempts = 0;
			const maxAttempts = 50;

			while (!placed && attempts < maxAttempts) {
				const row = Phaser.Math.Between(0, GRID.enemy.rows - size.height);
				const col = Phaser.Math.Between(0, GRID.enemy.cols - size.width);

				if (GridSystem.isValidEnemyPosition(row, col, size.width, size.height, occupiedCells)) {
					this.createEnemy(row, col, size.width, size.height);
					GridSystem.markOccupied(row, col, size.width, size.height, occupiedCells);
					placed = true;
				}

				attempts++;
			}
		}
	}

	private createEnemy(row: number, col: number, width: number, height: number) {
		const entity = this.world.createEntity();

		// 位置組件
		const position: PositionComponent = { row, col, width, height };
		entity.addComponent(COMPONENTS.POSITION, position);

		// 陣營組件
		const team: TeamComponent = { isEnemy: true };
		entity.addComponent(COMPONENTS.TEAM, team);

		// 屬性組件（隨機）
		const stats: StatsComponent = {
			str: Phaser.Math.Between(5, 15),
			vit: Phaser.Math.Between(5, 15)
		};
		entity.addComponent(COMPONENTS.STATS, stats);

		// 戰鬥組件
		const calculatedStats = calculateStats(stats);
		const combat: CombatComponent = {
			currentHp: calculatedStats.hp,
			maxHp: calculatedStats.hp,
			atk: calculatedStats.atk,
			def: calculatedStats.def
		};
		entity.addComponent(COMPONENTS.COMBAT, combat);

		// 渲染
		this.renderCharacter(entity, true);
	}

	private renderCharacter(entity: any, isEnemy: boolean) {
		const position = entity.getComponent<PositionComponent>(COMPONENTS.POSITION);
		const combat = entity.getComponent<CombatComponent>(COMPONENTS.COMBAT);
		if (!position || !combat) return;

		const cellPos = isEnemy
			? GridSystem.getEnemyCellPosition(position.row, position.col)
			: GridSystem.getAllyCellPosition(position.row, position.col);

		const cellSize = isEnemy ? GRID.enemy.cellSize : GRID.ally.cellSize;
		const gap = isEnemy ? GRID.enemy.gap : GRID.ally.gap;

		const width = position.width * cellSize + (position.width - 1) * gap;
		const height = position.height * cellSize + (position.height - 1) * gap;

		const color = isEnemy ? COLORS.enemy : COLORS.ally;

		// 角色方塊
		const sprite = this.add.rectangle(cellPos.x, cellPos.y, width, height, color);
		sprite.setOrigin(0, 0);
		sprite.setStrokeStyle(2, 0xffffff);
		sprite.setDepth(10); // 角色在第 10 層

		// HP 條位置（角色中心上方）
		const hpBarX = cellPos.x + width / 2;
		const hpBarY = cellPos.y + HP_BAR.offsetY;

		// HP 條背景
		const hpBarBackground = this.add.rectangle(
			hpBarX,
			hpBarY,
			HP_BAR.width,
			HP_BAR.height,
			COLORS.hpBarBackground
		);
		hpBarBackground.setOrigin(0.5, 0.5);
		hpBarBackground.setDepth(100); // HP 條在最上層

		// HP 條填充
		const hpPercent = combat.currentHp / combat.maxHp;
		const hpBarColor = hpPercent <= HP_BAR.lowHealthThreshold ? COLORS.hpBarLow : COLORS.hpBarFull;
		const hpBarFill = this.add.rectangle(
			hpBarX - HP_BAR.width / 2,
			hpBarY,
			HP_BAR.width * hpPercent,
			HP_BAR.height,
			hpBarColor
		);
		hpBarFill.setOrigin(0, 0.5);
		hpBarFill.setDepth(101); // HP 條填充在背景上方

		// HP 條邊框
		const hpBarBorder = this.add.rectangle(hpBarX, hpBarY, HP_BAR.width, HP_BAR.height);
		hpBarBorder.setOrigin(0.5, 0.5);
		hpBarBorder.setStrokeStyle(HP_BAR.borderWidth, COLORS.hpBarBorder);
		hpBarBorder.setFillStyle(0x000000, 0); // 透明填充
		hpBarBorder.setDepth(102); // HP 條邊框在最上方

		const render: RenderComponent = {
			color,
			sprite,
			hpBarBackground,
			hpBarFill,
			hpBarBorder
		};
		entity.addComponent(COMPONENTS.RENDER, render);
	}

	updateHpBar(entity: any) {
		const combat = entity.getComponent<CombatComponent>(COMPONENTS.COMBAT);
		const render = entity.getComponent<RenderComponent>(COMPONENTS.RENDER);

		if (!combat || !render || !render.hpBarFill) return;

		const hpPercent = Math.max(0, combat.currentHp / combat.maxHp);
		const hpBarColor = hpPercent <= HP_BAR.lowHealthThreshold ? COLORS.hpBarLow : COLORS.hpBarFull;

		// 更新 HP 條寬度和顏色
		render.hpBarFill.width = HP_BAR.width * hpPercent;
		render.hpBarFill.setFillStyle(hpBarColor);
	}

	private createEndTurnButton() {
		const buttonWidth = 100;
		const buttonHeight = 40;
		const buttonX = GAME_WIDTH - buttonWidth - 10;
		const buttonY = UI.offsetY + UI.height / 2 - buttonHeight / 2;

		// 按鈕背景
		this.endTurnButton = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x00aa00);
		this.endTurnButton.setOrigin(0, 0);
		this.endTurnButton.setStrokeStyle(2, 0x00ff00);
		this.endTurnButton.setInteractive({ useHandCursor: true });

		// 按鈕文字
		this.endTurnButtonText = this.add
			.text(buttonX + buttonWidth / 2, buttonY + buttonHeight / 2, '結束回合', {
				fontSize: '14px',
				color: '#ffffff'
			})
			.setOrigin(0.5, 0.5);

		// 點擊事件
		this.endTurnButton.on('pointerdown', () => {
			if (this.battleSystem.getCurrentPhase() === TurnPhase.PLAYER_CONTROL) {
				this.battleSystem.endPlayerControl();
			}
		});

		// Hover 效果
		this.endTurnButton.on('pointerover', () => {
			this.endTurnButton.setFillStyle(0x00ff00);
		});

		this.endTurnButton.on('pointerout', () => {
			this.endTurnButton.setFillStyle(0x00aa00);
		});
	}

}
