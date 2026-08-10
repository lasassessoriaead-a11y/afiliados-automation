import jwt from 'jsonwebtoken';

export function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado');
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw Object.assign(new Error('Não autenticado'), { statusCode: 401 });
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw Object.assign(new Error('Token inválido ou expirado'), { statusCode: 401 });
  }
}

export function sendError(res, error) {
  const status = error.statusCode || 500;
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor' : error.message });
}
