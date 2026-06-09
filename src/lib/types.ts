export interface PracticeRecord {
	id: string;
	recordNo: string;
	studentName: string;
	practiceDate: string;
	trainingItem: TrainingItem;
	deductCount: number;
	mainErrorType: ErrorType;
	needRetraining: boolean;
	coachComment: string;
	improvementSuggestion: string;
	createdAt: number;
	updatedAt: number;
}

export type TrainingItem =
	| '倒车入库'
	| '侧方停车'
	| '曲线行驶'
	| '直角转弯'
	| '坡道定点停车和起步'
	| '通过限宽门'
	| '通过连续障碍';

export type ErrorType =
	| '压线'
	| '中途停车'
	| '超时'
	| '熄火'
	| '角度不当'
	| '速度过快'
	| '后视镜观察不足'
	| '方向控制不稳'
	| '其他';

export interface Suggestion {
	id: string;
	errorType: ErrorType;
	content: string;
	createdAt: number;
}

export interface FilterOptions {
	searchText: string;
	studentName: string;
	trainingItem: TrainingItem | '';
	startDate: string;
	endDate: string;
}

export interface StudentArchive {
	studentName: string;
	totalPractices: number;
	retrainCount: number;
	totalDeduct: number;
	avgDeduct: number;
	errorTypeStats: { type: ErrorType; count: number }[];
	itemStats: { item: TrainingItem; count: number; avgDeduct: number; retrainCount: number }[];
	records: PracticeRecord[];
	firstPracticeDate: string;
	lastPracticeDate: string;
	trendData: { date: string; avgDeduct: number }[];
	commonSuggestions: { content: string; count: number }[];
}

export interface SuggestionUsage {
	suggestionId: string;
	suggestionContent: string;
	errorType: ErrorType;
	usageByStudent: { studentName: string; count: number; recordIds: string[] }[];
	totalUsage: number;
}

export type WarningLevel = 'stable' | 'attention' | 'alert';

export type WarningScope = 'student' | 'item';

export interface WarningReason {
	code: string;
	description: string;
	weight: number;
}

export interface WarningTrendPoint {
	date: string;
	level: WarningLevel;
	score: number;
}

export interface RetrainingSuggestion {
	priority: 'high' | 'medium' | 'low';
	content: string;
	errorType?: ErrorType;
}

export interface WarningRecord {
	id: string;
	scope: WarningScope;
	studentName: string;
	trainingItem?: TrainingItem;
	level: WarningLevel;
	score: number;
	periodStart: string;
	periodEnd: string;
	practiceCount: number;
	avgDeduct: number;
	retrainRate: number;
	trendDirection: 'improving' | 'stable' | 'declining' | 'insufficient';
	topErrorTypes: { type: ErrorType; count: number; rate: number }[];
	reasons: WarningReason[];
	trendHistory: WarningTrendPoint[];
	suggestions: RetrainingSuggestion[];
	recordIds: string[];
	createdAt: number;
	acknowledged: boolean;
	acknowledgedAt?: number;
}

export interface WarningStats {
	total: number;
	stable: number;
	attention: number;
	alert: number;
	byStudent: Map<string, number>;
	byItem: Map<TrainingItem, number>;
}
