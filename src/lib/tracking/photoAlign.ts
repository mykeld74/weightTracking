export type FaceBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type AlignTransform = {
	/** Display width of the ghost image in stage pixels. */
	width: number;
	/** Display height of the ghost image in stage pixels. */
	height: number;
	/** Left edge in stage pixels. */
	left: number;
	/** Top edge in stage pixels. */
	top: number;
};

export type ContainRect = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
};

type FaceDetectorBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type FaceDetectorFace = {
	boundingBox: FaceDetectorBox;
};

type FaceDetectorLike = {
	detect: (image: HTMLImageElement) => Promise<FaceDetectorFace[]>;
};

type FaceDetectorConstructor = new (options?: {
	fastMode?: boolean;
	maxDetectedFaces?: number;
}) => FaceDetectorLike;

function faceDetectorCtor(): FaceDetectorConstructor | null {
	if (typeof window === 'undefined') return null;
	const ctor = (window as unknown as { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
	return ctor ?? null;
}

export function canDetectFaces(): boolean {
	return faceDetectorCtor() != null;
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Could not load image: ${src}`));
		image.src = src;
	});
}

/** Largest detected face, or null if unsupported / none found. */
export async function detectPrimaryFace(image: HTMLImageElement): Promise<FaceBox | null> {
	const Ctor = faceDetectorCtor();
	if (!Ctor) return null;

	try {
		const detector = new Ctor({ fastMode: true, maxDetectedFaces: 3 });
		const faces = await detector.detect(image);
		if (!faces.length) return null;

		let best = faces[0].boundingBox;
		for (const face of faces.slice(1)) {
			const box = face.boundingBox;
			if (box.width * box.height > best.width * best.height) best = box;
		}

		return {
			x: best.x,
			y: best.y,
			width: best.width,
			height: best.height
		};
	} catch {
		return null;
	}
}

/** Approximate crown of head from a face box (face detectors stop near the forehead). */
export function headTopY(face: FaceBox): number {
	return Math.max(0, face.y - face.height * 0.35);
}

export function containRect(
	imageWidth: number,
	imageHeight: number,
	stageWidth: number,
	stageHeight: number
): ContainRect {
	const scale = Math.min(stageWidth / imageWidth, stageHeight / imageHeight);
	const width = imageWidth * scale;
	const height = imageHeight * scale;
	return {
		x: (stageWidth - width) / 2,
		y: (stageHeight - height) / 2,
		width,
		height,
		scale
	};
}

/** Contain-fit the ghost, then apply manual scale (around center) and nudges. */
export function manualGhostPlacement(input: {
	stageWidth: number;
	stageHeight: number;
	ghostWidth: number;
	ghostHeight: number;
	scaleAdjust?: number;
	offsetX?: number;
	offsetY?: number;
}): AlignTransform {
	const scaleAdjust = Number(input.scaleAdjust ?? 1);
	const offsetX = Number(input.offsetX ?? 0);
	const offsetY = Number(input.offsetY ?? 0);
	const base = containRect(
		input.ghostWidth,
		input.ghostHeight,
		input.stageWidth,
		input.stageHeight
	);
	const width = base.width * scaleAdjust;
	const height = base.height * scaleAdjust;
	const centerX = base.x + base.width / 2;
	const centerY = base.y + base.height / 2;
	return {
		width,
		height,
		left: centerX - width / 2 + offsetX,
		top: centerY - height / 2 + offsetY
	};
}

/**
 * Place the ghost image so its face height matches the current photo's face
 * and the tops of the heads line up (with optional manual nudges).
 */
export function alignGhostToCurrent(input: {
	stageWidth: number;
	stageHeight: number;
	currentWidth: number;
	currentHeight: number;
	currentFace: FaceBox;
	ghostWidth: number;
	ghostHeight: number;
	ghostFace: FaceBox;
	/** Extra scale multiplier (1 = auto size). */
	scaleAdjust?: number;
	/** Manual nudge in stage pixels. */
	offsetX?: number;
	offsetY?: number;
}): AlignTransform {
	const scaleAdjust = Number(input.scaleAdjust ?? 1);
	const offsetX = Number(input.offsetX ?? 0);
	const offsetY = Number(input.offsetY ?? 0);

	const currentPlace = containRect(
		input.currentWidth,
		input.currentHeight,
		input.stageWidth,
		input.stageHeight
	);

	const currentFaceHeight = input.currentFace.height * currentPlace.scale;
	const displayScale = (currentFaceHeight / input.ghostFace.height) * scaleAdjust;

	const width = input.ghostWidth * displayScale;
	const height = input.ghostHeight * displayScale;

	const currentHeadTop = currentPlace.y + headTopY(input.currentFace) * currentPlace.scale;
	const currentFaceCenterX =
		currentPlace.x +
		(input.currentFace.x + input.currentFace.width / 2) * currentPlace.scale;

	const ghostHeadTopInImage = headTopY(input.ghostFace);
	const ghostFaceCenterX = input.ghostFace.x + input.ghostFace.width / 2;

	return {
		width,
		height,
		left: currentFaceCenterX - ghostFaceCenterX * displayScale + offsetX,
		top: currentHeadTop - ghostHeadTopInImage * displayScale + offsetY
	};
}
