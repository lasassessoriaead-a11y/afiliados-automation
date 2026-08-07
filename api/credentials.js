import { query } from './_db.js';
import { requireAuth, sendError } from './_auth.js';

export default async function handler(req, res) {
  try {
    const auth = requireAuth(req);

    if (req.method === 'GET') {
      const result = await query(
        `select id, platform, account_label, affiliate_id, status, created_at, updated_at
         from credentials where user_id=$1 order by created_at desc`,
        [auth.sub]
      );
      return res.status(200).json({ credentials: result.rows });
    }

    if (req.method === 'POST') {
      const { platform, accountLabel, affiliateId, token } = req.body || {};
      if (!platform || !token) return res.status(400).json({ error: 'Plataforma e token são obrigatórios' });
      const result = await query(
        `insert into credentials (user_id, platform, account_label, affiliate_id, token_secret)
         values ($1,$2,$3,$4,$5)
         returning id, platform, account_label, affiliate_id, status, created_at, updated_at`,
        [auth.sub, String(platform).trim(), accountLabel ? String(accountLabel).trim() : null, affiliateId ? String(affiliateId).trim() : null, String(token)]
      );
      return res.status(201).json({ credential: result.rows[0] });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    sendError(res, error);
  }
}
