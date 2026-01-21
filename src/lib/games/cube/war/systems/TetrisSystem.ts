import { GRID_CONFIG } from '../config';
import type { TetrisPiece, GridPosition } from '../types';

// 俄羅斯方塊形狀定義
const TETRIS_SHAPES: Record<string, Array<{ x: number; y: number }>> = {
	I: [
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 }
	],
	O: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 }
	],
	T: [
		{ x: 0, y: 0 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 }
	],
	S: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 }
	],
	Z: [
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 }
	],
	J: [
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: -1, y: 1 }
	],
	L: [
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1, y: 1 }
	]
};

const TETRIS_COLORS: Record<string, number> = {
	I: 0x00ffff,
	O: 0xffff00,
	T: 0x800080,
	S: 0x00ff00,
	Z: 0xff0000,
	J: 0x0000ff,
	L: 0xffa500
};

export class TetrisSystem {
	/**
	 * 生成隨機方塊
	 */
	static generateRandomPiece(): TetrisPiece {
		const types: Array<keyof typeof TETRIS_SHAPES> = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
		const type = types[Math.floor(Math.random() * types.length)] as TetrisPiece['type'];

		return {
			type,
			shape: TETRIS_SHAPES[type],
			color: TETRIS_COLORS[type]
		};
	}

	/**
	 * 生成三個隨機方塊作為選項
	 */
	static generateOptions(): TetrisPiece[] {
		return [
			this.generateRandomPiece(),
			this.generateRandomPiece(),
			this.generateRandomPiece()
		];
	}

	/**
	 * 檢查方塊是否可以放置在指定位置
	 */
	static canPlacePiece(
		piece: TetrisPiece,
		centerPosition: GridPosition,
		grid: (number | null)[][]
	): boolean {
		for (const offset of piece.shape) {
			const row = centerPosition.row + offset.y;
			const col = centerPosition.col + offset.x;

			// 檢查是否超出邊界
			if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
				return false;
			}

			// 檢查是否已經有方塊
			if (grid[row][col] !== null) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 放置方塊到格子中
	 */
	static placePiece(
		piece: TetrisPiece,
		centerPosition: GridPosition,
		grid: (number | null)[][],
		pieceId: number
	): void {
		for (const offset of piece.shape) {
			const row = centerPosition.row + offset.y;
			const col = centerPosition.col + offset.x;

			if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
				grid[row][col] = pieceId;
			}
		}
	}

	/**
	 * 檢查並消除滿的行或列
	 */
	static checkAndClearLines(grid: (number | null)[][]): {
		clearedRows: number[];
		clearedCols: number[];
	} {
		const clearedRows: number[] = [];
		const clearedCols: number[] = [];

		// 檢查行
		for (let row = 0; row < grid.length; row++) {
			if (grid[row].every((cell) => cell !== null)) {
				clearedRows.push(row);
			}
		}

		// 檢查列
		for (let col = 0; col < grid[0].length; col++) {
			let isFull = true;
			for (let row = 0; row < grid.length; row++) {
				if (grid[row][col] === null) {
					isFull = false;
					break;
				}
			}
			if (isFull) {
				clearedCols.push(col);
			}
		}

		// 清除滿的行
		for (const row of clearedRows) {
			for (let col = 0; col < grid[0].length; col++) {
				grid[row][col] = null;
			}
		}

		// 清除滿的列
		for (const col of clearedCols) {
			for (let row = 0; row < grid.length; row++) {
				grid[row][col] = null;
			}
		}

		return { clearedRows, clearedCols };
	}

	/**
	 * 獲取方塊的所有格子位置
	 */
	static getPieceCells(piece: TetrisPiece, centerPosition: GridPosition): GridPosition[] {
		return piece.shape.map((offset) => ({
			row: centerPosition.row + offset.y,
			col: centerPosition.col + offset.x
		}));
	}
}
