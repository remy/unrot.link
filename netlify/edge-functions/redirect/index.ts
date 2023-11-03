// @ts-expect-error
import type { Config, Context } from 'https://edge.netlify.com';

const defaultTimeout = 2000;

// this is the netlify path config, nothing more
export const config: Config = {
  path: '/',
};

function index() {
  return new Response('<title>unrot.link</title><p>Hello world', {
    status: 200,
  });
}

export default async function (req: Request, { next }: Context) {
  const referer: string = req.headers.get('referer') || '';

  if (!referer) {
    return index();
  }

  const root = new URL(referer);

  try {
    // Get the URL from the query string parameter 'url'
    const url = new URL(req.url);
    const urlParam = url.searchParams.get('url');

    // return the index page
    if (urlParam === null) {
      return index();
    }

    // TODO if we have a url param we should try to validate the referrer

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

    const targetUrl = new URL(urlParam);

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
      return Response.redirect(urlParam, 301);
    } else {
      // If the status code is not 200, fetch the Wayback Machine CDX API
      let waybackUrl = `https://web.archive.org/cdx/search/cdx?output=json&filter=statuscode:200&url=${encodeURIComponent(
        urlParam
      )}&`;

      // then add the date of the blog post (if we can from that) to get an
      // good representative of the page at the time
      const date = url.searchParams.get('date');
      if (date) {
        waybackUrl += `from=${date}&limit=1`;
      } else {
        // otherwise just take the last 200
        waybackUrl += `limit=-1`;
      }

      const waybackResponse = await fetch(waybackUrl, {
        headers: {
          'user-agent': 'unrot.link',
        },
      });
      const waybackData = (await waybackResponse.json()) as [
        String[],
        String[]
      ];

      // Check if the Wayback Machine response includes a value of 200
      if (waybackData && waybackData.length > 1 && waybackData[1]) {
        // Redirect to the URL from Wayback Machine
        const waybackUrl = new URL(
          `https://web.archive.org/web/${waybackData[1][1]}/${waybackData[1][2]}`
        );
        return Response.redirect(waybackUrl, 301);
      } else {
        // fail: sending 302 to original URL, unknown
        return Response.redirect(targetUrl, 302);
      }
    }
  } catch (error) {
    // Handle any errors that occur during the execution
    console.log('[fail] errored: ' + error.message);
    return Response.redirect(root, 500);
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
