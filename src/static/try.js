const form = document.querySelector('#try-form');

const badUrls = [
  'http://kiss100.com',
  'https://haveamint.com',
  'http://www.new-life.net/st-nick.htm',
  'http://www.andybudd.com/archives/2006/12/win_an_ipod_nano_with_css_mastery_this_christmas/index.php',
];

const goodUrls = ['https://remysharp.com'];

async function submit(form) {
  const formData = new FormData(form);
  const searchParams = new URLSearchParams(Object.fromEntries(formData));

  // note - this happens _after_ the `new FormData` call otherwise the
  // `FormData` object will be empty
  form.querySelector('fieldset').disabled = true;

  try {
    const startTime = performance.now();
    const res = await fetch(form.action + '?' + searchParams.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();

    const delta = performance.now() - startTime;
    json.time = delta;

    document.querySelector('output').innerHTML = `
    <p>Rewritten URL:<br><a href="${json.url}">${json.url}</a></p>
    ${
      json.wayback > 0
        ? `<p>Wayback response time: ${json.wayback.toFixed(2)}ms</p>`
        : ''
    }
    <p>Server requests: ${json.ms.toFixed(2)}ms</p>
    <p>Client time: ${delta.toFixed(2)}ms</p>
    `;
  } catch (_) {
    // nop
    console.log(_);
  } finally {
    form.querySelector('fieldset').disabled = false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(event.target);
});

document.querySelector('#try').addEventListener(
  'click',
  (event) => {
    if (event.target.tagName !== 'A') {
      return;
    }

    if (event.target.dataset.ignore) {
      return;
    }

    if (!event.target.closest('.samples')) {
      return;
    }

    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const href = event.target.href;
    form.querySelector('input[name="url"]').value = href;
    event.preventDefault();
    event.stopPropagation();
    submit(form);
  },
  true
);
