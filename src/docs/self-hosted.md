
## API

This domain, https://unrot.link is the API endpoint for the service. It accepts a single GET request with the following parameters:

- **`url`** *(required)* - the URL to check for link rot
- **`date`** - the timestamp to use when checking for a web.archive.org copy of the URL. This should be in the format `YYYY-MM-DD HH:MM:SS` (e.g. `2019-01-01 00:00:00` for 1st January 2019 at midnight). If not provided, the latest available copy will be used. Note that the time is not required.
- **`origin-match`** - a boolean to return a web.archive.org link if the URL tries to redirect to a different origin. This is useful if you want to ensure that the link is still pointing to the same domain, but potentially problematic if a domain redirects to an intermediary (as for example [yahoo](https://yahoo.com) does). Defaults to `false`.
- **`wayback`** - a boolean to force unrot.link to always return the web.archive.org copy of the URL, even if it's not a 404. Defaults to `false`.
- **`timeout`** - the number of milliseconds to wait for a response from the given `url` before assuming a failure and moving onto requesting the page from the web.archive.org API. Defaults to 2000 (2 seconds).
