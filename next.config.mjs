import fs from 'node:fs';
import path from 'node:path';

/**
 * The marketing/app pages are plain HTML in /public (e.g. public/invest/index.html) and link
 * to each other with relative paths. trailingSlash keeps those relative links resolving the
 * same way they did on the static site, and the rewrites below map each folder URL
 * (/invest/) to its index.html.
 */
function htmlFolders(dir = '') {
  const abs = path.join(process.cwd(), 'public', dir);
  const out = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const rel = path.posix.join(dir, e.name);
    if (fs.existsSync(path.join(abs, e.name, 'index.html'))) out.push(rel);
    out.push(...htmlFolders(rel));
  }
  return out;
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      ...htmlFolders().map((f) => ({ source: `/${f}/`, destination: `/${f}/index.html` })),
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
