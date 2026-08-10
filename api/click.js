import { query } from './_db.js';
import { sendError } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId é obrigatório' });
    const result = await query(
      `update products set clicks = clicks + 1, updated_at = now()
       where id = $1
       returning id, affiliate_url, original_url, clicks`,
      [String(productId)]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
    const product = result.rows[0];
    return res.status(200).json({ productId: product.id, clicks: product.clicks, destination: product.affiliate_url || product.original_url });
  } catch (error) {
    sendError(res, error);
  }
}
