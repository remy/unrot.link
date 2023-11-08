/**
 * Redirects the user to a URL based on the `url` query parameter, with optional
 * Wayback Machine support.
 * If the `referer` header is not present or not approved, the user is redirected
 * to the index page.
 * If the target URL is not reachable, the user is redirected to the Wayback
 * Machine version of the URL (if available).
 * If the Wayback Machine version is not available, the user is redirected to the
 * original URL with a 302 status code.
 **/
import type { Config, Context } from 'https://edge.netlify.com';

const defaultTimeout = 2000;

const preApproved = ['remysharp.com', 'unrot.link'];

if (Deno.env.get('NETLIFY_DEV')) {
  preApproved.push('localhost');
}

// this is the netlify path config, nothing more
export const config: Config = {
  path: '/',
};

function index(req: Request) {
  return new URL('/index.html', req.url);
}

function approved(referer: string) {
  return preApproved.some((domain) => referer.includes(domain));
}

export default async function (req: Request, { next }: Context) {
  const referer: string = req.headers.get('referer') || '';

  if (!referer) {
    return index(req);
  }

  const root = new URL(referer);

  if (!approved(referer)) {
    return Response.redirect('/access', 302);
  }

  const acceptsHTML = req.headers.get('accept')?.includes('text/html');

  // A helper function to generate a response depending on the request accept
  // header and if they don't (i.e. XHR) then we'll return JSON
  const redirect = (url: string, status: number) => {
    if (acceptsHTML) {
      return Response.redirect(url, status);
    } else {
      return new Response(JSON.stringify({ status, url }), {
        headers: {
          'content-type': 'application/json',
        },
      });
    }
  };

  // Get the URL from the query string parameter 'url'
  const url = new URL(req.url);
  const urlParam = url.searchParams.get('url');

  // return the index page
  if (urlParam === null) {
    return index(req);
  }

  try {
    const res = await next({ sendConditionalRequest: true });

    const useWayback = !!url.searchParams.get('wayback');
    const timeout = parseInt(
      url.searchParams.get('timeout') || defaultTimeout + '',
      10
    );

    if (res.status === 304) {
      // if the client is has a cached version, just let them do it
      return res;
    }

    let targetUrl = null;
    try {
      targetUrl = new URL(urlParam);
    } catch (_) {
      return redirect(root.toString() + '?bad-url=' + urlParam, 302);
    }

    let status = 0;

    try {
      if (!useWayback) {
        // set a 2s timeout (1s was too tight for some sites)
        const response = await fetchWithTimeout(targetUrl, {}, timeout);
        status = response.status;
      }
    } catch (_) {
      status = 400;
    }

    // Check the status code of the response
    if (status === 200) {
      // the target page is fine, so redirect to it as a perma-redirect
      return redirect(urlParam, 301);
    } else {
      // If the status code is not 200, fetch the Wayback Machine CDX API
      let waybackUrl = `https://web.archive.org/cdx/search/cdx?output=json&filter=statuscode:200&url=${encodeURIComponent(
        urlParam
      )}&`;

      // then add the date of the blog post (if we can from that) to get an
      // good representative of the page at the time
      const date = url.searchParams.get('date');
      if (date) {
        waybackUrl += `from=${date.replace(/\D/g, '')}&`;
      }

      // then just take one result (ideally we use -1, but this doesn't
      // reliably work) - sometimes it gives zero results
      waybackUrl += `limit=1`;

      const waybackResponse = await fetch(waybackUrl, {
        headers: {
          'user-agent': 'unrot.link',
        },
      });
      const waybackData = (await waybackResponse.json()) as [
        string[],
        string[]
      ];

      // Check if the Wayback Machine response includes a value of 200
      if (waybackData && waybackData.length > 1 && waybackData[1]) {
        // Redirect to the URL from Wayback Machine
        const waybackUrl = new URL(
          `https://web.archive.org/web/${waybackData[1][1]}/${waybackData[1][2]}`
        );
        return redirect(waybackUrl.toString(), 301);
      } else {
        // fail: sending 302 to original URL, unknown
        return redirect(targetUrl.toString(), 302);
      }
    }
  } catch (error) {
    // Handle any errors that occur during the execution
    console.log('[fail] errored: ' + error.message);
    return redirect(root.toString() + '?source=unrot.link-failed', 302);
  }
}

async function fetchWithTimeout(uri: URL, options = {}, time = 5000) {
  const controller = new AbortController();
  const config = { ...options, signal: controller.signal };

  setTimeout(() => controller.abort(), time);

  try {
    const response = await fetch(uri, config);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    // When we abort our `fetch`, the controller conveniently throws
    // a named error, allowing us to handle them separately from
    // other errors.
    if (error.name === 'AbortError') {
      throw new Error('Response timed out');
    }

    throw new Error(error.message);
  }
}
