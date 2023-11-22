import type { Context } from 'https://edge.netlify.com';

const allow = ['unrot.link'];

if (Deno.env.get('NETLIFY_DEV')) {
  allow.push('localhost');
}

export default async (
  request: Request,
  context: Context
): Promise<Response> => {
  const referer = request.headers.get('referer') || '';

  let allowed = false;
  try {
    const url = new URL(referer);
    allowed = allow.some((domain) => url.hostname.includes(domain));
  } catch (_) {
    // noop
  }

  if (referer && !allowed) {
    return new Response(
      `alert("You do not want to hotlink this script - download it directly and host yourself: https://unrot.link/static/redirect.js")`,
      {
        status: 303,
        headers: {
          'content-type': 'application/javascript',
        },
      }
    );
  }

  const response = await context.next();
  return response;
};
