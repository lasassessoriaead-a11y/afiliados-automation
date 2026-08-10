import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  try {
    const auth = requireAuth(req);
    const id = String(req.query?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID do produto é obrigatório' });

    if (req.method === 'GET') {
      const result = await query(
        `select id, name, marketplace, price, commission_percent, original_url, affiliate_url, status, clicks, conversions, created_at, updated_at
         from products where id = $1 and user_id = $2 limit 1`,
        [id, auth.sub]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
      return res.status(200).json({ product: result.rows[0] });
    }

    if (req.method === 'PATCH') {
      const current = await query('select * from products where id = $1 and user_id = $2 limit 1', [id, auth.sub]);
      if (!current.rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
      const old = current.rows[0];
      const body = req.body || {};
      const result = await query(
        `update products set
          name=$1, marketplace=$2, price=$3, commission_percent=$4, original_url=$5, affiliate_url=$6, status=$7, updated_at=now()
         where id=$8 and user_id=$9
         returning id, name, marketplace, price, commission_percent, original_url, affiliate_url, status, clicks, conversions, created_at, updated_at`,
        [
          body.name ?? old.name,
          body.marketplace ?? old.marketplace,
          body.price ?? old.price,
          body.commissionPercent ?? old.commission_percent,
          body.originalUrl ?? old.original_url,
          body.affiliateUrl ?? old.affiliate_url,
          body.status ?? old.status,
          id,
          auth.sub,
        ]
      );
      return res.status(200).json({ product: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      const result = await query('delete from products where id = $1 and user_id = $2 returning id', [id, auth.sub]);
      if (!result.rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    sendError(res, error);
  }
}
