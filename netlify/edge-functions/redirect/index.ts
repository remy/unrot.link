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

const defaultEndpoint = '/';
const defaultRedirectPage = '/index.html';
const defaultTimeout = 2000;
const allowUnapprovedToFollow = true; // set to false if self hosting
const debug = true;

const preApproved = ['remysharp.com', 'unrot.link'];

if (Deno.env.get('NETLIFY_DEV')) {
  preApproved.push('localhost');
}

// this is the netlify path config, nothing more
export const config: Config = {
  path: defaultEndpoint,
};

function index(req: Request) {
  // if you're running your own version of this, you may not want this redirect
  return new URL(defaultRedirectPage, req.url);
}

function approved(referer: string) {
  return preApproved.some((domain) => referer.includes(domain));
}

export default async function (req: Request, { next }: Context) {
  const referer: string = req.headers.get('referer') || '';

  const startTime = performance.now();
  let waybackResponseStart = 0;

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
          wayback: waybackResponseStart ? now - waybackResponseStart : -1,
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
  if (!approved(referer)) {
    if (allowUnapprovedToFollow) {
      return Response.redirect(urlParam, 302);
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

    let useWayback = !!url.searchParams.get('wayback');
    const originMatch = !!url.searchParams.get('origin-match');
    const timeout = parseInt(
      url.searchParams.get('timeout') || defaultTimeout + '',
      10
    );

    let targetUrl = null;
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
      });
    }

    // now we'll try to _quickly_ connect to the origin, allowing for a 200ms
    // timeout (which _should_ be enough). If the connection times out, then
    // it's very likely the host is down, so we'll use the wayback machine.
    try {
      const connectPromise = Deno.connect({
        hostname: targetUrl.hostname,
        port: parseInt(targetUrl.port, 10) || 80,
      });
      await Promise.race([
        connectPromise.then((conn) => conn.close()),
        timeoutPromise(200),
      ]);
      if (debug) {
        console.log('connected to origin');
      }
    } catch (_) {
      // if connect to origin fails/times out, then we'll use the wayback machine
      if (debug) {
        console.log(
          'failed to connect to origin - switching to wayback',
          _.message
        );
      }
      useWayback = true;
    }

    let status = 0;

    // if we're not using the wayback machine, then just try to request the URL
    if (!useWayback) {
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

        status = response.status;

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
      } catch (_) {
        if (debug) {
          console.log(
            'target request error (incl 404)',
            targetUrl.toString(),
            _.message
          );
        } else if (!_.message.includes('404')) {
          console.log('target request error', targetUrl.toString(), _.message);
        }
        status = 400;
      }
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

      const headers = {
        'user-agent': 'unrot.link',
      };

      waybackResponseStart = performance.now();

      // -1 should work to get the latest result, but doesn't always…
      const waybackResponse = await fetch(waybackUrl + `limit=-1`, {
        headers,
      });

      let waybackData = (await waybackResponse.json()) as
        | [string[], string[]]
        | [];

      if (waybackData.length === 0) {
        // do it again, but this time with a limit of 1
        const waybackResponse = await fetch(waybackUrl + `limit=1`, {
          headers,
        });

        waybackData = (await waybackResponse.json()) as [string[], string[]];
      }

      if (debug) {
        console.log('wayback data', waybackData[1]);
      }

      // Check if the Wayback Machine response includes a value of 200
      if (waybackData && waybackData.length > 1 && waybackData[1]) {
        // Redirect to the URL from Wayback Machine
        const waybackUrl = new URL(
          `https://web.archive.org/web/${waybackData[1][1]}/${waybackData[1][2]}`
        );
        return redirect(waybackUrl.toString(), 301);
      } else {
        // fail: sending 302 to original URL, there's no wayback data available
        return redirect(targetUrl.toString(), 302);
      }
    }
  } catch (error) {
    // Handle any errors that occur during the execution
    console.log('[fail] errored: ' + error.message);
    return redirect(root.toString() + '?source=unrot.link-failed', 302);
  }
}

async function fetchWithTimeout(
  uri: URL,
  options = {},
  time = 5000
): Promise<Response> {
  const controller = new AbortController();
  const config = { ...options, signal: controller.signal };

  setTimeout(() => controller.abort(), time);

  try {
    const response = await fetch(uri, config);

    if (!response.ok) {
      if (response.status === 405) {
        return fetchWithTimeout(uri, { ...options, method: 'GET' }, time);
      }

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

function timeoutPromise(ms: number) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
}
