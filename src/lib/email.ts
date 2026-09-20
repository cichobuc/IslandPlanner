import 'server-only';

/** Resend príde neskôr (RESEND_API_KEY); bez kľúča sa e-mail neposiela a vráti false. */
export async function sendTempPasswordEmail(input: {
  to: string;
  displayName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'Island Planner <onboarding@resend.dev>',
      to: input.to,
      subject: 'Island Planner – tvoje konto',
      text: `Ahoj ${input.displayName},\n\nmáš konto v Island Planneri.\nPrihlásenie: ${input.appUrl}/sk/prihlasenie\nE-mail: ${input.to}\nDočasné heslo: ${input.tempPassword}\n\nPo prihlásení si heslo zmeníš.\n`,
    }),
  });
  return res.ok;
}
