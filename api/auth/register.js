import bcrypt from 'bcryptjs';
import { query } from '../_db.js';
import { signToken, sendError } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Nome, e-mail e senha com no mínimo 8 caracteres são obrigatórios' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query('select id from users where email = $1 limit 1', [normalizedEmail]);
    if (existing.rowCount) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const userCount = await query('select count(*)::int as total from users');
    if (userCount.rows[0].total > 0) {
      return res.status(403).json({ error: 'Cadastro público desativado. Solicite acesso ao administrador.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, 'admin')
       returning id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    sendError(res, error);
  }
}
