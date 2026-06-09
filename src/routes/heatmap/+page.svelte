<script lang="ts">
	import { onMount } from 'svelte';
	import { getRecords } from '$lib/storage';
	import { TRAINING_ITEMS, ERROR_TYPES } from '$lib/constants';
	import type { PracticeRecord, ErrorType, TrainingItem } from '$lib/types';

	let records: PracticeRecord[] = [];
	let uniqueStudents: string[] = [];
	let selectedStudent = '';

	$: filteredRecords = selectedStudent
		? records.filter((r) => r.studentName === selectedStudent)
		: records;

	$: heatmapData = TRAINING_ITEMS.map((item) => {
		return ERROR_TYPES.map((error) => {
			const count = filteredRecords.filter(
				(r) => r.trainingItem === item && r.mainErrorType === error
			).length;
			return { x: error, y: item, value: count };
		});
	}).flat();

	$: maxValue = Math.max(...heatmapData.map((d) => d.value), 1);

	$: topCombinations = (() => {
		const combos = new Map<string, number>();
		filteredRecords.forEach((r) => {
			const key = `${r.trainingItem} - ${r.mainErrorType}`;
			combos.set(key, (combos.get(key) || 0) + 1);
		});
		return Array.from(combos.entries())
			.map(([combo, count]) => ({ combo, count }))
			.filter((c) => c.count > 0)
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	})();

	$: dailyDates = [...new Set(filteredRecords.map((r) => r.practiceDate))].sort().slice(-14);

	$: dailyHeatmapData = TRAINING_ITEMS.map((item) => {
		return dailyDates.map((date) => {
			const count = filteredRecords.filter(
				(r) => r.trainingItem === item && r.practiceDate === date
			).reduce((sum, r) => sum + r.deductCount, 0);
			return { date, item, value: count };
		});
	}).flat();

	$: dailyHeatmax = Math.max(...dailyHeatmapData.map((d) => d.value), 1);

	onMount(() => {
		records = getRecords();
		uniqueStudents = [...new Set(records.map((r) => r.studentName))];
	});

	function getColorForValue(value: number, max: number): string {
		if (value === 0) return 'bg-gray-100 text-gray-400';
		const ratio = value / max;
		if (ratio <= 0.2) return 'bg-emerald-100 text-emerald-800';
		if (ratio <= 0.4) return 'bg-lime-100 text-lime-800';
		if (ratio <= 0.6) return 'bg-yellow-100 text-yellow-800';
		if (ratio <= 0.8) return 'bg-orange-100 text-orange-800';
		return 'bg-red-200 text-red-900';
	}
</script>

<svelte:head>
	<title>失误热力图 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">失误热力图分析</h2>
		<div class="w-64">
			<label class="block text-sm font-medium mb-1">筛选学员</label>
			<select
				bind:value={selectedStudent}
				class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
			>
				<option value="">全部学员</option>
				{#each uniqueStudents as name}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if records.length === 0}
		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<div class="text-center py-12 text-on-surface-variant-token">
				<p class="text-lg">暂无数据，请先添加练习记录</p>
			</div>
		</div>
	{:else}
		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<h3 class="font-semibold text-lg mb-4">训练项目 × 失误类型 热力矩阵</h3>
			<div class="overflow-x-auto">
				<table class="w-full text-sm border-collapse">
					<thead>
						<tr>
							<th class="p-2 text-left border-b border-r border-surface-300-700-token bg-surface-50-900-token font-semibold whitespace-nowrap">
								项目 \ 失误类型
							</th>
							{#each ERROR_TYPES as error}
								<th class="p-2 text-center border-b border-r border-surface-300-700-token bg-surface-50-900-token font-semibold" style="writing-mode: vertical-rl; height: 100px;">
									{error}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each TRAINING_ITEMS as item}
							<tr>
								<td class="p-2 border-b border-r border-surface-300-700-token bg-surface-50-900-token font-medium whitespace-nowrap">
									{item}
								</td>
								{#each ERROR_TYPES as error}
									{@const count = heatmapData.find((d) => d.x === error && d.y === item)?.value || 0}
									<td class="p-2 border-b border-r border-surface-200-800-token text-center">
										<span class="inline-block min-w-[40px] px-2 py-1 rounded font-bold {getColorForValue(count, maxValue)}">
											{count > 0 ? count : ''}
										</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="mt-4 flex items-center gap-2 flex-wrap">
				<span class="text-sm text-on-surface-variant-token">图例：</span>
				<span class="px-3 py-1 rounded bg-gray-100 text-gray-400 text-sm">0</span>
				<span class="px-3 py-1 rounded bg-emerald-100 text-emerald-800 text-sm">少</span>
				<span class="px-3 py-1 rounded bg-lime-100 text-lime-800 text-sm"></span>
				<span class="px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm">中</span>
				<span class="px-3 py-1 rounded bg-orange-100 text-orange-800 text-sm"></span>
				<span class="px-3 py-1 rounded bg-red-200 text-red-900 text-sm">多</span>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<h3 class="font-semibold text-lg mb-4">高频失误 TOP 10</h3>
				{#if topCombinations.length === 0}
					<p class="text-on-surface-variant-token">暂无数据</p>
				{:else}
					<div class="space-y-2">
						{#each topCombinations as combo, index}
							<div class="flex items-center gap-3">
								<span class="inline-block w-8 text-center px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold">
									{index + 1}
								</span>
								<div class="flex-1">
									<div class="flex justify-between items-center mb-1">
										<span class="font-medium">{combo.combo}</span>
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getColorForValue(combo.count, Math.max(...topCombinations.map((c) => c.count)))}">
											{combo.count} 次
										</span>
									</div>
									<div class="h-2 bg-surface-50-900-token rounded overflow-hidden">
										<div
											class="h-full bg-primary-500 rounded transition-all"
											style="width: {(combo.count / Math.max(...topCombinations.map((c) => c.count))) * 100}%;"
										></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<h3 class="font-semibold text-lg mb-4">近14天每日扣分热力图</h3>
				<div class="overflow-x-auto">
					{#if dailyHeatmapData.length === 0 || dailyDates.length === 0}
						<p class="text-on-surface-variant-token">暂无近期数据</p>
					{:else}
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr>
									<th class="p-2 text-left border-b border-r border-surface-300-700-token bg-surface-50-900-token font-semibold whitespace-nowrap text-xs">
										项目 \ 日期
									</th>
									{#each dailyDates as date}
										<th class="p-2 text-center border-b border-r border-surface-300-700-token bg-surface-50-900-token font-semibold text-xs" style="writing-mode: vertical-rl; height: 80px;">
											{date.slice(5)}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each TRAINING_ITEMS as item}
									<tr>
										<td class="p-2 border-b border-r border-surface-300-700-token bg-surface-50-900-token font-medium whitespace-nowrap text-xs">
											{item}
										</td>
										{#each dailyDates as date}
											{@const count = dailyHeatmapData.find((d) => d.date === date && d.item === item)?.value || 0}
											<td class="p-1 border-b border-r border-surface-200-800-token text-center">
												<span class="inline-block min-w-[36px] px-1 py-1 rounded font-bold text-xs {getColorForValue(count, dailyHeatmax)}">
													{count > 0 ? count : ''}
												</span>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
