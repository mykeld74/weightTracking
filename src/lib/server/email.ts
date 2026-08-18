import { RESEND_API_KEY, RESEND_FROM } from '$app/env/private';
import { Resend } from 'resend';

const resend = new Resend(RESEND_API_KEY);

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export async function sendPasswordResetEmail(input: {
	to: string;
	name: string;
	url: string;
}): Promise<void> {
	if (!RESEND_API_KEY) {
		console.error('RESEND_API_KEY is not set; password reset email was not sent.');
		return;
	}

	const greetingName = input.name.trim() || 'there';
	const safeName = escapeHtml(greetingName);
	const safeUrl = escapeHtml(input.url);

	try {
		const { error } = await resend.emails.send({
			from: RESEND_FROM,
			to: input.to,
			subject: 'Reset your Body Ledger password',
			text: [
				`Hi ${greetingName},`,
				'',
				'Use this link to choose a new Body Ledger password. It expires in one hour.',
				'',
				input.url,
				'',
				'If you did not ask for this, you can ignore the email.'
			].join('\n'),
			html: `<div style="background:#0c0d10;color:#f4f5f7;font-family:Figtree,system-ui,sans-serif;padding:32px 16px">
			<div style="max-width:440px;margin:0 auto;background:#16181d;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px 24px">
				<p style="margin:0 0 4px;color:#8b9098;font-size:12px;letter-spacing:0.04em;text-transform:uppercase">Body Ledger</p>
				<h1 style="margin:0 0 16px;font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:24px;letter-spacing:-0.04em">Reset your password</h1>
				<p style="margin:0 0 20px;color:#8b9098;line-height:1.5">Hi ${safeName}, use the button below to choose a new password. The link expires in one hour.</p>
				<p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;background:#f5a623;color:#1a1204;font-weight:600;text-decoration:none;border-radius:999px;padding:10px 16px">Choose a new password</a></p>
				<p style="margin:0;color:#8b9098;font-size:13px;line-height:1.5">If the button doesn’t work, paste this URL into your browser:<br /><span style="color:#f4f5f7;word-break:break-all">${safeUrl}</span></p>
				<p style="margin:20px 0 0;color:#8b9098;font-size:13px">If you did not ask for this, you can ignore the email.</p>
			</div>
		</div>`
		});

		if (error) {
			console.error('Password reset email failed', error);
		}
	} catch (caught) {
		console.error('Password reset email failed', caught);
	}
}
