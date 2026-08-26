/**
 * Redirects the user to a URL based on the `url` query parameter, with optional
 * Wayback Machine support.
 *
 * If the `referer` header is not present or not approved, the user is redirected
 * to the index page.
 *
 * If the target URL is not reachable, the user is redirected to the Wayback
 * Machine version of the URL (if available).
 *
 * If the Wayback Machine version is not available, the user is redirected to the
 * original URL with a 302 status code.
 **/
import type { Config, Context } from 'https://edge.netlify.com';
import preApprovedData from './approved.json' with { type: 'json' };

const preApproved = preApprovedData as string[];
const defaultEndpoint = '/';
const defaultRedirectPage = '/index.html';
const defaultTimeout = 2000;
// how long the archive will wait for the live URL once the archive has already
// answered - this is the "weight" that favours sending people to the real page
const defaultGrace = 600;
// the CDX API can be slow, but not _forever_ slow
const waybackTimeout = 5000;
const allowUnapprovedToFollow = true; // set to false if self hosting
const debug = Deno.env.get('NETLIFY_DEV');

// this is the netlify path config, nothing more
export const config: Config = {
  path: defaultEndpoint,
};

function index(req: Request) {
  // if you're running your own version of this, you may not want this redirect
  return new URL(defaultRedirectPage, req.url);
}

function approved(referer: string) {
  return preApproved.some((domain) => referer === domain);
}

export default async function (req: Request, { next }: Context) {
  const referer: string = req.headers.get('referer') || '';

  const startTime = performance.now();
  let waybackDuration = -1;

  // if you landed on this url without a referer, then we'll redirect you to
  // the defaultRedirectPage
  if (!referer) {
    return index(req);
  }

  const root = new URL(referer);

  // this lets me work out if you're testing an XHR request (useful for debugging)
  const acceptsHTML = req.headers.get('accept')?.includes('text/html');

  // A helper function to generate a response depending on the request accept
  // header and if they don't (i.e. XHR) then we'll return JSON
  const redirect = (url: string, status: number) => {
    if (acceptsHTML) {
      return Response.redirect(url, status);
    } else {
      const now = performance.now();
      return new Response(
        JSON.stringify({
          status,
          url,
          ms: now - startTime,
          wayback: waybackDuration,
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
  };

  // Get the URL from the query string parameter 'url'
  const url = new URL(req.url);

  // urlParam will be converted into a "real" url later on and stored in targetUrl
  const urlParam = url.searchParams.get('url');

  // require a query `url` param, otherwise we get redirected to the index page
  if (urlParam === null) {
    return index(req);
  }

  // if there's a query (i.e. we passed the above) but the referer is not approved
  // then we'll redirect to the visitor to the page they intended to visit.
  // previously this would send to the the access page, but I'm wary of breaking
  // people's pages and having an unexpected result.
  if (!approved(root.hostname)) {
    if (debug) {
      console.log('unapproved referer', referer);
    }
    if (allowUnapprovedToFollow) {
      return Response.redirect(urlParam, 303);
    } else {
      // if you're not approved, then we'll just return a 204 (no content)
      return new Response(null, { status: 204 });
    }
  }

  try {
    const res = await next({ sendConditionalRequest: true });

    if (res.status === 304) {
      // if the client (browser) is has a cached version, just let them use it
      return res;
    }

    let useWayback = url.searchParams.get('wayback') as string | boolean;

    useWayback = useWayback !== 'false' && useWayback !== '0' && useWayback;

    let originMatch = !!url.searchParams.get('origin-match') as
      | string
      | boolean;

    originMatch = originMatch !== 'false' && originMatch !== '0' && originMatch;

    const timeout = parseInt(
      url.searchParams.get('timeout') || defaultTimeout + '',
      10
    );

    const grace = parseInt(
      url.searchParams.get('grace') || defaultGrace + '',
      10
    );

    let targetUrl: null | URL = null;
    try {
      targetUrl = new URL(urlParam);
    } catch (_) {
      // if the URL can't be parsed properly, redirect the user _back_ to the
      // site they came from adding the query string for later debugging.
      return redirect(root.toString() + '?bad-url=' + urlParam, 302);
    }

    if (debug) {
      console.log('request settings', {
        targetUrl: targetUrl.toString(),
        useWayback,
        originMatch,
        timeout,
        grace,
      });
    }

    // Both lookups run at the same time and we take whichever answers first,
    // rather than only going near the archive once the origin has proven itself
    // slow. The live URL is weighted: if the archive gets there first we still
    // hold the door open for `grace` ms in case the origin is just behind it.
    const waybackStart = performance.now();
    // lets us cancel the speculative archive lookup if the live URL wins
    const waybackController = new AbortController();
    const waybackPromise = lookupWayback(
      urlParam,
      url.searchParams.get('date'),
      waybackController.signal
    ).then((archived) => {
      waybackDuration = performance.now() - waybackStart;
      return archived;
    });

    // ?wayback means "skip the origin entirely", so resolve it as un-usable
    const livePromise = useWayback
      ? Promise.resolve(0)
      : checkOrigin(targetUrl, timeout, originMatch);

    const first = await Promise.race([
      livePromise.then((status) => ({ from: 'live', status })),
      waybackPromise.then(() => ({ from: 'wayback', status: 0 })),
    ]);

    let status = first.status;

    if (first.from === 'wayback' && !useWayback) {
      // archive won the race - give the origin its head start before we give up
      if (debug) {
        console.log(`wayback answered first, waiting up to ${grace}ms more`);
      }
      status = await Promise.race([livePromise, resolveAfter(grace, 0)]);
    }

    if (debug) {
      console.log('race result', { winner: first.from, status });
    }

    // Check the status code of the response
    if (status === 200) {
      // the target page is fine, so redirect to it as a perma-redirect and
      // drop the archive lookup we no longer need
      waybackController.abort();
      return redirect(urlParam, 301);
    }

    // the origin is down/rotted/too slow, so use the archive - which by now has
    // either already landed or is close behind
    const archived = await waybackPromise;

    if (archived) {
      // Redirect to the URL from Wayback Machine
      return redirect(archived, 301);
    }

    // fail: sending 302 to original URL, there's no wayback data available
    return redirect(targetUrl.toString(), 302);
  } catch (error) {
    // Handle any errors that occur during the execution
    console.log('[fail] errored: ' + (error as Error).message);
    return redirect(urlParam, 302);
  }
}

/**
 * Checks whether the live URL is actually serving the page we asked for.
 * Always resolves - a non-200 result means "use the archive instead".
 */
async function checkOrigin(
  targetUrl: URL,
  timeout: number,
  originMatch: boolean | string
): Promise<number> {
  try {
    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: 'HEAD',
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
          accept: '*/*',
        },
      },
      timeout
    );

    if (debug) {
      console.log('fetch response', response);
    }

    let status = response.status;

    // we only ever care about the status/redirect chain, so let the body go
    await response.body?.cancel();

    // if we've been redirected, then try to detect for zombie pages
    if (response.redirected) {
      const redirectUrl = new URL(response.url);
      // first, if the origin completely changed, and we don't want origin swaps
      // let's use the archive
      if (redirectUrl.hostname !== targetUrl.hostname) {
        // origin redirect
        if (originMatch) {
          status = 404;
        }
      }

      // if we redirected and the path is the root (and we weren't looking for
      // the root) then it's a 404/zombie, even if it's a 200
      if (redirectUrl.pathname === '/' && targetUrl.pathname !== '/') {
        if (debug) {
          console.log('path redirected to root, flagging as 404');
        }

        status = 404;
      }
    }

    return status;
  } catch (e) {
    const _ = e as Error;
    if (_.message.includes('429')) {
      // too many requests, origin is telling unrot.link to back off
      // assume they'll let the client reach the origin though
      return 200;
    }

    if (debug) {
      console.log(
        'target request error (incl 404)',
        targetUrl.toString(),
        _.message
      );
    } else if (!_.message.includes('404')) {
      console.log('target request error', targetUrl.toString(), _.message);
    }

    return 400;
  }
}

/**
 * Asks the Wayback Machine CDX API for a snapshot of the URL, optionally from
 * around the date of the post linking to it. Always resolves - null means
 * "nothing archived".
 */
async function lookupWayback(
  urlParam: string,
  date: string | null,
  externalSignal: AbortSignal
): Promise<string | null> {
  let waybackUrl = `https://web.archive.org/cdx/search/cdx?output=json&filter=statuscode:200&url=${encodeURIComponent(
    urlParam
  )}&`;

  // then add the date of the blog post (if we can from that) to get an
  // good representative of the page at the time
  if (date) {
    waybackUrl += `from=${date.replace(/\D/g, '')}&`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), waybackTimeout);
  // if the live URL got there first, this lookup is dead weight
  const onExternalAbort = () => controller.abort();
  externalSignal.addEventListener('abort', onExternalAbort);

  const options = {
    headers: {
      'user-agent': 'unrot.link',
    },
    signal: controller.signal,
  };

  try {
    // -1 should work to get the latest result, but doesn't always…
    const waybackResponse = await fetch(
      waybackUrl + `limit=${date ? '1' : '-1'}`,
      options
    );

    const text = await waybackResponse.text();

    let waybackData: [string[], string[]] | [];

    try {
      waybackData = JSON.parse(text);
    } catch (e) {
      console.log(
        'failed to parse wayback data: ' +
          waybackUrl +
          `limit=${date ? '1' : '-1'}`
      );
      console.log(text);
      throw e;
    }

    if (waybackData.length === 0) {
      // do it again, but this time with a limit of 1
      const waybackResponse = await fetch(waybackUrl + `limit=1`, options);

      waybackData = (await waybackResponse.json()) as [string[], string[]];
    }

    if (debug) {
      console.log('wayback data', waybackUrl, waybackData[1]);
    }

    // Check if the Wayback Machine response includes a value of 200
    if (waybackData && waybackData.length > 1 && waybackData[1]) {
      return new URL(
        `https://web.archive.org/web/${waybackData[1][1]}/${waybackData[1][2]}`
      ).toString();
    }

    return null;
  } catch (error) {
    console.log('wayback lookup failed: ' + (error as Error).message);
    return null;
  } finally {
    clearTimeout(timeoutId);
    externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

async function fetchWithTimeout(
  uri: URL,
  options: RequestInit = {},
  time = 5000
): Promise<Response> {
  const controller = new AbortController();
  const config = { ...options, signal: controller.signal };

  const started = performance.now();
  const timeoutId = setTimeout(() => controller.abort(), time);

  try {
    const response = await fetch(uri, config);

    if (!response.ok) {
      // Plenty of sites answer HEAD badly while GET is perfectly healthy -
      // bsky.app 404s every HEAD, others send 403/405/501 - so a failed HEAD
      // is never enough on its own to call a page rotted. Retry with GET using
      // whatever is left of the time budget and believe that instead.
      if (options.method === 'HEAD') {
        await response.body?.cancel();
        return fetchWithTimeout(
          uri,
          { ...options, method: 'GET' },
          Math.max(time - (performance.now() - started), 250)
        );
      }

      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    // When we abort our `fetch`, the controller conveniently throws
    // a named error, allowing us to handle them separately from
    // other errors.
    if ((error as Error).name === 'AbortError') {
      throw new Error('Response timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveAfter<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
