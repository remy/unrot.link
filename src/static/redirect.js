/* eslint-env browser */
document.body.addEventListener(
  'click',
  (event) => {
    // use event delegation to only listen on clicks on links, then filter out
    // relative links and archive.org links so we're targeting external links then,
    // if we have an h-entry, try to also use the published date.

    /** @type HTMLElement */
    const target = event.target.closest('a[href]');

    if (target) {
      /** @type String */
      let href = target.attributes.href.value;

      if (!href.startsWith('http')) {
        // ignore relative urls
        return;
      }

      if (href.includes('archive.org')) {
        // don't try to redirect archive links
        return;
      }

      href = encodeURIComponent(href);

      // default to unrot.link with the url
      target.href = `https://unrot.link/?url=${href}`;

      // now check if we have an h-entry, and if we do, try to use the published date
      const hEntry = target.closest('.h-entry');

      // if we have an h-entry with a published date, use that
      if (hEntry) {
        const date = hEntry.querySelector('.dt-published[datetime]');
        if (date) {
          target.href += `&date=${date.dateTime}`;
        }
      }
    }
  },
  true
);
