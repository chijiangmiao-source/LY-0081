<script lang="ts">
	import { goto } from '$app/navigation';
	import BaseModal from './BaseModal.svelte';
	import WarningDetailModal from './WarningDetailModal.svelte';
	import { updateRecord, getWarningsByStudent, getWarnings } from '$lib/storage';
	import { AUTO_RETRAIN_THRESHOLD, WARNING_LEVEL_LABELS } from '$lib/constants';
	import type { PracticeRecord, Suggestion, ErrorType, WarningRecord } from '$lib/types';

	export let open = false;
	export let record: PracticeRecord | null = null;
	export let suggestions: Suggestion[] = [];

	let copySuccess = false;
	let applySuccessMsg = '';
	let matchedSuggestions: Suggestion[] = [];

	let studentWarnings: WarningRecord[] = [];
	let relatedWarnings: WarningRecord[] = [];
	let warningDetailOpen = false;
	let selectedWarning: WarningRecord | null = null;

	$: {
		if (record) {
			studentWarnings = getWarningsByStudent(record.studentName);
			const allWarnings = getWarnings();
			relatedWarnings = allWarnings.filter((w) => w.recordIds.includes(record!.id));
		} else {
			studentWarnings = [];
			relatedWarnings = [];
		}
	}

	function getLatestWarning(): WarningRecord | null {
		if (studentWarnings.length === 0) return null;
		return studentWarnings[0];
	}

	function openWarningDetail(warning: WarningRecord) {
		selectedWarning = warning;
		warningDetailOpen = true;
	}

	function goToWarningCenter() {
		open = false;
		goto('/warnings');
	}

	function goToWarningCenterForStudent() {
		open = false;
		if (record) {
			goto(`/warnings?student=${encodeURIComponent(record.studentName)}`);
		}
	}

	function getWarningLevelBadgeClass(level: string): string {
		switch (level) {
			case 'stable':
				return 'bg-green-100 text-green-800 border border-green-300';
			case 'attention':
				return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
			case 'alert':
				return 'bg-red-100 text-red-800 border border-red-300';
			default:
				return 'bg-gray-100 text-gray-800 border border-gray-300';
		}
	}

	$: {
		matchedSuggestions = record ? suggestions.filter((s) => s.errorType === record!.mainErrorType) : [];
	}

	function handleEdit() {
		if (record) {
			open = false;
			goto(`/edit?id=${record.id}`);
		}
	}

	function handleViewStudentArchive() {
		if (record) {
			open = false;
			goto(`/students?student=${encodeURIComponent(record.studentName)}`);
		}
	}

	function handleCopySuggestion() {
		if (!record?.improvementSuggestion) return;
		navigator.clipboard.writeText(record.improvementSuggestion).then(() => {
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		});
	}

	function handleToggleRetraining() {
		if (!record) return;
		const newNeedRetraining = !record.needRetraining;
		if (record.deductCount > AUTO_RETRAIN_THRESHOLD && !newNeedRetraining) {
			alert(`扣分次数大于 ${AUTO_RETRAIN_THRESHOLD} 时必须补训`);
			return;
		}
		record = { ...record, needRetraining: newNeedRetraining, updatedAt: Date.now() };
		updateRecord(record);
	}

	function handleApplySuggestion(suggestion: Suggestion) {
		if (!record) return;
		const existingSuggestions = record.improvementSuggestion?.trim() || '';
		const newContent = suggestion.content.trim();

		let finalSuggestion = existingSuggestions;
		if (!existingSuggestions) {
			finalSuggestion = newContent;
		} else if (!existingSuggestions.includes(newContent)) {
			finalSuggestion = `${existingSuggestions}\n\n• ${newContent}`;
		} else {
			applySuccessMsg = '该建议已存在，无需重复添加';
			setTimeout(() => {
				applySuccessMsg = '';
			}, 2000);
			return;
		}

		record = {
			...record,
			improvementSuggestion: finalSuggestion,
			updatedAt: Date.now()
		};
		updateRecord(record);
		applySuccessMsg = '建议已追加到改进建议中';
		setTimeout(() => {
			applySuccessMsg = '';
		}, 2000);
	}

	function getDeductBadgeClass(count: number): string {
		if (count === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (count <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}
</script>

<BaseModal bind:open width="max-w-3xl">
	{#if record}
		<div class="p-6 text-gray-900">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl font-bold text-gray-900">练习记录详情</h3>
					<p class="text-sm text-gray-500 mt-1">
						记录编号：<span class="font-mono">{record.recordNo}</span>
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
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">学员姓名</p>
					<p class="font-semibold text-gray-900">{record.studentName}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">练习日期</p>
					<p class="font-semibold text-gray-900">{record.practiceDate}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">训练项目</p>
					<p class="font-semibold text-gray-900">{record.trainingItem}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">扣分次数</p>
					<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(record.deductCount)}">
						{record.deductCount} 分
					</span>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">主要失误类型</p>
					<span class="inline-block px-3 py-1 rounded text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200">
						{record.mainErrorType}
					</span>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
					<p class="text-xs text-gray-500 mb-1">补训状态</p>
					<div class="flex items-center gap-2">
						{#if record.needRetraining}
							<span class="inline-block px-3 py-1 rounded text-sm font-bold bg-orange-100 text-orange-800 border border-orange-300">需补训</span>
						{:else}
							<span class="inline-block px-3 py-1 rounded text-sm font-bold bg-green-50 text-green-700 border border-green-200">无需补训</span>
						{/if}
						<button
							class="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 cursor-pointer text-gray-700"
							on:click={handleToggleRetraining}
						>
							{record.needRetraining ? '标记已完成' : '标记需补训'}
						</button>
					</div>
				</div>
			</div>

			{#if getLatestWarning() || relatedWarnings.length > 0}
				<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6">
					<div class="flex items-start justify-between flex-wrap gap-3">
						<div class="flex items-center gap-3">
							<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							<div>
								<p class="text-sm font-semibold text-gray-700">阶段测评预警</p>
								{#if getLatestWarning()}
									<div class="flex items-center gap-2 mt-1 flex-wrap">
										<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(getLatestWarning()!.level)}">
											{WARNING_LEVEL_LABELS[getLatestWarning()!.level]}
										</span>
										<span class="text-sm text-gray-600">
											综合评分 {getLatestWarning()!.score} 分
										</span>
										<span class="text-xs text-gray-500">
											{getLatestWarning()!.periodStart} ~ {getLatestWarning()!.periodEnd}
										</span>
									</div>
								{/if}
								{#if relatedWarnings.length > 0}
									<p class="text-xs text-indigo-600 mt-1">
										该记录关联 {relatedWarnings.length} 条阶段测评
									</p>
								{/if}
							</div>
						</div>
						<div class="flex gap-2 flex-wrap">
							{#if getLatestWarning()}
								<button
									class="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer font-medium inline-flex items-center gap-1"
									on:click={() => openWarningDetail(getLatestWarning()!)}
								>
									查看最新测评
								</button>
							{/if}
							<button
								class="px-3 py-1.5 text-sm rounded bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 cursor-pointer font-medium"
								on:click={goToWarningCenterForStudent}
							>
								该学员全部预警
							</button>
						</div>
					</div>
					{#if relatedWarnings.length > 0}
						<div class="mt-3 pt-3 border-t border-indigo-200">
							<p class="text-xs font-medium text-gray-600 mb-2">关联的阶段测评：</p>
							<div class="flex flex-wrap gap-2">
								{#each relatedWarnings as rw}
									<button
										class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer"
										on:click={() => openWarningDetail(rw)}
									>
										<span class="font-bold {getWarningLevelBadgeClass(rw.level)} px-1.5 py-0.5 rounded">
											{WARNING_LEVEL_LABELS[rw.level]}
										</span>
										{#if rw.trainingItem}
											<span class="text-gray-600">{rw.trainingItem}</span>
										{:else}
											<span class="text-gray-600">学员综合</span>
										{/if}
										<span class="text-gray-400">·</span>
										<span class="text-gray-500">{rw.periodStart}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm font-semibold text-gray-900">教练评语</p>
					</div>
					<p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{record.coachComment || '-'}</p>
				</div>
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm font-semibold text-gray-900">改进建议</p>
						<button
							class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer flex items-center gap-1"
							on:click={handleCopySuggestion}
							disabled={!record.improvementSuggestion}
						>
							{#if copySuccess}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								已复制
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
								</svg>
								复制
							{/if}
						</button>
					</div>
					<p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{record.improvementSuggestion || '-'}</p>
				</div>
			</div>

			{#if matchedSuggestions.length > 0}
				<div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
					<div class="flex items-center gap-2 mb-3">
						<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-sm font-semibold text-gray-900">该失误类型的相关建议</p>
						<span class="text-xs text-gray-500">（可追加到改进建议中）</span>
					</div>
					{#if applySuccessMsg}
						<div class="mb-3 p-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
							{applySuccessMsg}
						</div>
					{/if}
					<div class="space-y-2">
						{#each matchedSuggestions as s, index}
							<div class="flex items-start gap-3 p-3 bg-white rounded border border-gray-200">
								<span class="text-blue-600 font-bold min-w-[24px]">{index + 1}.</span>
								<p class="flex-1 text-sm text-gray-800">{s.content}</p>
								<button
									class="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shrink-0"
									on:click={() => handleApplySuggestion(s)}
								>
									追加
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
				<button
					class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
					on:click={() => (open = false)}
				>
					关闭
				</button>
				<button
					class="px-4 py-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer font-medium inline-flex items-center gap-2"
					on:click={handleViewStudentArchive}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
					查看学员档案
				</button>
				<button
					class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-medium inline-flex items-center gap-2"
					on:click={handleEdit}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					编辑记录
				</button>
			</div>
		</div>
	{/if}
</BaseModal>

<WarningDetailModal
	bind:open={warningDetailOpen}
	bind:warning={selectedWarning}
/>
