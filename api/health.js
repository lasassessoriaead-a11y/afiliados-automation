import { query } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let database = 'not_configured';
  if (databaseConfigured) {
    try {
      await query('select 1');
      database = 'ok';
    } catch {
      database = 'error';
    }
  }
  res.status(database === 'error' ? 503 : 200).json({
    service: 'afiliados-automation-api',
    status: database === 'error' ? 'degraded' : 'ok',
    database,
    timestamp: new Date().toISOString(),
  });
}
