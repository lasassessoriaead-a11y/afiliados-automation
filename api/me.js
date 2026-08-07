import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const auth = requireAuth(req);
    const result = await query('select id, name, email, role, created_at from users where id = $1 limit 1', [auth.sub]);
    if (!result.rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    sendError(res, error);
  }
}
