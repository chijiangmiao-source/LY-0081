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
