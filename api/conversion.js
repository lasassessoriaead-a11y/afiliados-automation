import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const auth = requireAuth(req);
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId é obrigatório' });
    const result = await query(
      `update products set conversions = conversions + 1, updated_at = now()
       where id = $1 and user_id = $2
       returning id, conversions`,
      [String(productId), auth.sub]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.status(200).json({ productId: result.rows[0].id, conversions: result.rows[0].conversions });
  } catch (error) {
    sendError(res, error);
  }
}
