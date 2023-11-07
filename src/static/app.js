/**
 * @param {Event} target
 */
function docLinks(event) {
  event.preventDefault();

  const trust = `
    You trust this service to continue to run for multiple decades, so you can use it to handle your link rot. There's some risk that the service will go down, and your links will break, but you're willing to take that risk.
  `.trim();

  const tryIt = `
    You want to try this service out, give it some URLs and see how it responds.
  `;

  const selfHosted = `
    You want to use this service to handle your link rot, but you want to host it yourself. You want to be able to control the service, and you want to be able to run it on your own domain.
  `;

  const alternatives = `
    You want to research alternative methods to dealing with link rot that don't involve using this service.
  `;

  const help = {
    trust,
    'self-hosted': selfHosted,
    'try-it': tryIt,
    alternatives,
  };

  if (event.target.nodeName === 'A') {
    const text = help[event.target.dataset.id];
    document.querySelector(
      '.helper'
    ).innerHTML = `${text}<br><a href="${event.target.href}">Read more here</a>`;
  }
}

function handler(event) {
  if (event.target.closest('.doc-links')) {
    return docLinks(event);
  }
}

document.body.addEventListener('click', handler, true);
document.body.addEventListener('focus', handler, true);