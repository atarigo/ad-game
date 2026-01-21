import type { World, Entity } from '../ecs/Entity';
import {
	COMPONENTS,
	type PositionComponent,
	type TeamComponent,
	type MovementComponent
} from '../ecs/Components';
import { GridSystem } from './GridSystem';
import { GRID } from '../config';

export class MovementSystem {
	private world: World;

	constructor(world: World) {
		this.world = world;
	}

	// 檢查我方單位是否可以移動到指定位置
	canAllyMoveTo(entity: Entity, targetRow: number, targetCol: number): boolean {
		const position = entity.getComponent<PositionComponent>(COMPONENTS.POSITION);
		const movement = entity.getComponent<MovementComponent>(COMPONENTS.MOVEMENT);
		const team = entity.getComponent<TeamComponent>(COMPONENTS.TEAM);

		if (!position || !movement || !team || team.isEnemy) {
			return false;
		}

		// 檢查是否已經移動過
		if (movement.hasMoved) {
			return false;
		}

		// 檢查是否超出邊界
		if (
			targetRow < 0 ||
			targetCol < 0 ||
			targetRow >= GRID.ally.rows ||
			targetCol >= GRID.ally.cols
		) {
			return false;
		}

		// 檢查目標位置是否被其他我方單位佔用
		const occupiedGrid = this.getAllyOccupiedGrid();

		// 排除自己當前的位置
		for (let r = position.row; r < position.row + position.height; r++) {
			for (let c = position.col; c < position.col + position.width; c++) {
				occupiedGrid[r][c] = false;
			}
		}

		// 檢查目標位置是否有重疊
		for (let r = targetRow; r < targetRow + position.height; r++) {
			for (let c = targetCol; c < targetCol + position.width; c++) {
				if (r >= GRID.ally.rows || c >= GRID.ally.cols || occupiedGrid[r][c]) {
					return false;
				}
			}
		}

		return true;
	}

	// 移動我方單位
	moveAlly(entity: Entity, targetRow: number, targetCol: number): boolean {
		if (!this.canAllyMoveTo(entity, targetRow, targetCol)) {
			return false;
		}

		const position = entity.getComponent<PositionComponent>(COMPONENTS.POSITION);
		const movement = entity.getComponent<MovementComponent>(COMPONENTS.MOVEMENT);

		if (position && movement) {
			position.row = targetRow;
			position.col = targetCol;
			movement.hasMoved = true;
			return true;
		}

		return false;
	}

	// 重置所有我方單位的移動狀態（新回合開始時調用）
	resetAllyMovement() {
		const allies = this.world
			.getEntitiesWith(COMPONENTS.TEAM, COMPONENTS.MOVEMENT)
			.filter((e) => !e.getComponent<TeamComponent>(COMPONENTS.TEAM)!.isEnemy);

		for (const ally of allies) {
			const movement = ally.getComponent<MovementComponent>(COMPONENTS.MOVEMENT);
			if (movement) {
				movement.hasMoved = false;
			}
		}
	}

	// 取得我方棋盤的佔用情況
	private getAllyOccupiedGrid(): boolean[][] {
		const grid = GridSystem.createEmptyAllyGrid();
		const allies = this.world
			.getEntitiesWith(COMPONENTS.POSITION, COMPONENTS.TEAM)
			.filter((e) => !e.getComponent<TeamComponent>(COMPONENTS.TEAM)!.isEnemy);

		for (const ally of allies) {
			const position = ally.getComponent<PositionComponent>(COMPONENTS.POSITION);
			if (position) {
				for (let r = position.row; r < position.row + position.height; r++) {
					for (let c = position.col; c < position.col + position.width; c++) {
						if (r < GRID.ally.rows && c < GRID.ally.cols) {
							grid[r][c] = true;
						}
					}
				}
			}
		}

		return grid;
	}

	// 根據像素座標找到對應的格子
	pixelToAllyGrid(pixelX: number, pixelY: number): { row: number; col: number } | null {
		const totalWidth = GRID.ally.cols * GRID.ally.cellSize + (GRID.ally.cols - 1) * GRID.ally.gap;
		const startX = (360 - totalWidth) / 2; // GAME_WIDTH

		for (let row = 0; row < GRID.ally.rows; row++) {
			for (let col = 0; col < GRID.ally.cols; col++) {
				const cellPos = GridSystem.getAllyCellPosition(row, col);
				const cellEndX = cellPos.x + GRID.ally.cellSize;
				const cellEndY = cellPos.y + GRID.ally.cellSize;

				if (
					pixelX >= cellPos.x &&
					pixelX <= cellEndX &&
					pixelY >= cellPos.y &&
					pixelY <= cellEndY
				) {
					return { row, col };
				}
			}
		}

		return null;
	}
}
