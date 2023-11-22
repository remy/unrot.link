# Self hosted unrot process

This server is based on the Netlify Edge functions. So if you're also hosting on Netlify, you should be able to use this source code or a variation of it.

The full source code is available on github: [remy/unrot.link](https://github.com/remy/unrot.link).

The redirect process can be seen in the [interactive "how it works"](/docs/how) page.

A simplified implementation of the backend has been documented over on [Remy Sharp's blog post](https://remysharp.com/2023/09/26/no-more-404#backend--server-side).

Jeremy Keith has written a version that [runs using PHP](https://gist.github.com/adactio/3d6983bea9b30c993a65b12537ce930c) (seen under the "Link rot" heading) ([original blog post](https://adactio.com/journal/20589#:~:text=Indie%20Web%20Camp.-,Link%20rot,-I%20was%20very)).

If you plan to design your own version, please consider posting a [pull request to the repo](https://github.com/remy/unrot.link) so that others can benefit from your work.

## API

This domain, https://unrot.link is the API endpoint for the service. It accepts a single GET request with the following parameters:

- **`url`** *(required)* - the URL to check for link rot
- **`date`** - the timestamp to use when checking for a web.archive.org copy of the URL. This should be in the format `YYYY-MM-DD HH:MM:SS` (e.g. `2019-01-01 00:00:00` for 1st January 2019 at midnight). If not provided, the latest available copy will be used. Note that the time is not required.
- **`origin-match`** - a boolean to return a web.archive.org link if the URL tries to redirect to a different origin. This is useful if you want to ensure that the link is still pointing to the same domain, but potentially problematic if a domain redirects to an intermediary (as for example [yahoo](https://yahoo.com) does). Defaults to `false`.
- **`wayback`** - a boolean to force unrot.link to always return the web.archive.org copy of the URL, even if it's not a 404. Defaults to `false`.
- **`timeout`** - the number of milliseconds to wait for a response from the given `url` before assuming a failure and moving onto requesting the page from the web.archive.org API. Defaults to 2000 (2 seconds).
