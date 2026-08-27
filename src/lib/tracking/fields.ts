export type FieldDef = {
	key: string;
	label: string;
	unit: string;
	decimals: number;
};

export const compositionFields = [
	{ key: 'weight', label: 'Weight', unit: 'lbs', decimals: 1 },
	{ key: 'bmi', label: 'BMI', unit: '', decimals: 1 },
	{ key: 'bodyFat', label: 'Body Fat', unit: '%', decimals: 1 },
	{ key: 'muscleMass', label: 'Muscle Mass', unit: 'lbs', decimals: 1 },
	{ key: 'muscleMassPercent', label: 'Muscle Mass %', unit: '%', decimals: 1 },
	{ key: 'bodyWater', label: 'Body Water', unit: '%', decimals: 1 },
	{ key: 'leanBodyMass', label: 'Lean Body Mass', unit: 'lbs', decimals: 1 },
	{ key: 'boneMass', label: 'Bone Mass', unit: 'lbs', decimals: 1 },
	{ key: 'protein', label: 'Protein', unit: '%', decimals: 1 },
	{ key: 'visceralFat', label: 'Visceral Fat', unit: '', decimals: 1 },
	{ key: 'bmr', label: 'BMR', unit: 'kcal', decimals: 0 },
	{ key: 'metabolicAge', label: 'Metabolic Age', unit: '', decimals: 0 },
	{ key: 'skeletalMuscleRate', label: 'Skeletal Muscle Rate', unit: '%', decimals: 1 },
	{ key: 'fatContent', label: 'Fat Content', unit: 'lbs', decimals: 1 },
	{ key: 'subcutaneousFat', label: 'Subcutaneous Fat', unit: '%', decimals: 1 }
] as const satisfies readonly FieldDef[];

export const measurementFields = [
	{ key: 'chest', label: 'Chest', unit: 'in', decimals: 1 },
	{ key: 'stomach', label: 'Stomach', unit: 'in', decimals: 1 },
	{ key: 'leftArm', label: 'Left Arm', unit: 'in', decimals: 1 },
	{ key: 'rightArm', label: 'Right Arm', unit: 'in', decimals: 1 },
	{ key: 'leftLeg', label: 'Left Leg', unit: 'in', decimals: 1 },
	{ key: 'rightLeg', label: 'Right Leg', unit: 'in', decimals: 1 }
] as const satisfies readonly FieldDef[];

export const primaryMeasurementKeys = ['chest', 'stomach', 'leftArm', 'rightArm'] as const;

export const defaultCompositionMetricKeys = ['weight'] as const;

export const primaryCompositionKeys = ['weight', 'bmi', 'bodyFat', 'muscleMass'] as const;

export type CompositionFieldKey = (typeof compositionFields)[number]['key'];
export type MeasurementFieldKey = (typeof measurementFields)[number]['key'];

const chartColors = {
	weight: '#f5a623',
	bmi: '#7aa2ff',
	bodyFat: '#ff6b7a',
	muscleMass: '#3ad4b0',
	muscleMassPercent: '#5ee0c0',
	bodyWater: '#4ec8f0',
	leanBodyMass: '#7bd88f',
	boneMass: '#d4b896',
	protein: '#c084fc',
	visceralFat: '#ff8a5b',
	bmr: '#e8c547',
	metabolicAge: '#a78bfa',
	skeletalMuscleRate: '#34d399',
	fatContent: '#e879a8',
	subcutaneousFat: '#ff9ecd',
	chest: '#f5a623',
	stomach: '#ff6b7a',
	leftArm: '#7aa2ff',
	rightArm: '#9bb8ff',
	leftLeg: '#3ad4b0',
	rightLeg: '#7bd88f'
} as const satisfies Record<CompositionFieldKey | MeasurementFieldKey, string>;

export const dosageField = {
	key: 'dosage',
	label: 'Dose',
	unit: 'mg',
	decimals: 2
} as const satisfies FieldDef;

export function chartColorFor(key: string): string {
	if (key === 'dosage') return '#c084fc';
	if (key in chartColors) return chartColors[key as keyof typeof chartColors];
	return '#f5a623';
}

export type TrackingEntry = {
	id: string;
	recordedOn: string;
	[key: string]: unknown;
};

export function formatFieldValue(value: number, field: FieldDef): string {
	const formatted = value.toFixed(field.decimals);
	return field.unit ? `${formatted} ${field.unit}` : formatted;
}

export function fieldByKey(fields: readonly FieldDef[], key: string): FieldDef | undefined {
	return fields.find((field) => field.key === key);
}
