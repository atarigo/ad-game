<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllGames, getScores, gameNames, detailLabels, type ScoreRecord } from '$lib/scores';

	let records = $state<Record<string, ScoreRecord[]>>({});
	let hasAny = $state(false);

	onMount(() => {
		const slugs = getAllGames();
		for (const slug of slugs) {
			const list = getScores(slug);
			if (list.length > 0) records[slug] = list;
		}
		hasAny = Object.keys(records).length > 0;
	});

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const mi = String(d.getMinutes()).padStart(2, '0');
		return `${mm}/${dd} ${hh}:${mi}`;
	}

	function detailText(slug: string, details: Record<string, number>): string {
		const labels = detailLabels[slug] ?? {};
		return Object.entries(details)
			.map(([k, v]) => `${labels[k] ?? k} ×${v}`)
			.join('　');
	}
</script>

<svelte:head>
	<title>成績記錄 — Ad Game</title>
</svelte:head>

<div class="page">
	<div class="frame">
		<div class="frame-corner tl"></div>
		<div class="frame-corner tr"></div>
		<div class="frame-corner bl"></div>
		<div class="frame-corner br"></div>
		<div class="frame-edge top"></div>
		<div class="frame-edge bottom"></div>
		<div class="frame-edge left"></div>
		<div class="frame-edge right"></div>

		<header>
			<a href="/" class="back">← 返回首頁</a>
			<h1>成績記錄</h1>
		</header>

		<div class="content">
			{#if !hasAny}
				<div class="empty">
					<p class="empty-title">尚無任何成績</p>
					<p class="empty-desc">完成遊戲後，成績會自動記錄在這裡。</p>
					<p class="empty-hint">成績目前僅儲存在此裝置，更換裝置或清除瀏覽器資料將會遺失。</p>
				</div>
			{:else}
				<p class="storage-hint">成績目前僅儲存在此裝置，更換裝置或清除瀏覽器資料將會遺失。</p>

				{#each Object.entries(records) as [slug, list]}
					<section class="game-section">
						<h2 class="game-title">{gameNames[slug] ?? slug}</h2>
						<div class="score-list">
							{#each list as record, i}
								<div class="score-row" class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>
									<span class="rank">#{i + 1}</span>
									<div class="score-main">
										<span class="score-value">{record.score.toLocaleString()} 分</span>
										<span class="score-time">{formatTime(record.finishedAt)}</span>
									</div>
									<div class="score-details">{detailText(slug, record.details)}</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	/* --- Decorative Frame --- */

	.frame {
		position: relative;
		width: 100%;
		max-width: 640px;
		padding: 2.5rem 2rem;
		border: 1px solid rgba(180, 160, 130, 0.2);
		border-radius: 4px;
		background: rgba(20, 20, 24, 0.6);
	}

	.frame-corner {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: rgba(196, 149, 106, 0.5);
		border-style: solid;
	}

	.frame-corner.tl { top: 6px; left: 6px; border-width: 2px 0 0 2px; }
	.frame-corner.tr { top: 6px; right: 6px; border-width: 2px 2px 0 0; }
	.frame-corner.bl { bottom: 6px; left: 6px; border-width: 0 0 2px 2px; }
	.frame-corner.br { bottom: 6px; right: 6px; border-width: 0 2px 2px 0; }

	.frame-edge {
		position: absolute;
		background: rgba(196, 149, 106, 0.15);
	}

	.frame-edge.top, .frame-edge.bottom {
		left: 32px;
		right: 32px;
		height: 1px;
	}

	.frame-edge.top { top: 12px; }
	.frame-edge.bottom { bottom: 12px; }

	.frame-edge.left, .frame-edge.right {
		top: 32px;
		bottom: 32px;
		width: 1px;
	}

	.frame-edge.left { left: 12px; }
	.frame-edge.right { right: 12px; }

	/* --- Header --- */

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.back {
		display: inline-block;
		font-size: 0.85rem;
		color: var(--neon-cyan, #b8a48a);
		margin-bottom: 1rem;
	}

	h1 {
		font-family: 'Audiowide', sans-serif;
		font-size: 1.6rem;
		color: var(--neon-pink, #c4956a);
		text-shadow: 0 0 8px rgba(196, 149, 106, 0.4);
	}

	/* --- Empty State --- */

	.empty {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-title {
		font-family: 'Audiowide', sans-serif;
		font-size: 1.1rem;
		color: var(--text-primary, #d4cfc8);
		margin-bottom: 0.8rem;
	}

	.empty-desc {
		font-size: 0.9rem;
		color: var(--text-muted, #706b63);
		margin-bottom: 1.5rem;
	}

	.empty-hint {
		font-size: 0.8rem;
		color: rgba(180, 160, 130, 0.45);
		border-top: 1px solid rgba(180, 160, 130, 0.1);
		padding-top: 1rem;
	}

	.storage-hint {
		font-size: 0.75rem;
		color: rgba(180, 160, 130, 0.4);
		text-align: center;
		margin-bottom: 1.5rem;
	}

	/* --- Game Section --- */

	.game-section {
		margin-bottom: 2rem;
	}

	.game-section:last-child {
		margin-bottom: 0;
	}

	.game-title {
		font-family: 'Audiowide', sans-serif;
		font-size: 1rem;
		color: var(--neon-cyan, #b8a48a);
		margin-bottom: 0.8rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid rgba(180, 160, 130, 0.15);
	}

	/* --- Score Rows --- */

	.score-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.score-row {
		display: grid;
		grid-template-columns: 2.2rem 1fr;
		grid-template-rows: auto auto;
		gap: 0 0.8rem;
		padding: 0.7rem 0.8rem;
		border-radius: 6px;
		background: rgba(180, 160, 130, 0.04);
		border: 1px solid rgba(180, 160, 130, 0.08);
	}

	.score-row.gold { border-color: rgba(255, 215, 0, 0.3); background: rgba(255, 215, 0, 0.05); }
	.score-row.silver { border-color: rgba(192, 192, 192, 0.25); background: rgba(192, 192, 192, 0.04); }
	.score-row.bronze { border-color: rgba(205, 127, 50, 0.25); background: rgba(205, 127, 50, 0.04); }

	.rank {
		grid-row: 1 / -1;
		align-self: center;
		font-family: 'Audiowide', sans-serif;
		font-size: 0.9rem;
		color: var(--text-muted, #706b63);
		text-align: center;
	}

	.gold .rank { color: #ffd700; }
	.silver .rank { color: #c0c0c0; }
	.bronze .rank { color: #cd7f32; }

	.score-main {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.score-value {
		font-family: 'Audiowide', sans-serif;
		font-size: 1rem;
		color: var(--text-primary, #d4cfc8);
	}

	.score-time {
		font-size: 0.75rem;
		color: var(--text-muted, #706b63);
	}

	.score-details {
		font-size: 0.75rem;
		color: rgba(180, 160, 130, 0.55);
		margin-top: 0.15rem;
	}
</style>
