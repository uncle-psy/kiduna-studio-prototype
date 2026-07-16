export async function sendVerificationEmail(input: { email: string; name: string; verificationUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!apiKey || !domain) return { delivered: false, reason: "provider_not_configured" } as const;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Ki at Kiduna <hello@${domain}>`,
      to: [input.email],
      subject: "Verify your Kiduna Studio prototype account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#241810"><p style="color:#177f87;text-transform:uppercase;letter-spacing:.12em;font-size:12px">Kiduna Studio · Prototype</p><h1>Welcome, ${escapeHtml(input.name)}.</h1><p>This invitation opens the prototype Field. Verify your email to continue.</p><p><a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;padding:13px 18px;background:#35d8e5;color:#09282a;text-decoration:none;border-radius:10px;font-weight:700">Verify email and enter</a></p><p style="font-size:12px;color:#75675f">This is an experimental prototype, not the deployed Kiduna system. If you did not request this, ignore this email.</p></div>`,
    }),
  });
  return response.ok ? { delivered: true } as const : { delivered: false, reason: `provider_${response.status}` } as const;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}
