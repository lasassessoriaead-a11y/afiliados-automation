import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  try {
    const auth = requireAuth(req);

    if (req.method === 'GET') {
      const result = await query(
        `select id, original_url, affiliate_url, marketplace, created_at
         from affiliate_links where user_id=$1 order by created_at desc`,
        [auth.sub]
      );
      return res.status(200).json({ links: result.rows });
    }

    if (req.method === 'POST') {
      const { originalUrl, affiliateUrl, marketplace } = req.body || {};
      if (!originalUrl || !affiliateUrl || !marketplace) {
        return res.status(400).json({ error: 'URL original, URL de afiliado e marketplace são obrigatórios' });
      }
      const result = await query(
        `insert into affiliate_links (user_id, original_url, affiliate_url, marketplace)
         values ($1,$2,$3,$4)
         returning id, original_url, affiliate_url, marketplace, created_at`,
        [auth.sub, String(originalUrl).trim(), String(affiliateUrl).trim(), String(marketplace).trim()]
      );
      return res.status(201).json({ link: result.rows[0] });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    sendError(res, error);
  }
}
