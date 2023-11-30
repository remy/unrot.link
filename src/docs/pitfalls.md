# Potential Pitfalls

A list of possible pitfalls with this service in no particular order.

1. Results that redirect to a Internet Archive hosted page are going to be slower as the initial request is made to the original URL allows for a 2 second timeout, then there's a request to the Internet Archive's Wayback CDX API to find the best URL to redirect to. There is code to attempt to mitigate this (by first checking for an origin connection), but it's not guaranteed.
2. If you rely on this service and it goes down, it could cause all your URLs to stop working. There's contingency built into the client side script, which aims to mitigate this, but it's still a factor.
3. Because all outbound URLs go through [unrot.link](https://unrot.link) the referrer could be lost. This is a problem if you're using analytics to track inbound links. This service _does_ attempt to restore the referrer, and this can be tested by using developer tools and checking network requests, but it is not guaranteed.
4. [thing from stuart]

You can also discuss these pitfalls or raise more by [contributing](https://github.com/remy/unrot.link/issues/new).
