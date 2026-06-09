<script lang="ts">
	import { goto } from '$app/navigation';
	import BaseModal from './BaseModal.svelte';
	import ApexChart from './ApexChart.svelte';
	import {
		WARNING_LEVEL_LABELS,
		WARNING_SCOPE_LABELS
	} from '$lib/constants';
	import { acknowledgeWarning, getRecords } from '$lib/storage';
	import {
		getWarningLevelBadgeClass,
		getTrendDirectionClass,
		getTrendDirectionLabel,
		getPriorityClass,
		getPriorityLabel,
		getDeductBadgeClass,
		getWarningLevelTextClass,
		getAvgDeductTextClass,
		getRetrainRateTextClass,
		buildStudentArchiveUrl,
		buildStatsUrl,
		buildHomeWithRecordUrl
	} from '$lib/utils';
	import type { WarningRecord, PracticeRecord } from '$lib/types';

	export let open = false;
	export let warning: WarningRecord | null = null;

	let relatedRecords: PracticeRecord[] = [];

	$: {
		if (warning && warning.recordIds.length > 0) {
			const all = getRecords();
			relatedRecords = all.filter((r) => warning!.recordIds.includes(r.id));
		} else {
			relatedRecords = [];
		}
	}



	$: trendChartOptions = warning && warning.trendHistory.length > 0
		? {
				chart: { type: 'line', height: 280, toolbar: { show: false } },
				title: { text: '预警等级变化趋势', align: 'center' },
				stroke: { curve: 'smooth', width: 2 },
				markers: { size: 6 },
				xaxis: { categories: warning.trendHistory.map((t) => t.date), labels: { rotate: -45 } },
				yaxis: { title: { text: '综合评分' }, min: 0, max: 100 },
				series: [
					{
						name: '综合评分',
						data: warning.trendHistory.map((t) => t.score)
					}
				],
				colors: ['#8b5cf6'],
				annotations: {
					yaxis: [
						{ y: 70, borderColor: '#22c55e', label: { text: '稳定线', style: { color: '#22c55e' } } },
						{ y: 40, borderColor: '#ef4444', label: { text: '预警线', style: { color: '#ef4444' } } }
					]
				}
			}
		: null;

	function handleAcknowledge() {
		if (!warning) return;
		acknowledgeWarning(warning.id);
		warning = { ...warning, acknowledged: true, acknowledgedAt: Date.now() };
	}

	function goToStudentArchive() {
		if (!warning) return;
		open = false;
		goto(buildStudentArchiveUrl(warning.studentName));
	}

	function goToStats() {
		open = false;
		goto(buildStatsUrl());
	}

	function openRecordDetail(record: PracticeRecord) {
		open = false;
		goto(buildHomeWithRecordUrl(record.id));
	}
</script>

<BaseModal bind:open width="max-w-5xl">
	{#if warning}
		<div class="p-6 text-gray-900">
			<div class="flex items-start justify-between mb-6">
				<div>
					<div class="flex items-center gap-3 mb-2">
						<h3 class="text-xl font-bold text-gray-900">
							{warning.scope === 'student' ? '学员' : '项目'}阶段测评报告
						</h3>
						<span class="inline-block px-3 py-1 rounded text-sm font-bold {getWarningLevelBadgeClass(warning.level)}">
							{WARNING_LEVEL_LABELS[warning.level]}
						</span>
						{#if warning.acknowledged}
							<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
								已确认
							</span>
						{/if}
					</div>
					<p class="text-sm text-gray-500">
						{warning.studentName}
						{#if warning.trainingItem}
							· {warning.trainingItem}
						{/if}
						 · 评估周期：{warning.periodStart} ~ {warning.periodEnd}
					</p>
				</div>
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

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">综合评分</p>
					<p class="text-2xl font-bold {getWarningLevelTextClass(warning.level)}">
						{warning.score} 分
					</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">练习次数</p>
					<p class="text-2xl font-bold text-gray-900">{warning.practiceCount}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">平均扣分</p>
					<p class="text-2xl font-bold {getAvgDeductTextClass(warning.avgDeduct)}">
						{warning.avgDeduct}
					</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">补训率</p>
					<p class="text-2xl font-bold {getRetrainRateTextClass(warning.retrainRate)}">
						{(warning.retrainRate * 100).toFixed(0)}%
					</p>
				</div>
			</div>

			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
				<p class="text-xs text-gray-500 mb-1">近阶段趋势</p>
				<p class="text-lg font-semibold {getTrendDirectionClass(warning.trendDirection)}">
					{getTrendDirectionLabel(warning.trendDirection)}
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div class="bg-white rounded-lg p-4 border border-gray-200">
					{#if trendChartOptions}
						<ApexChart options={trendChartOptions} />
					{:else}
						<div class="h-[280px] flex items-center justify-center text-gray-500">
							暂无趋势数据（需至少1周数据）
						</div>
					{/if}
				</div>
				<div class="bg-white rounded-lg p-4 border border-gray-200">
					<h4 class="font-semibold text-lg mb-3 text-gray-900">高频失误类型</h4>
					{#if warning.topErrorTypes.length > 0}
						<div class="space-y-3">
							{#each warning.topErrorTypes as err}
								<div>
									<div class="flex items-center justify-between mb-1">
										<span class="text-sm font-medium text-gray-700">{err.type}</span>
										<span class="text-sm text-gray-500">{err.count} 次 ({(err.rate * 100).toFixed(0)}%)</span>
									</div>
									<div class="w-full bg-gray-200 rounded-full h-2.5">
										<div
											class="h-2.5 rounded-full {err.rate >= 0.4 ? 'bg-red-500' : err.rate >= 0.25 ? 'bg-yellow-500' : 'bg-blue-500'}"
											style="width: {Math.min(err.rate * 100, 100)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500">暂无失误数据</p>
					{/if}
				</div>
			</div>

			<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
				<h4 class="font-semibold text-lg mb-3 text-gray-900">预警原因分析</h4>
				{#if warning.reasons.length > 0}
					<div class="space-y-2">
						{#each warning.reasons as reason}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-100">
								<div
									class="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 {reason.weight > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}"
								>
									{reason.weight > 0 ? '!' : '✓'}
								</div>
								<div class="flex-1">
									<p class="text-sm text-gray-800">{reason.description}</p>
									<p class="text-xs text-gray-500 mt-1">
										影响权重：{reason.weight > 0 ? '+' : ''}{reason.weight}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500">暂无预警原因</p>
				{/if}
			</div>

			<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
				<h4 class="font-semibold text-lg mb-3 text-gray-900">推荐复训建议</h4>
				{#if warning.suggestions.length > 0}
					<div class="space-y-2">
						{#each warning.suggestions as sug, index}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-100">
								<span class="text-blue-600 font-bold min-w-[28px]">{index + 1}.</span>
								<div class="flex-1">
									<p class="text-sm text-gray-800">{sug.content}</p>
									{#if sug.errorType}
										<p class="text-xs text-gray-500 mt-1">针对失误类型：{sug.errorType}</p>
									{/if}
								</div>
								<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getPriorityClass(sug.priority)} shrink-0">
									{getPriorityLabel(sug.priority)}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500">暂无复训建议</p>
				{/if}
			</div>

			{#if relatedRecords.length > 0}
				<div class="bg-white rounded-lg p-4 border border-gray-200 mb-6">
					<h4 class="font-semibold text-lg mb-3 text-gray-900">关联练习记录（{relatedRecords.length} 条）</h4>
					<div class="overflow-x-auto max-h-60 overflow-y-auto">
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
								{#each relatedRecords as record}
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
											<button
												class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
												on:click={() => openRecordDetail(record)}
											>
												查看详情
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
				<div class="flex gap-2">
					{#if !warning.acknowledged}
						<button
							class="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 cursor-pointer font-medium inline-flex items-center gap-2"
							on:click={handleAcknowledge}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							确认已阅
						</button>
					{/if}
				</div>
				<div class="flex gap-2">
					<button
						class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
						on:click={() => (open = false)}
					>
						关闭
					</button>
					<button
						class="px-4 py-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer font-medium inline-flex items-center gap-2"
						on:click={goToStats}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						查看统计
					</button>
					<button
						class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-medium inline-flex items-center gap-2"
						on:click={goToStudentArchive}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						学员档案
					</button>
				</div>
			</div>
		</div>
	{/if}
</BaseModal>
