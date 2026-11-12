import app from '../src/server/app';

export default function handler(req: any, res: any) {
  // On Vercel, when rewritten, recover the original path from headers
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'];

  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  }

  return app(req, res);
}
