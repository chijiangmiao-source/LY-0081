<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BaseModal from '$lib/components/BaseModal.svelte';
	import RecordDetailModal from '$lib/components/RecordDetailModal.svelte';
	import WarningDetailModal from '$lib/components/WarningDetailModal.svelte';
	import {
		getSuggestions,
		addSuggestion,
		updateSuggestion,
		deleteSuggestion,
		generateId,
		getRecords,
		updateRecord,
		getSuggestionUsage,
		getWarningsFiltered,
		getWarningsBySuggestion
	} from '$lib/storage';
	import { ERROR_TYPES, WARNING_LEVEL_LABELS } from '$lib/constants';
	import {
		getWarningLevelBadgeClass,
		getDeductBadgeClass,
		appendSuggestion,
		buildWarningsUrl,
		buildStudentArchiveUrl
	} from '$lib/utils';
	import type { Suggestion, ErrorType, PracticeRecord, SuggestionUsage, WarningRecord } from '$lib/types';

	let suggestions: Suggestion[] = [];
	let allRecords: PracticeRecord[] = [];
	let modalOpen = false;
	let editingSuggestion: Suggestion | null = null;

	let applyModalOpen = false;
	let applyingSuggestion: Suggestion | null = null;
	let recordsByErrorType: PracticeRecord[] = [];
	let selectedRecordId: string = '';
	let applySuccessMsg = '';

	let detailModalOpen = false;
	let selectedRecord: PracticeRecord | null = null;

	let usageModalOpen = false;
	let selectedSuggestionUsage: SuggestionUsage | null = null;
	let allSuggestionUsage: SuggestionUsage[] = [];

	let warningStudents = new Map<string, WarningRecord[]>();
	let suggestionRelatedWarnings: { warning: WarningRecord; matchCount: number }[] = [];
	let warningDetailOpen = false;
	let selectedWarning: WarningRecord | null = null;

	let form = {
		errorType: ERROR_TYPES[0] as ErrorType,
		content: ''
	};

	let errors: Record<string, string> = {};

	onMount(() => {
		loadSuggestions();
		loadRecords();
		loadUsageData();
		loadWarningStudents();
	});

	function loadSuggestions() {
		suggestions = getSuggestions().sort((a, b) => b.createdAt - a.createdAt);
	}

	function loadRecords() {
		allRecords = getRecords().sort((a, b) => b.createdAt - a.createdAt);
	}

	function loadUsageData() {
		allSuggestionUsage = getSuggestionUsage();
	}

	function loadWarningStudents() {
		const alerts = getWarningsFiltered({ level: 'alert' });
		const attentions = getWarningsFiltered({ level: 'attention' });
		const allWarnings = [...alerts, ...attentions];
		const map = new Map<string, WarningRecord[]>();
		allWarnings.forEach((w) => {
			const existing = map.get(w.studentName) || [];
			existing.push(w);
			map.set(w.studentName, existing);
		});
		warningStudents = map;
	}

	function openAdd() {
		editingSuggestion = null;
		form = { errorType: ERROR_TYPES[0], content: '' };
		errors = {};
		modalOpen = true;
	}

	function openEdit(s: Suggestion) {
		editingSuggestion = s;
		form = { errorType: s.errorType, content: s.content };
		errors = {};
		modalOpen = true;
	}

	function validate(): boolean {
		errors = {};
		if (!form.errorType) {
			errors.errorType = '请选择失误类型';
		}
		if (!form.content.trim()) {
			errors.content = '请输入建议内容';
		}
		return Object.keys(errors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;

		if (editingSuggestion) {
			updateSuggestion({
				...editingSuggestion,
				errorType: form.errorType,
				content: form.content.trim()
			});
		} else {
			addSuggestion({
				id: generateId(),
				errorType: form.errorType,
				content: form.content.trim(),
				createdAt: Date.now()
			});
		}
		loadSuggestions();
		modalOpen = false;
	}

	function handleDelete(id: string) {
		if (confirm('确定删除该条建议吗？')) {
			deleteSuggestion(id);
			loadSuggestions();
		}
	}

	function getSuggestionsByErrorType(type: ErrorType): Suggestion[] {
		return suggestions.filter((s) => s.errorType === type);
	}

	function getRecordsByErrorType(type: ErrorType): PracticeRecord[] {
		return allRecords.filter((r) => r.mainErrorType === type);
	}

	function openApplyModal(s: Suggestion) {
		applyingSuggestion = s;
		recordsByErrorType = getRecordsByErrorType(s.errorType);
		selectedRecordId = '';
		applySuccessMsg = '';
		applyModalOpen = true;
	}

	function applySuggestionToRecord() {
		if (!applyingSuggestion || !selectedRecordId) return;
		const record = allRecords.find((r) => r.id === selectedRecordId);
		if (!record) return;

		const result = appendSuggestion(record.improvementSuggestion || '', applyingSuggestion.content);
		if (result.isDuplicate) {
			applySuccessMsg = `该建议在记录 ${record.recordNo} 中已存在，无需重复添加`;
			setTimeout(() => {
				applySuccessMsg = '';
			}, 3000);
			return;
		}

		updateRecord({
			...record,
			improvementSuggestion: result.finalSuggestion,
			updatedAt: Date.now()
		});

		applySuccessMsg = `建议已成功追加到记录 ${record.recordNo}`;
		loadRecords();
		setTimeout(() => {
			applySuccessMsg = '';
		}, 3000);
	}

	function openRecordDetail(record: PracticeRecord) {
		selectedRecord = record;
		detailModalOpen = true;
	}

	function openUsageModal(s: Suggestion) {
		const usage = allSuggestionUsage.find((u) => u.suggestionId === s.id);
		if (usage) {
			selectedSuggestionUsage = usage;
		} else {
			selectedSuggestionUsage = {
				suggestionId: s.id,
				suggestionContent: s.content,
				errorType: s.errorType,
				usageByStudent: [],
				totalUsage: 0
			};
		}
		suggestionRelatedWarnings = getWarningsBySuggestion(s.id);
		usageModalOpen = true;
	}

	function openWarningDetail(warning: WarningRecord) {
		selectedWarning = warning;
		warningDetailOpen = true;
	}

	function goToWarningsForStudent(studentName: string) {
		usageModalOpen = false;
		goto(buildWarningsUrl({ student: studentName }));
	}

	function getStudentWarningLevel(studentName: string): WarningRecord | null {
		const warnings = warningStudents.get(studentName);
		if (!warnings || warnings.length === 0) return null;
		const alerts = warnings.filter((w) => w.level === 'alert');
		if (alerts.length > 0) return alerts[0];
		const attentions = warnings.filter((w) => w.level === 'attention');
		if (attentions.length > 0) return attentions[0];
		return warnings[0];
	}

	function getWarningStudentsUsingThis(): { studentName: string; count: number; warning: WarningRecord }[] {
		if (!selectedSuggestionUsage) return [];
		const result: { studentName: string; count: number; warning: WarningRecord }[] = [];
		selectedSuggestionUsage.usageByStudent.forEach((usage) => {
			const warning = getStudentWarningLevel(usage.studentName);
			if (warning) {
				result.push({ studentName: usage.studentName, count: usage.count, warning });
			}
		});
		return result.sort((a, b) => {
			const levelOrder = { alert: 0, attention: 1, stable: 2 };
			if (levelOrder[a.warning.level] !== levelOrder[b.warning.level]) {
				return levelOrder[a.warning.level] - levelOrder[b.warning.level];
			}
			return b.count - a.count;
		});
	}

	function goToStudentArchive(studentName: string) {
		usageModalOpen = false;
		goto(buildStudentArchiveUrl(studentName));
	}
</script>

<svelte:head>
	<title>复盘建议维护 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900">复盘建议维护</h2>
		<button
			class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer font-medium"
			on:click={openAdd}
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			新增建议
		</button>
	</div>

	{#if suggestions.length === 0}
		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<div class="text-center py-12 text-gray-500">
				<p class="text-lg mb-2">暂无复盘建议</p>
				<p class="text-sm">新增建议后，在录入练习记录时选择失误类型会自动填充建议</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			{#each ERROR_TYPES as errorType}
				{@const typeSuggestions = getSuggestionsByErrorType(errorType)}
				{#if typeSuggestions.length > 0}
					<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
						<h3 class="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-900">
							<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
								{errorType}
							</span>
							<span class="text-sm text-gray-500">({typeSuggestions.length} 条建议)</span>
						</h3>
						<div class="space-y-2">
							{#each typeSuggestions as s, index}
								<div class="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-100">
									<span class="text-blue-600 font-bold min-w-[24px]">{index + 1}.</span>
									<p class="flex-1 text-gray-800">{s.content}</p>
								<div class="flex gap-2 shrink-0">
										<button
											class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
											on:click={() => openUsageModal(s)}
										>
											使用情况
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer"
											on:click={() => openApplyModal(s)}
										>
											引用
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
											on:click={() => openEdit(s)}
										>
											编辑
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
											on:click={() => handleDelete(s.id)}
										>
											删除
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<h3 class="font-semibold text-lg mb-4 text-gray-900">全部建议列表</h3>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm text-gray-800">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left p-3 font-semibold text-gray-900">失误类型</th>
							<th class="text-left p-3 font-semibold text-gray-900">建议内容</th>
							<th class="text-left p-3 font-semibold text-gray-900">创建时间</th>
							<th class="text-left p-3 font-semibold text-gray-900">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each suggestions as s}
							<tr class="border-b border-gray-100 hover:bg-gray-50">
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
										{s.errorType}
									</span>
								</td>
								<td class="p-3 max-w-md">{s.content}</td>
								<td class="p-3 text-sm text-gray-500">
									{new Date(s.createdAt).toLocaleDateString('zh-CN')}
								</td>
								<td class="p-3">
									<div class="flex gap-2">
										<button
											class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
											on:click={() => openUsageModal(s)}
										>
											使用情况
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer"
											on:click={() => openApplyModal(s)}
										>
											引用
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
											on:click={() => openEdit(s)}
										>
											编辑
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
											on:click={() => handleDelete(s.id)}
										>
											删除
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<BaseModal bind:open={modalOpen} width="max-w-lg">
	<div class="p-5 text-gray-900">
		<h3 class="text-lg font-bold mb-4 text-gray-900">{editingSuggestion ? '编辑建议' : '新增建议'}</h3>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium mb-1 text-gray-700">失误类型</label>
				<select
					bind:value={form.errorType}
					class="w-full px-3 py-2 rounded border {errors.errorType ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each ERROR_TYPES as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
				{#if errors.errorType}
					<p class="text-xs text-red-500 mt-1">{errors.errorType}</p>
				{/if}
			</div>
			<div>
				<label class="block text-sm font-medium mb-1 text-gray-700">建议内容</label>
				<textarea
					bind:value={form.content}
					rows={4}
					placeholder="针对该失误类型的改进建议..."
					class="w-full px-3 py-2 rounded border {errors.content ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
				></textarea>
				{#if errors.content}
					<p class="text-xs text-red-500 mt-1">{errors.content}</p>
				{/if}
			</div>
			<div class="flex justify-end gap-2 pt-2">
				<button
					class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
					on:click={() => (modalOpen = false)}
				>
					取消
				</button>
				<button
					class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-medium"
					on:click={handleSave}
				>
					{editingSuggestion ? '保存修改' : '创建建议'}
				</button>
			</div>
		</div>
	</div>
</BaseModal>

<BaseModal bind:open={applyModalOpen} width="max-w-2xl">
	<div class="p-5 text-gray-900">
		<h3 class="text-lg font-bold mb-2 text-gray-900">引用建议到练习记录（追加模式）</h3>
		{#if applyingSuggestion}
			<div class="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
				<div class="flex items-center gap-2 mb-2">
					<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
						{applyingSuggestion.errorType}
					</span>
				</div>
				<p class="text-sm text-gray-800">{applyingSuggestion.content}</p>
			</div>
		{/if}

		{#if applySuccessMsg}
			<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
				{applySuccessMsg}
			</div>
		{/if}

		<div class="mb-3">
			<p class="text-sm font-medium mb-2 text-gray-700">
				选择要追加建议的练习记录（同失误类型：
				{applyingSuggestion?.errorType || '-'}，共 {recordsByErrorType.length} 条）：
			</p>
		</div>

		{#if recordsByErrorType.length === 0}
			<div class="py-8 text-center text-gray-500">
				<p>暂无该失误类型的练习记录</p>
			</div>
		{:else}
			<div class="max-h-80 overflow-y-auto border border-gray-200 rounded">
				<div class="space-y-1 p-2">
					{#each recordsByErrorType as record}
						<label
							class="flex items-center gap-3 p-3 rounded hover:bg-gray-50 cursor-pointer border {selectedRecordId === record.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'}"
						>
							<input
								type="radio"
								bind:group={selectedRecordId}
								value={record.id}
								class="w-4 h-4 cursor-pointer text-blue-600"
							/>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-mono text-sm">{record.recordNo}</span>
									<span class="text-sm font-medium text-gray-900">{record.studentName}</span>
									<span class="text-sm text-gray-500">{record.practiceDate}</span>
									<span class="text-sm text-gray-800">{record.trainingItem}</span>
									<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getDeductBadgeClass(record.deductCount)}">
										{record.deductCount} 分
									</span>
								</div>
								<p class="text-xs text-gray-500 mt-1 truncate">
									当前建议：{record.improvementSuggestion || '（无）'}
								</p>
							</div>
							<button
								type="button"
								class="px-2 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer shrink-0"
								on:click|stopPropagation={() => openRecordDetail(record)}
							>
								查看
							</button>
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
			<button
				class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
				on:click={() => (applyModalOpen = false)}
			>
				关闭
			</button>
			<button
				class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				on:click={applySuggestionToRecord}
				disabled={!selectedRecordId}
			>
				追加建议
			</button>
		</div>
	</div>
</BaseModal>

<BaseModal bind:open={usageModalOpen} width="max-w-2xl">
	<div class="p-5 text-gray-900">
		<div class="flex items-start justify-between mb-4">
			<div>
				<h3 class="text-lg font-bold mb-2 text-gray-900">建议使用情况</h3>
				{#if selectedSuggestionUsage}
					<div class="flex items-center gap-2 mb-2 flex-wrap">
						<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
							{selectedSuggestionUsage.errorType}
						</span>
						<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
							总计使用 {selectedSuggestionUsage.totalUsage} 次
						</span>
						{#if getWarningStudentsUsingThis().length > 0}
							<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
								{getWarningStudentsUsingThis().length} 位预警学员使用
							</span>
						{/if}
					</div>
					<p class="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-200">
						{selectedSuggestionUsage.suggestionContent}
					</p>
				{/if}
			</div>
		</div>

		{#if selectedSuggestionUsage}
			{#if getWarningStudentsUsingThis().length > 0}
				<div class="bg-red-50 rounded-lg p-4 border border-red-100 mb-4">
					<h4 class="font-semibold text-red-800 mb-3 flex items-center gap-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						预警学员常用该建议（{getWarningStudentsUsingThis().length} 位）
					</h4>
					<div class="space-y-2">
						{#each getWarningStudentsUsingThis() as item}
							<div class="flex items-center justify-between p-3 bg-white rounded border border-red-100">
								<div class="flex items-center gap-3">
									<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(item.warning.level)}">
										{WARNING_LEVEL_LABELS[item.warning.level]}
									</span>
									<div>
										<p class="font-medium text-gray-900">{item.studentName}</p>
										<p class="text-xs text-gray-500">使用 {item.count} 次 · 评分 {item.warning.score} 分</p>
									</div>
								</div>
								<div class="flex gap-2">
									<button
										class="px-3 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
										on:click={() => openWarningDetail(item.warning)}
									>
										查看预警
									</button>
									<button
										class="px-3 py-1 text-xs rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
										on:click={() => goToWarningsForStudent(item.studentName)}
									>
										该学员全部预警
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if suggestionRelatedWarnings.length > 0}
				<div class="bg-purple-50 rounded-lg p-4 border border-purple-100 mb-4">
					<h4 class="font-semibold text-purple-800 mb-3 flex items-center gap-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						关联的阶段测评（{suggestionRelatedWarnings.length} 条）
					</h4>
					<div class="space-y-2 max-h-48 overflow-y-auto">
						{#each suggestionRelatedWarnings as item}
							<div class="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(item.warning.level)}">
										{WARNING_LEVEL_LABELS[item.warning.level]}
									</span>
									<span class="text-sm font-medium text-gray-900">{item.warning.studentName}</span>
									{#if item.warning.trainingItem}
										<span class="text-xs text-gray-500">· {item.warning.trainingItem}</span>
									{/if}
									<span class="text-xs text-gray-500">· 匹配 {item.matchCount} 条记录</span>
								</div>
								<button
									class="px-2 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
									on:click={() => openWarningDetail(item.warning)}
								>
									详情
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if selectedSuggestionUsage.usageByStudent.length === 0}
				<div class="py-8 text-center text-gray-500">
					<p>暂无学员使用该建议</p>
				</div>
			{:else}
				<h4 class="font-semibold text-gray-900 mb-3">全部使用情况</h4>
				<div class="space-y-2 max-h-72 overflow-y-auto">
					{#each selectedSuggestionUsage.usageByStudent as usage}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
								<div>
									<div class="flex items-center gap-2">
										<p class="font-medium text-gray-900">{usage.studentName}</p>
										{#if getStudentWarningLevel(usage.studentName)}
											<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(getStudentWarningLevel(usage.studentName)!.level)}">
												{WARNING_LEVEL_LABELS[getStudentWarningLevel(usage.studentName)!.level]}
											</span>
										{/if}
									</div>
									<p class="text-xs text-gray-500">使用 {usage.count} 次 · 涉及 {usage.recordIds.length} 条记录</p>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									class="px-3 py-1 text-sm rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
									on:click={() => goToStudentArchive(usage.studentName)}
								>
									查看学员档案
								</button>
								{#if getStudentWarningLevel(usage.studentName)}
									<button
										class="px-3 py-1 text-sm rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
										on:click={() => openWarningDetail(getStudentWarningLevel(usage.studentName)!)}
									>
										查看预警
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<div class="flex justify-end pt-4 mt-4 border-t border-gray-200">
			<button
				class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer font-medium text-gray-700"
				on:click={() => (usageModalOpen = false)}
			>
				关闭
			</button>
		</div>
	</div>
</BaseModal>

<RecordDetailModal
	bind:open={detailModalOpen}
	bind:record={selectedRecord}
	{suggestions}
/>
<WarningDetailModal
	bind:open={warningDetailOpen}
	bind:warning={selectedWarning}
/>
<svelte:window on:storage={() => { loadSuggestions(); loadRecords(); loadUsageData(); loadWarningStudents(); }} />
