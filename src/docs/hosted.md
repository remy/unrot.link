# Hosted

Using this hosted service is free for use, but you will need to [get access](/access) before it's live to use on your web site.

It's recommended that you host your own version of the client script, which you can [download here](https://unrot.link/static/redirect.js).

Then initialise the script on your site by adding the following script tag to your site:

```html
<script async defer src="location_to_your/redirect.js"></script>
```

Once initialised, the redirect.js script will progressively enhance any outbound links on your site and route them through this service to check for link rot.

## How the client script works

When the redirect.js script is first loaded, it will send a one off ping to this service to check that it's still available. If it is, it will then start to progressively enhance any outbound links on your site.

This is done using a single event handler (using [event delegation](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation)). Only external links will be enhanced, and only links that are not already pointing to the web.archive.org domain.

In addition, if your web site uses the [h-entry microformat2](https://indieweb.org/h-entry) (sites like wordpress ), the script will also check for the `dt-published` property and use that timestamp when finding a web.archive copy of the given URL.

If your site doesn't use the `dt-published` property, then the archive copy will be the latest available copy that returned a `200` status code.

Note that you can modify the redirect.js file to discover the timestamp in other ways, or to use a different timestamp altogether. The format is described in the [API](#api) below.

## API

This domain, https://unrot.link is the API endpoint for the service. It accepts a single GET request with the following parameters:

- **`url`** *(required)* - the URL to check for link rot
- **`date`** - the timestamp to use when checking for a web.archive.org copy of the URL. This should be in the format `YYYY-MM-DD HH:MM:SS` (e.g. `2019-01-01 00:00:00` for 1st January 2019 at midnight). If not provided, the latest available copy will be used. Note that the time is not required.
- **`wayback`** - a boolean to force unrot.link to always return the web.archive.org copy of the URL, even if it's not a 404.
- **`timeout`** - the number of milliseconds to wait for a response from the given `url` before assuming a failure and moving onto requesting the page from the web.archive.org API. Defaults to 2000 (2 seconds).
