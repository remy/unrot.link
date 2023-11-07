import type { Config } from 'https://edge.netlify.com';

export default function () {
  return new Response(null, {
    status: 206,
    headers: {
      'cache-control': `public, s-maxage=${3600 * 24}`, // 1 day
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'HEAD',
    },
  });
}

export const config: Config = {
  path: '/ping',
  cache: 'manual',
};
