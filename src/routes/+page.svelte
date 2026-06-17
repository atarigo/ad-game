<script lang="ts">
	const games: { slug: string; name: string; description: string }[] = [
		{ slug: 'survival-loop', name: '末日生存', description: '砍柴、打獵、賺錢、升級營地！' },
	];
	const upcoming = [
		{ name: '???', description: 'Coming soon...' },
	];
</script>

<svelte:head>
	<title>Ad Game — 假廣告遊戲集合</title>
	<meta name="description" content="這些遊戲我好像在哪看過耶！" />
</svelte:head>

<main>
	<section class="hero">
		<h1 class="glitch" data-text="AD GAME">AD GAME</h1>
		<p class="tagline">這些遊戲我好像在哪看過耶！</p>
	</section>

	<section class="games">
		{#if games.length === 0}
			<p class="empty">遊戲開發中，敬請期待。</p>
		{:else}
			<ul class="game-list">
				{#each games as game}
					<li>
						<a href="/game/{game.slug}" class="game-card">
							<span class="game-name">{game.name}</span>
							<span class="game-desc">{game.description}</span>
						</a>
					</li>
				{/each}
				{#each upcoming as item}
					<li>
						<div class="game-card disabled">
							<span class="game-name">{item.name}</span>
							<span class="game-desc">{item.description}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
	<a href="/records" class="records-link">📋 成績記錄</a>
	<span class="version">v0.2.1</span>
</main>

<style>
	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		gap: 3rem;
	}

	/* --- Hero --- */

	.hero {
		text-align: center;
	}

	h1 {
		font-family: 'Audiowide', sans-serif;
		font-size: clamp(3rem, 10vw, 6rem);
		letter-spacing: 0.05em;
		color: var(--neon-pink);
		text-shadow:
			0 0 6px var(--neon-pink),
			0 0 20px rgba(255, 45, 123, 0.3);
		position: relative;
	}

	/* glitch layers */
	.glitch::before,
	.glitch::after {
		content: attr(data-text);
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.6;
	}

	.glitch::before {
		color: var(--neon-cyan);
		animation: glitch-1 3s infinite linear;
		clip-path: inset(0 0 85% 0);
	}

	.glitch::after {
		color: var(--neon-yellow);
		animation: glitch-2 3s infinite linear;
		clip-path: inset(85% 0 0 0);
	}

	@keyframes glitch-1 {
		0%, 90%, 100% { transform: none; }
		92% { transform: translate(-4px, -2px); }
		94% { transform: translate(4px, 2px); }
		96% { transform: translate(-2px, 1px); }
	}

	@keyframes glitch-2 {
		0%, 88%, 100% { transform: none; }
		90% { transform: translate(3px, -1px); }
		93% { transform: translate(-3px, 2px); }
		95% { transform: translate(2px, -2px); }
	}

	.tagline {
		margin-top: 1rem;
		font-size: clamp(1rem, 3vw, 1.4rem);
		color: var(--text-muted);
		line-height: 1.8;
		letter-spacing: 0.1em;
	}

	/* --- Games --- */

	.games {
		width: 100%;
		max-width: 960px;
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 2rem;
	}

	.game-list {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.game-card {
		display: block;
		padding: 1.2rem 1.5rem;
		border: 1px solid rgba(180, 160, 130, 0.2);
		border-radius: 8px;
		background: rgba(180, 160, 130, 0.05);
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.game-card:hover:not(.disabled) {
		border-color: rgba(200, 175, 140, 0.4);
		box-shadow: 0 0 16px rgba(180, 120, 60, 0.1);
	}

	.game-card.disabled {
		opacity: 0.35;
		cursor: default;
		border-color: rgba(180, 160, 130, 0.08);
	}

	.game-name {
		display: block;
		font-family: 'Audiowide', sans-serif;
		font-size: 1.1rem;
		color: var(--neon-cyan);
	}

	.game-desc {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.records-link {
		font-family: 'Audiowide', sans-serif;
		font-size: 0.95rem;
		color: var(--neon-cyan);
		border: 1px solid rgba(180, 160, 130, 0.2);
		padding: 0.6rem 1.5rem;
		border-radius: 8px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.records-link:hover {
		border-color: rgba(200, 175, 140, 0.4);
		box-shadow: 0 0 12px rgba(180, 120, 60, 0.1);
	}

	.version {
		position: fixed;
		right: 8px;
		bottom: 8px;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.45);
	}
</style>
