import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  try {
    const auth = requireAuth(req);

    if (req.method === 'GET') {
      const search = String(req.query?.search || '').trim();
      const marketplace = String(req.query?.marketplace || '').trim();
      const params = [auth.sub];
      const filters = ['user_id = $1'];

      if (search) {
        params.push(`%${search}%`);
        filters.push(`name ilike $${params.length}`);
      }
      if (marketplace) {
        params.push(marketplace);
        filters.push(`marketplace = $${params.length}`);
      }

      const result = await query(
        `select id, name, marketplace, price, commission_percent, original_url, affiliate_url, status, clicks, conversions, created_at, updated_at
         from products
         where ${filters.join(' and ')}
         order by created_at desc`,
        params
      );
      return res.status(200).json({ products: result.rows });
    }

    if (req.method === 'POST') {
      const { name, marketplace, price, commissionPercent, originalUrl, affiliateUrl } = req.body || {};
      if (!name || !marketplace || price === undefined || !originalUrl) {
        return res.status(400).json({ error: 'Nome, marketplace, preço e URL original são obrigatórios' });
      }
      const result = await query(
        `insert into products (user_id, name, marketplace, price, commission_percent, original_url, affiliate_url)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id, name, marketplace, price, commission_percent, original_url, affiliate_url, status, clicks, conversions, created_at, updated_at`,
        [auth.sub, String(name).trim(), String(marketplace).trim(), Number(price), Number(commissionPercent || 0), String(originalUrl).trim(), affiliateUrl ? String(affiliateUrl).trim() : null]
      );
      return res.status(201).json({ product: result.rows[0] });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    sendError(res, error);
  }
}
