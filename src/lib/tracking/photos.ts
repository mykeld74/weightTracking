export const photoViews = ['front', 'left', 'right', 'back'] as const;

export type PhotoView = (typeof photoViews)[number];

export const photoViewLabels: Record<PhotoView, string> = {
	front: 'Front',
	left: 'Left side',
	right: 'Right side',
	back: 'Back'
};

export type PhotoMeta = {
	id: string;
	recordedOn: string;
	view: PhotoView;
	updatedAt: number;
};

export type PhotoDay = {
	recordedOn: string;
	photos: Partial<Record<PhotoView, PhotoMeta>>;
};

const photoViewSet = new Set<string>(photoViews);

export function isPhotoView(value: string): value is PhotoView {
	return photoViewSet.has(value);
}

export function groupPhotosByDate(photos: PhotoMeta[]): PhotoDay[] {
	const byDate = new Map<string, PhotoDay>();

	for (const photo of photos) {
		let day = byDate.get(photo.recordedOn);
		if (!day) {
			day = { recordedOn: photo.recordedOn, photos: {} };
			byDate.set(photo.recordedOn, day);
		}
		day.photos[photo.view] = photo;
	}

	return [...byDate.values()].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
}

export function photoSrc(photo: PhotoMeta): string {
	return `/photos/file/${photo.id}?t=${photo.updatedAt}`;
}

/** Small stored preview — a fraction of the full image's bytes. */
export function photoThumbSrc(photo: PhotoMeta): string {
	return `/photos/file/${photo.id}?t=${photo.updatedAt}&size=thumb`;
}
