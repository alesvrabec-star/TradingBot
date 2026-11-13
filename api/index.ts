import app from '../src/server/app';

export default function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || '/';
    const urlObj = new URL(rawUrl, 'http://localhost');
    const pathParam = urlObj.searchParams.get('__path');

    if (pathParam !== null) {
      urlObj.searchParams.delete('__path');
      const qs = urlObj.searchParams.toString();
      const cleanPath = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;
      const rewritten = `/api${cleanPath}${qs ? `?${qs}` : ''}`;
      req.url = rewritten;
      req.originalUrl = rewritten;
    } else {
      const matchedPath =
        req.headers['x-matched-path'] ||
        req.headers['x-vercel-matched-path'] ||
        req.headers['x-forwarded-uri'] ||
        req.headers['x-original-url'];

      if (
        typeof matchedPath === 'string' &&
        matchedPath.startsWith('/api/') &&
        (req.url === '/api' || req.url === '/')
      ) {
        const qs = urlObj.searchParams.toString();
        const rewritten = `${matchedPath}${qs ? `?${qs}` : ''}`;
        req.url = rewritten;
        req.originalUrl = rewritten;
      }
    }
  } catch (e) {
    console.error('URL rewrite recovery error:', e);
  }

  return app(req, res);
}
