# Down or offline

Over the next few decades I intend to keep this service running. However, if there's an outage or the domain lapses because Remy inevitably shuffles off this mortal coil, _your site_ is protected and will not feel side effects.

## Ping

The [redirect.js](/static/redirect.js) script starts with an asynchronous request to a ping as a one off when the script is loaded.

```js
fetch(root + '/ping', {
  method: 'HEAD',
  mode: 'cors',
}).then(/* continues */)
```

If this doesn't return, then the progressive enhancement doesn't apply. Meaning that your links won't go through unrot.link any more.

This ensures that even if this service disappears in 20 or 30 years time, your site, if left unmodified, will continue to work.

## Domain and status

Upon release, I've renewed the domain for the maximum time (10 years) and at time of writing, the domain will auto-renew on [November 3rd 2033](https://www.whois.com/whois/unrot.link).

Historical status of uptime can be found here: [uptime.unrot.link](https://uptime.unrot.link)
