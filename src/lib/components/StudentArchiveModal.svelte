<script lang="ts">
	import { goto } from '$app/navigation';
	import BaseModal from './BaseModal.svelte';
	import ApexChart from './ApexChart.svelte';
	import RecordDetailModal from './RecordDetailModal.svelte';
	import { AUTO_RETRAIN_THRESHOLD } from '$lib/constants';
	import type { StudentArchive, PracticeRecord, Suggestion } from '$lib/types';

	export let open = false;
	export let archive: StudentArchive | null = null;
	export let suggestions: Suggestion[] = [];

	let detailModalOpen = false;
	let selectedRecord: PracticeRecord | null = null;

	function openRecordDetail(record: PracticeRecord) {
		selectedRecord = record;
		detailModalOpen = true;
	}

	function editRecord(id: string) {
		open = false;
		goto(`/edit?id=${id}`);
	}

	$: trendChartOptions = archive
		? {
				chart: { type: 'line', height: 280, toolbar: { show: false } },
				title: { text: '阶段性扣分趋势', align: 'center' },
				stroke: { curve: 'smooth', width: 2 },
				markers: { size: 5 },
				xaxis: { categories: archive.trendData.map((d) => d.date), labels: { rotate: -45 } },
				yaxis: { title: { text: '平均扣分' }, min: 0, max: 20 },
				series: [{ name: '平均扣分', data: archive.trendData.map((d) => d.avgDeduct) }],
				colors: ['#8b5cf6']
			}
		: {};

	$: errorChartOptions = archive
		? {
				chart: { type: 'pie', height: 280 },
				title: { text: '常见失误类型分布', align: 'center' },
				labels: archive.errorTypeStats.map((s) => s.type),
				series: archive.errorTypeStats.map((s) => s.count),
				responsive: [{ breakpoint: 480, options: { chart: { width: 280 } } }]
			}
		: {};

	function getDeductBadgeClass(count: number): string {
		if (count === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (count <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}

	function getImprovementTrend(): { label: string; class: string } {
		if (!archive || archive.trendData.length < 2) {
			return { label: '数据不足', class: 'bg-gray-100 text-gray-600 border border-gray-300' };
		}
		const recent = archive.trendData.slice(-3);
		const earlier = archive.trendData.slice(0, 3);
		const recentAvg = recent.reduce((s, d) => s + d.avgDeduct, 0) / recent.length;
		const earlierAvg = earlier.reduce((s, d) => s + d.avgDeduct, 0) / earlier.length;

		if (recentAvg < earlierAvg - 2) {
			return { label: '明显进步 ↓', class: 'bg-green-100 text-green-800 border border-green-300' };
		} else if (recentAvg > earlierAvg + 2) {
			return { label: '有所退步 ↑', class: 'bg-red-100 text-red-800 border border-red-300' };
		}
		return { label: '稳定 →', class: 'bg-yellow-100 text-yellow-800 border border-yellow-300' };
	}
</script>

<BaseModal bind:open width="max-w-5xl">
	{#if archive}
		<div class="p-6 text-gray-900">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl font-bold text-gray-900">{archive.studentName} - 成长档案</h3>
					<p class="text-sm text-gray-500 mt-1">
						首次练习：{archive.firstPracticeDate} · 最近练习：{archive.lastPracticeDate}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block px-3 py-1 rounded text-sm font-bold {getImprovementTrend().class}">
						{getImprovementTrend().label}
					</span>
					<button
						class="p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
						on:click={() => (open = false)}
						aria-label="关闭"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">练习总次数</p>
					<p class="text-2xl font-bold text-gray-900">{archive.totalPractices}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">补训次数</p>
					<p class="text-2xl font-bold text-orange-600">{archive.retrainCount}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">总扣分</p>
					<p class="text-2xl font-bold {getDeductBadgeClass(archive.totalDeduct).includes('red') ? 'text-red-600' : getDeductBadgeClass(archive.totalDeduct).includes('yellow') ? 'text-yellow-600' : 'text-green-600'}">
						{archive.totalDeduct}
					</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">平均扣分</p>
					<p class="text-2xl font-bold {getDeductBadgeClass(archive.avgDeduct).includes('red') ? 'text-red-600' : getDeductBadgeClass(archive.avgDeduct).includes('yellow') ? 'text-yellow-600' : 'text-green-600'}">
						{archive.avgDeduct}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div class="bg-white rounded-lg p-4 border border-gray-200">
					{#if archive.trendData.length > 0}
						<ApexChart options={trendChartOptions} />
					{:else}
						<div class="h-[280px] flex items-center justify-center text-gray-500">
							暂无趋势数据
						</div>
					{/if}
				</div>
				<div class="bg-white rounded-lg p-4 border border-gray-200">
					{#if archive.errorTypeStats.length > 0}
						<ApexChart options={errorChartOptions} />
					{:else}
						<div class="h-[280px] flex items-center justify-center text-gray-500">
							暂无失误数据
						</div>
					{/if}
				</div>
			</div>

			<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
				<h4 class="font-semibold text-lg mb-3 text-gray-900">各训练项目表现</h4>
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm text-gray-800">
						<thead>
							<tr class="border-b border-gray-200">
								<th class="text-left p-3 font-semibold text-gray-900">训练项目</th>
								<th class="text-left p-3 font-semibold text-gray-900">练习次数</th>
								<th class="text-left p-3 font-semibold text-gray-900">平均扣分</th>
								<th class="text-left p-3 font-semibold text-gray-900">补训次数</th>
							</tr>
						</thead>
						<tbody>
							{#each archive.itemStats as stat}
								<tr class="border-b border-gray-100">
									<td class="p-3 font-medium">{stat.item}</td>
									<td class="p-3">{stat.count} 次</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(stat.avgDeduct)}">
											{stat.avgDeduct} 分
										</span>
									</td>
									<td class="p-3">
										{#if stat.retrainCount > 0}
											<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
												{stat.retrainCount} 次
											</span>
										{:else}
											<span class="text-gray-400">-</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			{#if archive.commonSuggestions.length > 0}
				<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
					<h4 class="font-semibold text-lg mb-3 text-gray-900">常用复盘建议</h4>
					<div class="space-y-2">
						{#each archive.commonSuggestions as s, index}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-100">
								<span class="text-blue-600 font-bold min-w-[28px]">{index + 1}.</span>
								<p class="flex-1 text-sm text-gray-800">{s.content}</p>
								<span class="inline-block px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
									使用 {s.count} 次
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
				<h4 class="font-semibold text-lg mb-3 text-gray-900">历次练习记录</h4>
				<div class="overflow-x-auto max-h-80 overflow-y-auto">
					<table class="w-full border-collapse text-sm text-gray-800">
						<thead class="sticky top-0 bg-white">
							<tr class="border-b border-gray-200">
								<th class="text-left p-3 font-semibold text-gray-900">记录编号</th>
								<th class="text-left p-3 font-semibold text-gray-900">练习日期</th>
								<th class="text-left p-3 font-semibold text-gray-900">训练项目</th>
								<th class="text-left p-3 font-semibold text-gray-900">扣分</th>
								<th class="text-left p-3 font-semibold text-gray-900">主要失误</th>
								<th class="text-left p-3 font-semibold text-gray-900">补训</th>
								<th class="text-left p-3 font-semibold text-gray-900">操作</th>
							</tr>
						</thead>
						<tbody>
							{#each archive.records as record}
								<tr class="border-b border-gray-100 hover:bg-gray-50">
									<td class="p-3 font-mono">{record.recordNo}</td>
									<td class="p-3">{record.practiceDate}</td>
									<td class="p-3">{record.trainingItem}</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(record.deductCount)}">
											{record.deductCount} 分
										</span>
									</td>
									<td class="p-3">{record.mainErrorType}</td>
									<td class="p-3">
										{#if record.needRetraining}
											<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">是</span>
										{:else}
											<span class="text-gray-400">否</span>
										{/if}
									</td>
									<td class="p-3">
										<div class="flex gap-2">
											<button
												class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
												on:click={() => openRecordDetail(record)}
											>
												详情
											</button>
											<button
												class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
												on:click={() => editRecord(record.id)}
											>
												编辑
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div class="flex justify-end pt-4 border-t border-gray-200">
				<button
					class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
					on:click={() => (open = false)}
				>
					关闭
				</button>
			</div>
		</div>
	{/if}
</BaseModal>

<RecordDetailModal
	bind:open={detailModalOpen}
	bind:record={selectedRecord}
	{suggestions}
/>
