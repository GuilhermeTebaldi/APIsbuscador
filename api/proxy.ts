export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  const { url, method = 'GET', headers = {}, body } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      ok: false,
      error: "Parâmetro 'url' é obrigatório no corpo da requisição."
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ ok: false, error: 'URL inválida.' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ ok: false, error: 'Apenas protocolos http/https são suportados.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    };

    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...defaultHeaders,
        ...headers
      },
      signal: controller.signal
    };

    if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
      if (typeof body === 'object') {
        fetchOptions.body = JSON.stringify(body);
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      } else {
        fetchOptions.body = String(body);
      }
    }

    const startedAt = Date.now();
    const upstream = await fetch(url, fetchOptions);
    clearTimeout(timeout);

    const durationMs = Date.now() - startedAt;
    const contentType = upstream.headers.get('content-type') || '';
    const data = contentType.toLowerCase().includes('application/json')
      ? await upstream.json()
      : await upstream.text();

    return res.status(200).json({
      ok: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
      headers: Object.fromEntries(upstream.headers.entries()),
      durationMs,
      data
    });
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError';
    return res.status(502).json({
      ok: false,
      error: isAbort
        ? 'Tempo limite excedido ao conectar com a API externa.'
        : (error?.message || 'Erro desconhecido ao conectar com a API externa.')
    });
  }
}
