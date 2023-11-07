/* eslint-env browser */
document.body.addEventListener(
  'click',
  (event) => {
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

      const hEntry = target.closest('.h-entry');

      if (hEntry) {
        const date = hEntry.querySelector('.dt-published[datetime]');
        if (date) {
          target.href = `https://unrot.link/?url=${href}&date=${date.dateTime}`;
          return;
        }
      }

      target.href = `https://unrot.link/?url=${href}`;
    }
  },
  true
);
