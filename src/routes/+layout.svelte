<script lang="ts">
	import '../app.css';
	import { AppShell, AppRail, AppRailAnchor } from '@skeletonlabs/skeleton';

	let railOpen = true;
</script>

<AppShell>
	<svelte:fragment slot="header">
		<header class="h-16 bg-primary-500 text-on-primary-token flex items-center px-4 shadow-lg">
			<button
				class="btn btn-ghost btn-sm mr-2 bg-transparent hover:bg-white/20 border-0 text-white cursor-pointer rounded p-2"
				on:click={() => (railOpen = !railOpen)}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<h1 class="text-xl font-bold">驾校科目二练习失误复盘系统</h1>
		</header>
	</svelte:fragment>

	<svelte:fragment slot="sidebarLeft">
		{#if railOpen}
			<AppRail
				background="bg-surface-100-800-token"
				width="w-56"
				height="h-full"
			>
				<nav class="flex flex-col gap-1 p-2">
					<AppRailAnchor href="/">
						<svelte:fragment slot="lead">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</svelte:fragment>
						练习记录
					</AppRailAnchor>
					<AppRailAnchor href="/edit">
						<svelte:fragment slot="lead">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</svelte:fragment>
						新增练习
					</AppRailAnchor>
					<AppRailAnchor href="/stats">
						<svelte:fragment slot="lead">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</svelte:fragment>
						统计分析
					</AppRailAnchor>
					<AppRailAnchor href="/heatmap">
						<svelte:fragment slot="lead">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
							</svg>
						</svelte:fragment>
						失误热力图
					</AppRailAnchor>
					<AppRailAnchor href="/suggestions">
						<svelte:fragment slot="lead">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
						</svelte:fragment>
						复盘建议
					</AppRailAnchor>
				</nav>
			</AppRail>
		{/if}
	</svelte:fragment>

	<main class="h-full overflow-y-auto p-4">
		<div class="max-w-7xl mx-auto">
			<slot />
		</div>
	</main>
</AppShell>
