import { GRID_CONFIG, AREA_POSITIONS } from '../config';
import type { GridPosition } from '../types';

export class GridSystem {
	/**
	 * 將世界座標轉換為格子座標
	 */
	static worldToGrid(
		worldX: number,
		worldY: number,
		area: 'enemy' | 'player' | 'option'
	): GridPosition | null {
		let areaX: number, areaY: number, rows: number, cols: number;

		if (area === 'enemy') {
			areaX = AREA_POSITIONS.enemyArea.x;
			areaY = AREA_POSITIONS.enemyArea.y;
			rows = GRID_CONFIG.enemyRows;
			cols = GRID_CONFIG.enemyCols;
		} else if (area === 'player') {
			areaX = AREA_POSITIONS.playerArea.x;
			areaY = AREA_POSITIONS.playerArea.y;
			rows = GRID_CONFIG.playerRows;
			cols = GRID_CONFIG.playerCols;
		} else {
			// option area 不支援格子轉換
			return null;
		}

		const relativeX = worldX - areaX;
		const relativeY = worldY - areaY;

		const col = Math.floor(relativeX / GRID_CONFIG.cellSize);
		const row = Math.floor(relativeY / GRID_CONFIG.cellSize);

		if (row >= 0 && row < rows && col >= 0 && col < cols) {
			return { row, col };
		}

		return null;
	}

	/**
	 * 將格子座標轉換為世界座標（格子中心點）
	 */
	static gridToWorld(
		position: GridPosition,
		area: 'enemy' | 'player'
	): { x: number; y: number } {
		let areaX: number, areaY: number;

		if (area === 'enemy') {
			areaX = AREA_POSITIONS.enemyArea.x;
			areaY = AREA_POSITIONS.enemyArea.y;
		} else {
			areaX = AREA_POSITIONS.playerArea.x;
			areaY = AREA_POSITIONS.playerArea.y;
		}

		return {
			x: areaX + position.col * GRID_CONFIG.cellSize + GRID_CONFIG.cellSize / 2,
			y: areaY + position.row * GRID_CONFIG.cellSize + GRID_CONFIG.cellSize / 2
		};
	}

	/**
	 * 檢查位置是否在格子範圍內
	 */
	static isValidPosition(position: GridPosition, area: 'enemy' | 'player'): boolean {
		if (area === 'enemy') {
			return (
				position.row >= 0 &&
				position.row < GRID_CONFIG.enemyRows &&
				position.col >= 0 &&
				position.col < GRID_CONFIG.enemyCols
			);
		} else {
			return (
				position.row >= 0 &&
				position.row < GRID_CONFIG.playerRows &&
				position.col >= 0 &&
				position.col < GRID_CONFIG.playerCols
			);
		}
	}
}
