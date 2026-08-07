import bcrypt from 'bcryptjs';
import { query } from '../_db.js';
import { signToken, sendError } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    const result = await query(
      'select id, name, email, password_hash, role, created_at from users where email = $1 limit 1',
      [email.trim().toLowerCase()]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Credenciais inválidas' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });
    delete user.password_hash;
    res.status(200).json({ user, token: signToken(user) });
  } catch (error) {
    sendError(res, error);
  }
}
