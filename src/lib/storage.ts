import { browser } from '$app/environment';
import { STORAGE_KEYS } from './constants';
import type { PracticeRecord, Suggestion, StudentArchive, SuggestionUsage, ErrorType, TrainingItem } from './types';

export function getRecords(): PracticeRecord[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
		return data ? (JSON.parse(data) as PracticeRecord[]) : [];
	} catch {
		return [];
	}
}

export function saveRecords(records: PracticeRecord[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

export function addRecord(record: PracticeRecord): PracticeRecord[] {
	const records = getRecords();
	records.push(record);
	saveRecords(records);
	return records;
}

export function updateRecord(updated: PracticeRecord): PracticeRecord[] {
	const records = getRecords();
	const index = records.findIndex((r) => r.id === updated.id);
	if (index !== -1) {
		records[index] = { ...updated, updatedAt: Date.now() };
		saveRecords(records);
	}
	return records;
}

export function deleteRecord(id: string): PracticeRecord[] {
	const records = getRecords().filter((r) => r.id !== id);
	saveRecords(records);
	return records;
}

export function getSuggestions(): Suggestion[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
		return data ? (JSON.parse(data) as Suggestion[]) : [];
	} catch {
		return [];
	}
}

export function saveSuggestions(suggestions: Suggestion[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
}

export function addSuggestion(suggestion: Suggestion): Suggestion[] {
	const suggestions = getSuggestions();
	suggestions.push(suggestion);
	saveSuggestions(suggestions);
	return suggestions;
}

export function updateSuggestion(updated: Suggestion): Suggestion[] {
	const suggestions = getSuggestions();
	const index = suggestions.findIndex((s) => s.id === updated.id);
	if (index !== -1) {
		suggestions[index] = updated;
		saveSuggestions(suggestions);
	}
	return suggestions;
}

export function deleteSuggestion(id: string): Suggestion[] {
	const suggestions = getSuggestions().filter((s) => s.id !== id);
	saveSuggestions(suggestions);
	return suggestions;
}

export function checkDuplicateRecord(
	studentName: string,
	practiceDate: string,
	trainingItem: string,
	excludeId?: string
): boolean {
	const records = getRecords();
	return records.some(
		(r) =>
			r.studentName === studentName &&
			r.practiceDate === practiceDate &&
			r.trainingItem === trainingItem &&
			r.id !== excludeId
	);
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function generateRecordNo(): string {
	const now = new Date();
	const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
	const records = getRecords();
	const todayCount = records.filter((r) => r.recordNo.startsWith(dateStr)).length + 1;
	return `${dateStr}${String(todayCount).padStart(3, '0')}`;
}

export function getStudentArchives(
	startDate?: string,
	endDate?: string
): StudentArchive[] {
	const records = getRecords();
	const filtered = records.filter((r) => {
		const matchStart = !startDate || r.practiceDate >= startDate;
		const matchEnd = !endDate || r.practiceDate <= endDate;
		return matchStart && matchEnd;
	});

	const studentNames = [...new Set(filtered.map((r) => r.studentName))];

	return studentNames.map((name) => {
		const studentRecords = filtered
			.filter((r) => r.studentName === name)
			.sort((a, b) => (a.practiceDate > b.practiceDate ? 1 : -1));

		const totalDeduct = studentRecords.reduce((sum, r) => sum + r.deductCount, 0);
		const retrainCount = studentRecords.filter((r) => r.needRetraining).length;
		const avgDeduct = studentRecords.length > 0 ? Number((totalDeduct / studentRecords.length).toFixed(1)) : 0;

		const errorTypeMap = new Map<ErrorType, number>();
		studentRecords.forEach((r) => {
			errorTypeMap.set(r.mainErrorType, (errorTypeMap.get(r.mainErrorType) || 0) + 1);
		});
		const errorTypeStats = [...errorTypeMap.entries()]
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count);

		const itemMap = new Map<TrainingItem, { count: number; totalDeduct: number; retrainCount: number }>();
		studentRecords.forEach((r) => {
			const existing = itemMap.get(r.trainingItem) || { count: 0, totalDeduct: 0, retrainCount: 0 };
			itemMap.set(r.trainingItem, {
				count: existing.count + 1,
				totalDeduct: existing.totalDeduct + r.deductCount,
				retrainCount: existing.retrainCount + (r.needRetraining ? 1 : 0)
			});
		});
		const itemStats = [...itemMap.entries()].map(([item, data]) => ({
			item,
			count: data.count,
			avgDeduct: data.count > 0 ? Number((data.totalDeduct / data.count).toFixed(1)) : 0,
			retrainCount: data.retrainCount
		}));

		const dates = [...new Set(studentRecords.map((r) => r.practiceDate))].sort();
		const trendData = dates.map((date) => {
			const dayRecords = studentRecords.filter((r) => r.practiceDate === date);
			const sum = dayRecords.reduce((s, r) => s + r.deductCount, 0);
			return {
				date,
				avgDeduct: dayRecords.length > 0 ? Number((sum / dayRecords.length).toFixed(1)) : 0
			};
		});

		const suggestionMap = new Map<string, number>();
		studentRecords.forEach((r) => {
			if (r.improvementSuggestion) {
				const lines = r.improvementSuggestion
					.split(/\n|•/)
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				lines.forEach((line) => {
					suggestionMap.set(line, (suggestionMap.get(line) || 0) + 1);
				});
			}
		});
		const commonSuggestions = [...suggestionMap.entries()]
			.map(([content, count]) => ({ content, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			studentName: name,
			totalPractices: studentRecords.length,
			retrainCount,
			totalDeduct,
			avgDeduct,
			errorTypeStats,
			itemStats,
			records: studentRecords,
			firstPracticeDate: studentRecords.length > 0 ? studentRecords[0].practiceDate : '-',
			lastPracticeDate: studentRecords.length > 0 ? studentRecords[studentRecords.length - 1].practiceDate : '-',
			trendData,
			commonSuggestions
		};
	}).sort((a, b) => b.totalPractices - a.totalPractices);
}

export function getSuggestionUsage(): SuggestionUsage[] {
	const records = getRecords();
	const suggestions = getSuggestions();

	return suggestions.map((s) => {
		const usageByStudentMap = new Map<string, { count: number; recordIds: string[] }>();

		records.forEach((r) => {
			if (r.improvementSuggestion && r.improvementSuggestion.includes(s.content)) {
				const existing = usageByStudentMap.get(r.studentName) || { count: 0, recordIds: [] };
				usageByStudentMap.set(r.studentName, {
					count: existing.count + 1,
					recordIds: [...existing.recordIds, r.id]
				});
			}
		});

		const usageByStudent = [...usageByStudentMap.entries()]
			.map(([studentName, data]) => ({
				studentName,
				count: data.count,
				recordIds: data.recordIds
			}))
			.sort((a, b) => b.count - a.count);

		const totalUsage = usageByStudent.reduce((sum, u) => sum + u.count, 0);

		return {
			suggestionId: s.id,
			suggestionContent: s.content,
			errorType: s.errorType,
			usageByStudent,
			totalUsage
		};
	}).sort((a, b) => b.totalUsage - a.totalUsage);
}
