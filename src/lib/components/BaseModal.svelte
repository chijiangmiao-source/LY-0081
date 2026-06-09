<script lang="ts">
	export let open = false;
	export let width = 'max-w-lg';
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="absolute inset-0 bg-black/50"
			on:click={() => (open = false)}
		></div>
		<div
			class="relative bg-surface-100-900-token rounded-lg shadow-xl border border-surface-200-800-token w-full {width} max-h-[90vh] overflow-y-auto"
			on:click|stopPropagation
		>
			<slot />
		</div>
	</div>
{/if}
