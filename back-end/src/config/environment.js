// Support Vercel's integration prefix without duplicating connection settings.
export const databaseUrl = () =>
  process.env.DATABASE_URL ||
  process.env.codexthemelibrary_POSTGRES_URL ||
  process.env.codexthemelibrary_DATABASE_URL;

export const isProduction = () =>
  Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
