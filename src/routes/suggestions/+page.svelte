<script lang="ts">
	import { onMount } from 'svelte';
	import BaseModal from '$lib/components/BaseModal.svelte';
	import RecordDetailModal from '$lib/components/RecordDetailModal.svelte';
	import {
		getSuggestions,
		addSuggestion,
		updateSuggestion,
		deleteSuggestion,
		generateId,
		getRecords,
		updateRecord
	} from '$lib/storage';
	import { ERROR_TYPES, AUTO_RETRAIN_THRESHOLD } from '$lib/constants';
	import type { Suggestion, ErrorType, PracticeRecord } from '$lib/types';

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

	let form = {
		errorType: ERROR_TYPES[0] as ErrorType,
		content: ''
	};

	let errors: Record<string, string> = {};

	onMount(() => {
		loadSuggestions();
		loadRecords();
	});

	function loadSuggestions() {
		suggestions = getSuggestions().sort((a, b) => b.createdAt - a.createdAt);
	}

	function loadRecords() {
		allRecords = getRecords().sort((a, b) => b.createdAt - a.createdAt);
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

		updateRecord({
			...record,
			improvementSuggestion: applyingSuggestion.content,
			updatedAt: Date.now()
		});

		applySuccessMsg = `建议已成功应用到记录 ${record.recordNo}`;
		loadRecords();
		setTimeout(() => {
			applySuccessMsg = '';
		}, 3000);
	}

	function openRecordDetail(record: PracticeRecord) {
		selectedRecord = record;
		detailModalOpen = true;
	}

	function getDeductBadgeClass(count: number): string {
		if (count === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (count <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}
</script>

<svelte:head>
	<title>复盘建议维护 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">复盘建议维护</h2>
		<button
			class="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 cursor-pointer font-medium"
			on:click={openAdd}
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			新增建议
		</button>
	</div>

	{#if suggestions.length === 0}
		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<div class="text-center py-12 text-on-surface-variant-token">
				<p class="text-lg mb-2">暂无复盘建议</p>
				<p class="text-sm">新增建议后，在录入练习记录时选择失误类型会自动填充建议</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			{#each ERROR_TYPES as errorType}
				{@const typeSuggestions = getSuggestionsByErrorType(errorType)}
				{#if typeSuggestions.length > 0}
					<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
						<h3 class="font-semibold text-lg mb-4 flex items-center gap-2">
							<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
								{errorType}
							</span>
							<span class="text-sm text-on-surface-variant-token">({typeSuggestions.length} 条建议)</span>
						</h3>
						<div class="space-y-2">
							{#each typeSuggestions as s, index}
								<div class="flex items-start gap-3 p-3 bg-surface-50-900-token rounded">
									<span class="text-primary-500 font-bold min-w-[24px]">{index + 1}.</span>
									<p class="flex-1">{s.content}</p>
									<div class="flex gap-2 shrink-0">
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

		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<h3 class="font-semibold text-lg mb-4">全部建议列表</h3>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="border-b border-surface-300-700-token">
							<th class="text-left p-3 font-semibold">失误类型</th>
							<th class="text-left p-3 font-semibold">建议内容</th>
							<th class="text-left p-3 font-semibold">创建时间</th>
							<th class="text-left p-3 font-semibold">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each suggestions as s}
							<tr class="border-b border-surface-200-800-token">
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
										{s.errorType}
									</span>
								</td>
								<td class="p-3 max-w-md">{s.content}</td>
								<td class="p-3 text-sm text-on-surface-variant-token">
									{new Date(s.createdAt).toLocaleDateString('zh-CN')}
								</td>
								<td class="p-3">
									<div class="flex gap-2">
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
	<div class="p-5">
		<h3 class="text-lg font-bold mb-4">{editingSuggestion ? '编辑建议' : '新增建议'}</h3>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium mb-1">失误类型</label>
				<select
					bind:value={form.errorType}
					class="w-full px-3 py-2 rounded border {errors.errorType ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
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
				<label class="block text-sm font-medium mb-1">建议内容</label>
				<textarea
					bind:value={form.content}
					rows={4}
					placeholder="针对该失误类型的改进建议..."
					class="w-full px-3 py-2 rounded border {errors.content ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
				></textarea>
				{#if errors.content}
					<p class="text-xs text-red-500 mt-1">{errors.content}</p>
				{/if}
			</div>
			<div class="flex justify-end gap-2 pt-2">
				<button
					class="px-4 py-2 rounded border border-surface-300-700-token hover:bg-surface-200-800-token cursor-pointer font-medium"
					on:click={() => (modalOpen = false)}
				>
					取消
				</button>
				<button
					class="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 cursor-pointer font-medium"
					on:click={handleSave}
				>
					{editingSuggestion ? '保存修改' : '创建建议'}
				</button>
			</div>
		</div>
	</div>
</BaseModal>

<BaseModal bind:open={applyModalOpen} width="max-w-2xl">
	<div class="p-5">
		<h3 class="text-lg font-bold mb-2">引用建议到练习记录</h3>
		{#if applyingSuggestion}
			<div class="mb-4 p-3 bg-surface-50-900-token rounded border border-surface-200-800-token">
				<div class="flex items-center gap-2 mb-2">
					<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
						{applyingSuggestion.errorType}
					</span>
				</div>
				<p class="text-sm">{applyingSuggestion.content}</p>
			</div>
		{/if}

		{#if applySuccessMsg}
			<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
				{applySuccessMsg}
			</div>
		{/if}

		<div class="mb-3">
			<p class="text-sm font-medium mb-2">
				选择要应用建议的练习记录（同失误类型：
				{applyingSuggestion?.errorType || '-'}，共 {recordsByErrorType.length} 条）：
			</p>
		</div>

		{#if recordsByErrorType.length === 0}
			<div class="py-8 text-center text-on-surface-variant-token">
				<p>暂无该失误类型的练习记录</p>
			</div>
		{:else}
			<div class="max-h-80 overflow-y-auto border border-surface-200-800-token rounded">
				<div class="space-y-1 p-2">
					{#each recordsByErrorType as record}
						<label
							class="flex items-center gap-3 p-3 rounded hover:bg-surface-50-900-token cursor-pointer border {selectedRecordId === record.id ? 'border-primary-500 bg-primary-50' : 'border-transparent'}"
						>
							<input
								type="radio"
								bind:group={selectedRecordId}
								value={record.id}
								class="w-4 h-4 cursor-pointer"
							/>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-mono text-sm">{record.recordNo}</span>
									<span class="text-sm font-medium">{record.studentName}</span>
									<span class="text-sm text-on-surface-variant-token">{record.practiceDate}</span>
									<span class="text-sm">{record.trainingItem}</span>
									<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getDeductBadgeClass(record.deductCount)}">
										{record.deductCount} 分
									</span>
								</div>
								<p class="text-xs text-on-surface-variant-token mt-1 truncate">
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

		<div class="flex justify-end gap-2 pt-4 mt-4 border-t border-surface-200-800-token">
			<button
				class="px-4 py-2 rounded border border-surface-300-700-token hover:bg-surface-200-800-token cursor-pointer font-medium"
				on:click={() => (applyModalOpen = false)}
			>
				关闭
			</button>
			<button
				class="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				on:click={applySuggestionToRecord}
				disabled={!selectedRecordId}
			>
				应用建议
			</button>
		</div>
	</div>
</BaseModal>

<RecordDetailModal
	bind:open={detailModalOpen}
	bind:record={selectedRecord}
	{suggestions}
/>
<svelte:window on:storage={loadSuggestions} />
