import { isIsoDate } from './dates';

export type BiologicalSex = 'male' | 'female';

export type UserProfile = {
	birthday: string | null;
	heightInches: number | null;
	gender: BiologicalSex | null;
};

export type CompositionValues = Record<string, number | null>;

/** Fields entered or imported from the scale — everything else is derived. */
export const compositionInputKeys = [
	'weight',
	'bodyFat',
	'muscleMass',
	'bodyWater',
	'boneMass',
	'protein',
	'visceralFat',
	'skeletalMuscleRate',
	'subcutaneousFat',
	// Scale-proprietary (Renpho compares BMR to a private age-group table).
	// Mifflin inversion does not match exports; keep the scale value.
	'metabolicAge'
] as const;

export const compositionCalculatedKeys = [
	'bmi',
	'fatContent',
	'leanBodyMass',
	'muscleMassPercent',
	'bmr'
] as const;

export type CompositionInputKey = (typeof compositionInputKeys)[number];
export type CompositionCalculatedKey = (typeof compositionCalculatedKeys)[number];

const lbsPerKg = 2.2046226218;

export function isBiologicalSex(value: string): value is BiologicalSex {
	return value === 'male' || value === 'female';
}

export function ageOnDate(birthday: string, onDate: string): number | null {
	if (!isIsoDate(birthday) || !isIsoDate(onDate) || onDate < birthday) return null;

	const [by, bm, bd] = birthday.split('-').map(Number);
	const [oy, om, od] = onDate.split('-').map(Number);
	let age = oy - by;
	if (om < bm || (om === bm && od < bd)) age -= 1;
	return age >= 0 && age <= 120 ? age : null;
}

export function inchesFromFeetAndInches(feet: number | null, inches: number | null): number | null {
	if (feet == null && inches == null) return null;
	const ft = feet ?? 0;
	const inch = inches ?? 0;
	if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 0 || inch < 0) return null;
	const total = ft * 12 + inch;
	return total > 0 ? total : null;
}

export function feetAndInchesFromTotal(totalInches: number | null | undefined): {
	feet: number | null;
	inches: number | null;
} {
	if (typeof totalInches !== 'number' || !Number.isFinite(totalInches) || totalInches <= 0) {
		return { feet: null, inches: null };
	}
	const rounded = Math.round(totalInches);
	const feet = Math.floor(rounded / 12);
	const inches = rounded - feet * 12;
	return { feet, inches };
}

function roundTo(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function lbsToKg(lbs: number): number {
	return lbs / lbsPerKg;
}

function inchesToCm(inches: number): number {
	return inches * 2.54;
}

/** US BMI: (lb × 703) / in² */
export function calculateBmi(weightLbs: number, heightInches: number): number | null {
	if (weightLbs <= 0 || heightInches <= 0) return null;
	return roundTo((weightLbs * 703) / (heightInches * heightInches), 1);
}

export function calculateFatContentLbs(weightLbs: number, bodyFatPercent: number): number | null {
	if (weightLbs <= 0 || bodyFatPercent < 0 || bodyFatPercent > 100) return null;
	return roundTo((weightLbs * bodyFatPercent) / 100, 1);
}

export function calculateLeanBodyMassLbs(weightLbs: number, fatContentLbs: number): number | null {
	if (weightLbs <= 0 || fatContentLbs < 0 || fatContentLbs > weightLbs) return null;
	return roundTo(weightLbs - fatContentLbs, 1);
}

export function calculateMuscleMassPercent(
	weightLbs: number,
	muscleMassLbs: number
): number | null {
	if (weightLbs <= 0 || muscleMassLbs < 0) return null;
	return roundTo((muscleMassLbs / weightLbs) * 100, 1);
}

/** Mifflin–St Jeor resting energy (kcal/day). */
export function calculateMifflinBmr(
	weightLbs: number,
	heightInches: number,
	ageYears: number,
	gender: BiologicalSex
): number | null {
	if (weightLbs <= 0 || heightInches <= 0 || ageYears < 0) return null;
	const weightKg = lbsToKg(weightLbs);
	const heightCm = inchesToCm(heightInches);
	const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
	const bmr = gender === 'male' ? base + 5 : base - 161;
	return Number.isFinite(bmr) ? Math.round(bmr) : null;
}

/** Katch–McArdle BMR from lean mass — preferred when body fat is known. */
export function calculateKatchBmr(leanBodyMassLbs: number): number | null {
	if (leanBodyMassLbs <= 0) return null;
	const bmr = 370 + 21.6 * lbsToKg(leanBodyMassLbs);
	return Number.isFinite(bmr) ? Math.round(bmr) : null;
}

/**
 * Overwrite calculated composition fields from measured values + profile.
 * Age for BMR uses the entry date, not "today".
 * Metabolic age is left as provided (scale import / manual entry).
 */
export function applyCompositionCalculations(
	values: CompositionValues,
	profile: UserProfile,
	recordedOn: string
): CompositionValues {
	const next: CompositionValues = { ...values };
	const weight = next.weight;
	const bodyFat = next.bodyFat;
	const muscleMass = next.muscleMass;

	for (const key of compositionCalculatedKeys) {
		next[key] = null;
	}

	if (typeof weight === 'number' && typeof bodyFat === 'number') {
		const fatContent = calculateFatContentLbs(weight, bodyFat);
		next.fatContent = fatContent;
		if (fatContent != null) {
			next.leanBodyMass = calculateLeanBodyMassLbs(weight, fatContent);
		}
	}

	if (typeof weight === 'number' && typeof muscleMass === 'number') {
		next.muscleMassPercent = calculateMuscleMassPercent(weight, muscleMass);
	}

	const height = profile.heightInches;
	if (typeof weight === 'number' && typeof height === 'number') {
		next.bmi = calculateBmi(weight, height);
	}

	const age =
		profile.birthday && isIsoDate(recordedOn) ? ageOnDate(profile.birthday, recordedOn) : null;
	const gender = profile.gender;

	let bmr: number | null = null;
	if (typeof next.leanBodyMass === 'number') {
		bmr = calculateKatchBmr(next.leanBodyMass);
	} else if (typeof weight === 'number' && typeof height === 'number' && age != null && gender) {
		bmr = calculateMifflinBmr(weight, height, age, gender);
	}
	next.bmr = bmr;

	return next;
}

export function profileIsComplete(profile: UserProfile): boolean {
	return (
		Boolean(profile.birthday && isIsoDate(profile.birthday)) &&
		typeof profile.heightInches === 'number' &&
		profile.heightInches > 0 &&
		Boolean(profile.gender)
	);
}
