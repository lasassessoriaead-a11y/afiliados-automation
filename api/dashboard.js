import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const auth = requireAuth(req);
    const totals = await query(
      `select
        count(*)::int as products,
        coalesce(sum(clicks),0)::int as clicks,
        coalesce(sum(conversions),0)::int as conversions,
        coalesce(sum((price * commission_percent / 100) * conversions),0)::numeric(14,2) as estimated_revenue
       from products where user_id=$1`,
      [auth.sub]
    );
    const marketplaces = await query(
      `select marketplace, count(*)::int as products, coalesce(sum(clicks),0)::int as clicks, coalesce(sum(conversions),0)::int as conversions
       from products where user_id=$1 group by marketplace order by products desc`,
      [auth.sub]
    );
    res.status(200).json({ metrics: totals.rows[0], marketplaces: marketplaces.rows });
  } catch (error) {
    sendError(res, error);
  }
}
