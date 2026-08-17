const maxEdge = 1400;
const thumbEdge = 220;
const quality = 0.8;
const thumbQuality = 0.7;
const maxBytes = 2_500_000;

export type PreparedPhoto = {
	/** Full-size image shown in the photo grid. */
	image: File;
	/** Small preview for the sessions list. */
	thumb: File;
};

async function renderToBlob(bitmap: ImageBitmap, edge: number, jpegQuality: number): Promise<Blob> {
	const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Could not prepare that photo.');

	context.drawImage(bitmap, 0, 0, width, height);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(next) => {
				if (next) resolve(next);
				else reject(new Error('Could not compress that photo.'));
			},
			'image/jpeg',
			jpegQuality
		);
	});
}

export async function compressImage(file: File): Promise<PreparedPhoto> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Choose a photo file.');
	}

	const bitmap = await createImageBitmap(file);
	let image: Blob;
	let thumb: Blob;
	try {
		image = await renderToBlob(bitmap, maxEdge, quality);
		thumb = await renderToBlob(bitmap, thumbEdge, thumbQuality);
	} finally {
		bitmap.close();
	}

	if (image.size > maxBytes) {
		throw new Error('That photo is still too large after compressing.');
	}

	const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
	return {
		image: new File([image], `${name}.jpg`, { type: 'image/jpeg' }),
		thumb: new File([thumb], `${name}-thumb.jpg`, { type: 'image/jpeg' })
	};
}
