function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESET_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    const error = new Error('Password reset email delivery is not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your Interviewly password',
      html: `<p>Hello ${safeName},</p><p>Use this secure link to choose a new password. It expires in 30 minutes.</p><p><a href="${safeUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      text: `Hello ${name || 'there'},\n\nReset your Interviewly password using this link. It expires in 30 minutes:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    }),
  });

  if (!response.ok) {
    const error = new Error(`Reset email delivery failed with HTTP ${response.status}`);
    error.code = 'EMAIL_DELIVERY_FAILED';
    throw error;
  }
}

module.exports = { sendPasswordResetEmail };
