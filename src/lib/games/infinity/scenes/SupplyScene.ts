import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SHOP, ITEM_SLOTS } from '../config';
import { ITEMS, ItemType } from '../entities';
import type { Item } from '../entities';
import { GameState } from '../state';

/**
 * 商品結構
 */
interface ShopItem {
	type: 'potion' | 'slot';
	itemType?: ItemType;
	name: string;
	price: number;
	background: Phaser.GameObjects.Rectangle;
	text: Phaser.GameObjects.Text;
	priceText: Phaser.GameObjects.Text;
}

/**
 * 道具格結構
 */
interface InventorySlot {
	background: Phaser.GameObjects.Rectangle;
	text: Phaser.GameObjects.Text | null;
	index: number;
}

/**
 * 補給場景（商店）
 */
export class SupplyScene extends Phaser.Scene {
	private gameState!: GameState;
	private shopItems: ShopItem[] = [];
	private inventorySlots: InventorySlot[] = [];
	private stageText!: Phaser.GameObjects.Text;

	constructor() {
		super({ key: 'SupplyScene' });
	}

	create() {
		this.gameState = GameState.getInstance();

		// 戰鬥結束後回滿血量
		this.gameState.healPlayerToFull();

		// 背景
		this.cameras.main.setBackgroundColor('#1a1a2e');

		// 標題
		this.createTitle();

		// 商店區域
		this.createShop();

		// 道具欄區域
		this.createInventory();

		// 下一關按鈕
		this.createNextButton();
	}

	/**
	 * 建立標題
	 */
	private createTitle() {
		const { currentMapLevel, currentStage, currentStageNumber } = this.gameState;

		// 標題
		const title = this.add.text(GAME_WIDTH / 2, 30, '補給場景', {
			fontSize: '24px',
			color: '#ffffff',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		title.setOrigin(0.5);

		// 關卡資訊
		this.stageText = this.add.text(
			GAME_WIDTH / 2,
			60,
			`${currentMapLevel}級地圖 - 第${currentStage}關（${currentStageNumber}/15）`,
			{
				fontSize: '14px',
				color: '#aaaaaa',
				fontFamily: 'Arial'
			}
		);
		this.stageText.setOrigin(0.5);
	}

	/**
	 * 建立商店區域
	 */
	private createShop() {
		const { itemSize, itemGap, padding, fontSize, titleFontSize, priceColor } = SHOP;
		const startY = 100;

		// 商店標題
		const shopTitle = this.add.text(padding, startY, '商店', {
			fontSize: `${titleFontSize}px`,
			color: '#ffffff',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});

		// 商品列表
		const availablePotions = this.gameState.availablePotions;
		const itemsPerRow = 4;
		let row = 0;
		let col = 0;

		// 清空舊的商品
		this.shopItems = [];

		// 血瓶商品
		for (const potionType of availablePotions) {
			const item = ITEMS[potionType];
			const x = padding + col * (itemSize + itemGap) + itemSize / 2;
			const y = startY + 40 + row * (itemSize + itemGap + 20) + itemSize / 2;

			this.createShopItem(x, y, 'potion', item, potionType);

			col++;
			if (col >= itemsPerRow) {
				col = 0;
				row++;
			}
		}

		// 道具欄擴充商品
		const canBuySlot = this.gameState.playerStats.maxItemSlots < 3;
		const slotX = padding + col * (itemSize + itemGap) + itemSize / 2;
		const slotY = startY + 40 + row * (itemSize + itemGap + 20) + itemSize / 2;

		this.createSlotItem(slotX, slotY, canBuySlot);
	}

	/**
	 * 建立商品格子
	 */
	private createShopItem(x: number, y: number, type: 'potion', item: Item, itemType: ItemType) {
		const { itemSize, fontSize, priceColor, disabledColor } = SHOP;
		const canBuy = this.gameState.playerStats.hasItemSpace;

		// 背景
		const background = this.add.rectangle(
			x,
			y,
			itemSize,
			itemSize,
			canBuy ? COLORS.itemSlotFilled : disabledColor
		);
		background.setStrokeStyle(2, COLORS.itemSlotStroke);

		// 商品名稱
		const text = this.add.text(x, y - 10, item.name, {
			fontSize: `${fontSize}px`,
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		text.setOrigin(0.5);

		// 價格
		const priceText = this.add.text(x, y + 15, '$0', {
			fontSize: `${fontSize}px`,
			color: priceColor,
			fontFamily: 'Arial'
		});
		priceText.setOrigin(0.5);

		// 互動
		if (canBuy) {
			background.setInteractive({ useHandCursor: true });

			background.on('pointerover', () => {
				background.setStrokeStyle(3, COLORS.buttonHover);
			});

			background.on('pointerout', () => {
				background.setStrokeStyle(2, COLORS.itemSlotStroke);
			});

			background.on('pointerdown', () => {
				this.buyPotion(itemType);
			});
		}

		this.shopItems.push({
			type: 'potion',
			itemType,
			name: item.name,
			price: 0,
			background,
			text,
			priceText
		});
	}

	/**
	 * 建立道具欄擴充商品
	 */
	private createSlotItem(x: number, y: number, canBuy: boolean) {
		const { itemSize, fontSize, priceColor, disabledColor } = SHOP;

		// 背景
		const background = this.add.rectangle(
			x,
			y,
			itemSize,
			itemSize,
			canBuy ? COLORS.button : disabledColor
		);
		background.setStrokeStyle(2, COLORS.buttonStroke);

		// 商品名稱
		const text = this.add.text(x, y - 10, '道具欄+1', {
			fontSize: `${fontSize}px`,
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		text.setOrigin(0.5);

		// 價格
		const priceText = this.add.text(x, y + 15, '$0', {
			fontSize: `${fontSize}px`,
			color: priceColor,
			fontFamily: 'Arial'
		});
		priceText.setOrigin(0.5);

		// 互動
		if (canBuy) {
			background.setInteractive({ useHandCursor: true });

			background.on('pointerover', () => {
				background.setStrokeStyle(3, COLORS.buttonHover);
			});

			background.on('pointerout', () => {
				background.setStrokeStyle(2, COLORS.buttonStroke);
			});

			background.on('pointerdown', () => {
				this.buyItemSlot();
			});
		}

		this.shopItems.push({
			type: 'slot',
			name: '道具欄+1',
			price: 0,
			background,
			text,
			priceText
		});
	}

	/**
	 * 建立道具欄區域
	 */
	private createInventory() {
		const { size, gap, padding, strokeWidth } = ITEM_SLOTS;
		const startY = 350;

		// 道具欄標題
		const inventoryTitle = this.add.text(padding, startY, '道具欄', {
			fontSize: '18px',
			color: '#ffffff',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});

		// 道具格
		const maxSlots = this.gameState.playerStats.maxItemSlots;
		const items = this.gameState.playerStats.items;

		this.inventorySlots = [];

		for (let i = 0; i < maxSlots; i++) {
			const x = padding + i * (size + gap) + size / 2;
			const y = startY + 50;

			const hasItem = i < items.length;
			const item = hasItem ? items[i] : null;

			// 背景
			const background = this.add.rectangle(
				x,
				y,
				size,
				size,
				hasItem ? COLORS.itemSlotFilled : COLORS.itemSlot
			);
			background.setStrokeStyle(strokeWidth, COLORS.itemSlotStroke);

			let text: Phaser.GameObjects.Text | null = null;

			if (item) {
				// 道具名稱
				text = this.add.text(x, y - 5, item.name.charAt(0), {
					fontSize: '16px',
					color: '#ffffff',
					fontFamily: 'Arial'
				});
				text.setOrigin(0.5);

				// 賣出文字
				const sellText = this.add.text(x, y + 12, '(賣)', {
					fontSize: '10px',
					color: '#ff6666',
					fontFamily: 'Arial'
				});
				sellText.setOrigin(0.5);

				// 互動（賣出）
				background.setInteractive({ useHandCursor: true });

				background.on('pointerover', () => {
					background.setStrokeStyle(strokeWidth + 1, 0xff6666);
				});

				background.on('pointerout', () => {
					background.setStrokeStyle(strokeWidth, COLORS.itemSlotStroke);
				});

				const slotIndex = i;
				background.on('pointerdown', () => {
					this.sellItem(slotIndex);
				});
			}

			this.inventorySlots.push({
				background,
				text,
				index: i
			});
		}

		// 顯示道具欄狀態
		const statusText = this.add.text(
			padding,
			startY + 100,
			`道具欄: ${items.length}/${maxSlots}`,
			{
				fontSize: '12px',
				color: '#aaaaaa',
				fontFamily: 'Arial'
			}
		);
	}

	/**
	 * 建立下一關按鈕
	 */
	private createNextButton() {
		const buttonY = GAME_HEIGHT - 80;

		// 按鈕背景
		const button = this.add.rectangle(GAME_WIDTH / 2, buttonY, 120, 50, COLORS.button);
		button.setStrokeStyle(2, COLORS.buttonStroke);
		button.setInteractive({ useHandCursor: true });

		// 按鈕文字
		const buttonText = this.add.text(GAME_WIDTH / 2, buttonY, '下一關', {
			fontSize: '18px',
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		buttonText.setOrigin(0.5);

		// 互動效果
		button.on('pointerover', () => {
			button.setFillStyle(COLORS.buttonHover);
		});

		button.on('pointerout', () => {
			button.setFillStyle(COLORS.button);
		});

		button.on('pointerdown', () => {
			this.goToNextStage();
		});
	}

	/**
	 * 購買血瓶
	 */
	private buyPotion(potionType: ItemType) {
		const success = this.gameState.buyPotion(potionType);

		if (success) {
			console.log(`[商店] 購買 ${ITEMS[potionType].name}`);
			this.refreshUI();
		} else {
			console.log('[商店] 購買失敗：道具欄已滿或無法購買');
		}
	}

	/**
	 * 購買道具欄擴充
	 */
	private buyItemSlot() {
		const success = this.gameState.buyItemSlot();

		if (success) {
			console.log('[商店] 購買道具欄 +1');
			this.refreshUI();
		} else {
			console.log('[商店] 購買失敗：道具欄已達上限');
		}
	}

	/**
	 * 賣出道具
	 */
	private sellItem(index: number) {
		const item = this.gameState.playerStats.items[index];
		const success = this.gameState.sellItem(index);

		if (success) {
			console.log(`[商店] 賣出 ${item.name}`);
			this.refreshUI();
		} else {
			console.log('[商店] 賣出失敗');
		}
	}

	/**
	 * 重新整理 UI
	 */
	private refreshUI() {
		// 重新建立整個場景是最簡單的方式
		this.scene.restart();
	}

	/**
	 * 進入下一關
	 */
	private goToNextStage() {
		const hasNextStage = this.gameState.nextStage();

		if (hasNextStage) {
			console.log(
				`[遊戲] 進入下一關: ${this.gameState.currentMapLevel}級地圖 第${this.gameState.currentStage}關`
			);
			this.scene.start('MainScene');
		} else {
			console.log('[遊戲] 恭喜通關！');
			// 未來可以加入通關場景
			this.scene.start('MainScene');
		}
	}
}
