import { RESEND_API_KEY, RESEND_FROM } from '$app/env/private';
import { Resend } from 'resend';

const resend = new Resend(RESEND_API_KEY);
const font = 'Arial, Helvetica, sans-serif';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Table-based layout plus `bgcolor` so Spark/Apple Mail/Outlook keep the CTA
 * fill. Styled `<a>` buttons get restyled as links and dark-mode clients
 * invert `#f5a623` into a muddy outline.
 */
function emailButton(url: string, label: string) {
	return `
		<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
			<tr>
				<td align="center" bgcolor="#f5a623" style="padding:12px 24px;background-color:#f5a623;background-image:linear-gradient(#f5a623,#f5a623);border:1px solid #f5a623;border-radius:8px;">
					<!--[if mso]>
					<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#f5a623">
						<w:anchorlock/>
						<center style="color:#1a1204;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center>
					</v:roundrect>
					<![endif]-->
					<!--[if !mso]><!-->
					<a href="${url}" target="_blank" style="display:block;font-family:${font};font-size:16px;font-weight:700;line-height:20px;color:#1a1204;text-decoration:none !important;">
						<span style="color:#1a1204 !important;text-decoration:none !important;font-weight:700;">${label}</span>
					</a>
					<!--<![endif]-->
				</td>
			</tr>
		</table>`;
}

function transactionalHtml(input: {
	title: string;
	body: string;
	url: string;
	buttonLabel: string;
}) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${input.title}</title>
<style>
	:root { color-scheme: light; supported-color-schemes: light; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0c0d10;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0c0d10;">
		<tr>
			<td align="center" style="padding:32px 16px;">
				<table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:440px;background-color:#16181d;border:1px solid #2a2d33;border-radius:14px;">
					<tr>
						<td style="padding:28px 24px;font-family:${font};color:#f4f5f7;">
							<p style="margin:0 0 4px;color:#8b9098;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Body Ledger</p>
							<h1 style="margin:0 0 16px;font-family:${font};font-size:24px;line-height:1.2;color:#f4f5f7;">${input.title}</h1>
							<p style="margin:0 0 20px;color:#8b9098;font-size:16px;line-height:1.5;">${input.body}</p>
							${emailButton(input.url, input.buttonLabel)}
							<p style="margin:0;color:#8b9098;font-size:13px;line-height:1.5;">If the button doesn’t work, paste this URL into your browser:<br>
							<span style="color:#f4f5f7;word-break:break-all;">${input.url}</span></p>
							<p style="margin:20px 0 0;color:#8b9098;font-size:13px;line-height:1.5;">If you did not expect this, you can ignore the email.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

async function sendTransactionalEmail(input: {
	to: string;
	subject: string;
	text: string;
	title: string;
	body: string;
	url: string;
	buttonLabel: string;
	logLabel: string;
}): Promise<void> {
	if (!RESEND_API_KEY) {
		console.error(`RESEND_API_KEY is not set; ${input.logLabel} was not sent.`);
		return;
	}

	try {
		const { error } = await resend.emails.send({
			from: RESEND_FROM,
			to: input.to,
			subject: input.subject,
			text: input.text,
			html: transactionalHtml({
				title: input.title,
				body: input.body,
				url: input.url,
				buttonLabel: input.buttonLabel
			})
		});

		if (error) {
			console.error(`${input.logLabel} failed`, error);
		}
	} catch (caught) {
		console.error(`${input.logLabel} failed`, caught);
	}
}

export async function sendPasswordResetEmail(input: {
	to: string;
	name: string;
	url: string;
}): Promise<void> {
	const greetingName = input.name.trim() || 'there';
	const safeName = escapeHtml(greetingName);
	const safeUrl = escapeHtml(input.url);

	await sendTransactionalEmail({
		to: input.to,
		subject: 'Reset your Body Ledger password',
		title: 'Reset your password',
		body: `Hi ${safeName}, use the button below to choose a new password. The link expires in one hour.`,
		url: safeUrl,
		buttonLabel: 'Choose a new password',
		logLabel: 'Password reset email',
		text: [
			`Hi ${greetingName},`,
			'',
			'Use this link to choose a new Body Ledger password. It expires in one hour.',
			'',
			input.url,
			'',
			'If you did not expect this, you can ignore the email.'
		].join('\n')
	});
}

export async function sendInviteEmail(input: { to: string; url: string }): Promise<void> {
	const safeUrl = escapeHtml(input.url);

	await sendTransactionalEmail({
		to: input.to,
		subject: 'You’re invited to Body Ledger',
		title: 'You’re invited',
		body: 'Someone invited you to Body Ledger. Create your account with the button below. The link expires in seven days, and you’ll be able to sign in right away.',
		url: safeUrl,
		buttonLabel: 'Create your account',
		logLabel: 'Invite email',
		text: [
			'Someone invited you to Body Ledger.',
			'',
			'Use this link to create your account. It expires in seven days, and you’ll be able to sign in right away.',
			'',
			input.url,
			'',
			'If you did not expect this, you can ignore the email.'
		].join('\n')
	});
}
