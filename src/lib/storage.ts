import { browser } from '$app/environment';
import { STORAGE_KEYS } from './constants';
import type { PracticeRecord, Suggestion } from './types';

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
