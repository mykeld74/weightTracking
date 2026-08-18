<script lang="ts">
	let {
		label,
		onCapture,
		onCancel
	}: {
		label: string;
		onCapture: (file: File) => void;
		onCancel: () => void;
	} = $props();

	let stream = $state<MediaStream | null>(null);
	let error = $state('');
	let starting = $state(true);
	let capturing = $state(false);
	let videoNode: HTMLVideoElement | null = null;

	function attachCamera() {
		let cancelled = false;
		let active: MediaStream | null = null;

		void (async () => {
			try {
				const next = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
					audio: false
				});
				if (cancelled) {
					for (const track of next.getTracks()) track.stop();
					return;
				}
				active = next;
				stream = next;
			} catch {
				if (!cancelled) {
					error = 'Could not open the camera. Choose a file instead, or allow camera access.';
				}
			} finally {
				if (!cancelled) starting = false;
			}
		})();

		return () => {
			cancelled = true;
			for (const track of active?.getTracks() ?? []) track.stop();
			stream = null;
		};
	}

	function attachVideo(node: HTMLVideoElement) {
		videoNode = node;
		node.srcObject = stream;
		return () => {
			if (videoNode === node) videoNode = null;
			node.srcObject = null;
		};
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') onCancel();
	}

	function shutter() {
		if (!videoNode || videoNode.videoWidth === 0 || capturing) return;
		capturing = true;
		const canvas = document.createElement('canvas');
		canvas.width = videoNode.videoWidth;
		canvas.height = videoNode.videoHeight;
		const context = canvas.getContext('2d');
		if (!context) {
			capturing = false;
			error = 'Could not capture that photo.';
			return;
		}
		context.drawImage(videoNode, 0, 0);
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					capturing = false;
					error = 'Could not capture that photo.';
					return;
				}
				onCapture(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
			},
			'image/jpeg',
			0.92
		);
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="camera-overlay"
	role="dialog"
	aria-modal="true"
	aria-label="Take {label} photo"
	{@attach attachCamera}
>
	<div class="camera-card">
		<p class="camera-title">{label}</p>
		{#if error}
			<p class="camera-error">{error}</p>
		{:else}
			<div class="camera-frame">
				{#if stream}
					<video class="camera-video" autoplay muted playsinline {@attach attachVideo}></video>
				{:else}
					<p class="camera-wait">{starting ? 'Starting camera…' : 'No camera feed.'}</p>
				{/if}
			</div>
		{/if}
		<div class="camera-actions">
			{#if stream && !error}
				<button class="primary-btn" type="button" disabled={capturing} onclick={shutter}>
					{capturing ? 'Capturing…' : 'Take photo'}
				</button>
			{/if}
			<button class="ghost-btn" type="button" onclick={onCancel}>Cancel</button>
		</div>
	</div>
</div>

<style>
	.camera-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgba(8, 9, 12, 0.78);
	}

	.camera-card {
		width: min(420px, 100%);
		padding: 16px;
		background: var(--bg-elev);
		border: 1px solid var(--line-strong);
		border-radius: 16px;
	}

	.camera-title {
		margin: 0 0 12px;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.camera-frame {
		overflow: hidden;
		aspect-ratio: 3 / 4;
		border-radius: 12px;
		background: var(--bg);
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.camera-wait,
	.camera-error {
		margin: 0;
		padding: 48px 16px;
		color: var(--ink-soft);
		text-align: center;
	}

	.camera-error {
		padding: 24px 8px;
	}

	.camera-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}
</style>
