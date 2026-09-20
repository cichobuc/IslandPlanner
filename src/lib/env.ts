// Prístup k env s jasnou chybou, keď niečo chýba (kľúče len na serveri).
export function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Chýba env premenná ${name}`);
  return v;
}
export const publicEnv = {
  supabaseUrl: () => env('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
};
