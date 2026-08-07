export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  res.status(200).json({ name: 'Afiliados Automation API', version: '0.2.0' });
}
