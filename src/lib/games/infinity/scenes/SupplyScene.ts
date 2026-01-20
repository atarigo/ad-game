import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SHOP, ITEM_SLOTS } from '../config';
import { ITEMS, ItemType, type Item, type PrimaryAttributes } from '../entities';
import { GameState, getPotionPrice } from '../state';
import { getAttributeUpgradeCost } from '../data/constants';

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
	private pointsText!: Phaser.GameObjects.Text;

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

		// 屬性升級區域
		this.createAttributeUpgrade();

		// 下一關按鈕
		this.createNextButton();
	}

	/**
	 * 建立標題
	 */
	private createTitle() {
		const { currentMapLevel, currentStage, currentStageNumber, points } = this.gameState;

		// 標題
		const title = this.add.text(GAME_WIDTH / 2, 25, '補給場景', {
			fontSize: '22px',
			color: '#ffffff',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		title.setOrigin(0.5);

		// 關卡資訊
		this.stageText = this.add.text(
			GAME_WIDTH / 2,
			50,
			`${currentMapLevel}級地圖 - 第${currentStage}關（通關 ${this.gameState.stagesClearedInCurrentLevel}/3 可晉級）`,
			{
				fontSize: '12px',
				color: '#aaaaaa',
				fontFamily: 'Arial'
			}
		);
		this.stageText.setOrigin(0.5);

		// 點數顯示
		this.pointsText = this.add.text(GAME_WIDTH / 2, 70, `點數: ${points}`, {
			fontSize: '16px',
			color: '#ffcc00',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		this.pointsText.setOrigin(0.5);
	}

	/**
	 * 建立商店區域
	 */
	private createShop() {
		const { itemSize, itemGap, padding, fontSize, titleFontSize, priceColor } = SHOP;
		const startY = 95;
		const titleHeight = 25; // 標題高度
		const rowSpacing = 15; // 行間距

		// 商店標題
		this.add.text(padding, startY, '商店', {
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
			const price = getPotionPrice(potionType);
			const x = padding + col * (itemSize + itemGap) + itemSize / 2;
			const y = startY + titleHeight + row * (itemSize + rowSpacing) + itemSize / 2;

			this.createShopItem(x, y, 'potion', item, potionType, price);

			col++;
			if (col >= itemsPerRow) {
				col = 0;
				row++;
			}
		}

		// 道具欄擴充商品
		const canBuySlot = this.gameState.playerStats.maxItemSlots < 3;
		const slotX = padding + col * (itemSize + itemGap) + itemSize / 2;
		const slotY = startY + titleHeight + row * (itemSize + rowSpacing) + itemSize / 2;

		this.createSlotItem(slotX, slotY, canBuySlot);
	}

	/**
	 * 建立商品格子
	 */
	private createShopItem(
		x: number,
		y: number,
		type: 'potion',
		item: Item,
		itemType: ItemType,
		price: number
	) {
		const { itemSize, fontSize, priceColor, disabledColor } = SHOP;
		const hasSpace = this.gameState.playerStats.hasItemSpace;
		const canAfford = this.gameState.points >= price;
		const canBuy = hasSpace && canAfford;

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
			color: canBuy ? '#ffffff' : '#888888',
			fontFamily: 'Arial'
		});
		text.setOrigin(0.5);

		// 價格
		const priceText = this.add.text(x, y + 15, `$${price}`, {
			fontSize: `${fontSize}px`,
			color: canAfford ? priceColor : '#ff6666',
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
			price,
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
		const price = this.gameState.getItemSlotPrice();
		const canAfford = this.gameState.points >= price;
		const canPurchase = canBuy && canAfford;

		// 背景
		const background = this.add.rectangle(
			x,
			y,
			itemSize,
			itemSize,
			canPurchase ? COLORS.button : disabledColor
		);
		background.setStrokeStyle(2, COLORS.buttonStroke);

		// 商品名稱
		const text = this.add.text(x, y - 10, '道具欄+1', {
			fontSize: `${fontSize}px`,
			color: canPurchase ? '#ffffff' : '#888888',
			fontFamily: 'Arial'
		});
		text.setOrigin(0.5);

		// 價格或狀態
		let statusText: string;
		let statusColor: string;
		if (!canBuy) {
			statusText = '已滿';
			statusColor = '#888888';
		} else {
			statusText = `$${price.toLocaleString()}`;
			statusColor = canAfford ? priceColor : '#ff6666';
		}
		const priceText = this.add.text(x, y + 15, statusText, {
			fontSize: `${fontSize}px`,
			color: statusColor,
			fontFamily: 'Arial'
		});
		priceText.setOrigin(0.5);

		// 互動
		if (canPurchase) {
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
			price,
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
		// 計算商店區域結束位置：95 + 25(標題) + 最多2行商品(70+15)*2 = 280
		const startY = 290; // 預留10px間距
		const titleHeight = 20;
		const slotAreaHeight = 50; // 道具格區域高度
		const statusHeight = 20; // 狀態文字高度

		// 道具欄標題
		this.add.text(padding, startY, '道具欄', {
			fontSize: '16px',
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
			const y = startY + titleHeight + size / 2;

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
					fontSize: '14px',
					color: '#ffffff',
					fontFamily: 'Arial'
				});
				text.setOrigin(0.5);

				// 賣出價格
				const sellPrice = Math.floor(getPotionPrice(item.type) * 0.5);
				const sellText = this.add.text(x, y + 12, `賣$${sellPrice}`, {
					fontSize: '9px',
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
		this.add.text(padding, startY + titleHeight + slotAreaHeight, `道具欄: ${items.length}/${maxSlots}`, {
			fontSize: '11px',
			color: '#aaaaaa',
			fontFamily: 'Arial'
		});
	}

	/**
	 * 建立屬性升級區域
	 */
	private createAttributeUpgrade() {
		// 計算道具欄區域結束位置：290 + 20(標題) + 50(道具格) + 20(狀態) = 380
		const startY = 390; // 預留10px間距
		const padding = SHOP.padding;
		const titleHeight = 20;
		const rowHeight = 32; // 稍微縮小行高以節省空間

		// 標題
		this.add.text(padding, startY, '屬性升級', {
			fontSize: '16px',
			color: '#ffffff',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});

		const attributes: Array<{
			key: keyof PrimaryAttributes;
			name: string;
		}> = [
			{ key: 'strength', name: '力量' },
			{ key: 'vitality', name: '體力' },
			{ key: 'agility', name: '敏捷' },
			{ key: 'intelligence', name: '智力' },
			{ key: 'willpower', name: '意志' },
			{ key: 'luck', name: '幸運' }
		];

		const colWidth = 110;
		const maxRows = 2; // 最多2行，每行3個

		attributes.forEach((attr, index) => {
			const col = index % 3;
			const row = Math.floor(index / 3);
			const x = padding + col * colWidth;
			const y = startY + titleHeight + row * rowHeight;

			const currentValue = this.gameState.playerStats.primary[attr.key];
			const cost = getAttributeUpgradeCost(currentValue);
			const canAfford = this.gameState.points >= cost;
			const atMax = currentValue >= 250;

			// 屬性名稱和數值
			this.add.text(x, y, `${attr.name}: ${currentValue}`, {
				fontSize: '11px',
				color: '#ffffff',
				fontFamily: 'Arial'
			});

			// 升級按鈕
			if (!atMax) {
				const btnX = x + 70;
				const btnY = y + 6;
				const btn = this.add.rectangle(btnX, btnY, 30, 16, canAfford ? COLORS.button : 0x444444);
				btn.setStrokeStyle(1, canAfford ? COLORS.buttonStroke : 0x333333);

				const btnText = this.add.text(btnX, btnY, '+1', {
					fontSize: '9px',
					color: canAfford ? '#ffffff' : '#666666',
					fontFamily: 'Arial'
				});
				btnText.setOrigin(0.5);

				// 價格
				this.add.text(x, y + 16, `$${cost}`, {
					fontSize: '9px',
					color: canAfford ? '#ffcc00' : '#ff6666',
					fontFamily: 'Arial'
				});

				if (canAfford) {
					btn.setInteractive({ useHandCursor: true });
					btn.on('pointerover', () => btn.setFillStyle(COLORS.buttonHover));
					btn.on('pointerout', () => btn.setFillStyle(COLORS.button));
					btn.on('pointerdown', () => this.upgradeAttribute(attr.key));
				}
			} else {
				this.add.text(x, y + 16, 'MAX', {
					fontSize: '9px',
					color: '#888888',
					fontFamily: 'Arial'
				});
			}
		});
	}

	/**
	 * 建立下一關按鈕
	 */
	private createNextButton() {
		// 計算屬性升級區域結束位置：390 + 20(標題) + 2行(32*2) = 474
		// 預留空間給按鈕，確保不重疊
		const buttonY = GAME_HEIGHT - 40;

		// 按鈕背景
		const button = this.add.rectangle(GAME_WIDTH / 2, buttonY, 120, 40, COLORS.button);
		button.setStrokeStyle(2, COLORS.buttonStroke);
		button.setInteractive({ useHandCursor: true });

		// 按鈕文字
		const buttonText = this.add.text(GAME_WIDTH / 2, buttonY, '下一關', {
			fontSize: '16px',
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		buttonText.setOrigin(0.5);

		// 互動效果
		button.on('pointerover', () => button.setFillStyle(COLORS.buttonHover));
		button.on('pointerout', () => button.setFillStyle(COLORS.button));
		button.on('pointerdown', () => this.goToNextStage());
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
			console.log('[商店] 購買失敗：點數不足或道具欄已滿');
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
	 * 升級屬性
	 */
	private upgradeAttribute(attribute: keyof typeof this.gameState.playerStats.primary) {
		const success = this.gameState.upgradeAttribute(attribute);

		if (success) {
			this.refreshUI();
		}
	}

	/**
	 * 重新整理 UI
	 */
	private refreshUI() {
		// 更新點數顯示
		this.pointsText.setText(`點數: ${this.gameState.points}`);
		
		// 更新所有商品的可購買狀態
		for (const shopItem of this.shopItems) {
			const canAfford = this.gameState.points >= shopItem.price;
			
			// 更新價格顏色
			if (shopItem.type === 'potion') {
				const hasSpace = this.gameState.playerStats.hasItemSpace;
				const canBuy = hasSpace && canAfford;
				shopItem.priceText.setColor(canAfford ? SHOP.priceColor : '#ff6666');
				shopItem.background.setFillStyle(canBuy ? COLORS.itemSlotFilled : SHOP.disabledColor);
				shopItem.text.setColor(canBuy ? '#ffffff' : '#888888');
				
				// 更新互動狀態
				if (canBuy) {
					shopItem.background.setInteractive({ useHandCursor: true });
				} else {
					shopItem.background.disableInteractive();
				}
			} else if (shopItem.type === 'slot') {
				const canBuy = this.gameState.playerStats.maxItemSlots < 3;
				const canPurchase = canBuy && canAfford;
				shopItem.priceText.setColor(canAfford ? SHOP.priceColor : '#ff6666');
				shopItem.background.setFillStyle(canPurchase ? COLORS.button : SHOP.disabledColor);
				shopItem.text.setColor(canPurchase ? '#ffffff' : '#888888');
				
				// 更新互動狀態
				if (canPurchase) {
					shopItem.background.setInteractive({ useHandCursor: true });
				} else {
					shopItem.background.disableInteractive();
				}
			}
		}
		
		// 更新道具欄
		this.updateInventory();
		
		// 更新屬性升級區域（需要重新建立，因為按鈕是動態的）
		// 為了簡化，我們重新啟動場景
		this.scene.restart();
	}

	/**
	 * 更新道具欄顯示
	 */
	private updateInventory() {
		// 清除舊的道具欄
		for (const slot of this.inventorySlots) {
			slot.background.destroy();
			if (slot.text) slot.text.destroy();
		}
		this.inventorySlots = [];
		
		// 重新建立道具欄（簡化版，實際應該只更新變化的部分）
		// 這裡為了簡化，我們在 refreshUI 中重新啟動場景
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
			this.scene.start('MainScene');
		}
	}
}
