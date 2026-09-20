import 'dotenv/config';
import { createUserWithTempPassword } from '../src/lib/auth/create-user';

// Prvý správca inštancie (ADMIN_EMAIL) – spustiť raz: pnpm admin:bootstrap "Meno"
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) throw new Error('ADMIN_EMAIL chýba v .env');
  const name = process.argv[2] ?? 'Správca';
  const r = await createUserWithTempPassword({ email, displayName: name, createdBy: null, isAdmin: true });
  if (!r.ok) throw new Error(r.reason);
  console.log(
    `${r.existed ? 'Reset' : 'Založené'}: ${email}\nDočasné heslo: ${r.tempPassword}\nE-mail odoslaný: ${r.emailSent ? 'áno' : 'nie (bez RESEND_API_KEY)'}`,
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
