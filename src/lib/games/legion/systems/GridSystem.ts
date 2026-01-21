import { GRID, GAME_WIDTH } from '../config';

export class GridSystem {
	// 計算敵人格子的像素位置
	static getEnemyCellPosition(row: number, col: number) {
		const totalWidth = GRID.enemy.cols * GRID.enemy.cellSize + (GRID.enemy.cols - 1) * GRID.enemy.gap;
		const startX = (GAME_WIDTH - totalWidth) / 2;

		return {
			x: startX + col * (GRID.enemy.cellSize + GRID.enemy.gap),
			y: GRID.enemy.offsetY + row * (GRID.enemy.cellSize + GRID.enemy.gap)
		};
	}

	// 計算我方格子的像素位置
	static getAllyCellPosition(row: number, col: number) {
		const totalWidth = GRID.ally.cols * GRID.ally.cellSize + (GRID.ally.cols - 1) * GRID.ally.gap;
		const startX = (GAME_WIDTH - totalWidth) / 2;

		return {
			x: startX + col * (GRID.ally.cellSize + GRID.ally.gap),
			y: GRID.ally.offsetY + row * (GRID.ally.cellSize + GRID.ally.gap)
		};
	}

	// 檢查敵人位置是否有效（不超出邊界且不重疊）
	static isValidEnemyPosition(
		row: number,
		col: number,
		width: number,
		height: number,
		occupiedCells: boolean[][]
	): boolean {
		// 檢查是否超出邊界
		if (row < 0 || col < 0 || row + height > GRID.enemy.rows || col + width > GRID.enemy.cols) {
			return false;
		}

		// 檢查是否與其他敵人重疊
		for (let r = row; r < row + height; r++) {
			for (let c = col; c < col + width; c++) {
				if (occupiedCells[r][c]) {
					return false;
				}
			}
		}

		return true;
	}

	// 標記格子為已占用
	static markOccupied(
		row: number,
		col: number,
		width: number,
		height: number,
		occupiedCells: boolean[][]
	): void {
		for (let r = row; r < row + height; r++) {
			for (let c = col; c < col + width; c++) {
				occupiedCells[r][c] = true;
			}
		}
	}

	// 創建空的占用網格
	static createEmptyEnemyGrid(): boolean[][] {
		return Array.from({ length: GRID.enemy.rows }, () =>
			Array.from({ length: GRID.enemy.cols }, () => false)
		);
	}

	static createEmptyAllyGrid(): boolean[][] {
		return Array.from({ length: GRID.ally.rows }, () =>
			Array.from({ length: GRID.ally.cols }, () => false)
		);
	}
}
