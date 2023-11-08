const form = document.querySelector('#try-form');

async function submit(form) {
  const formData = new FormData(form);
  const searchParams = new URLSearchParams(Object.fromEntries(formData));

  // note - this happens _after_ the `new FormData` call otherwise the
  // `FormData` object will be empty
  form.querySelector('fieldset').disabled = true;

  try {
    const res = await fetch(form.action + '?' + searchParams.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();

    document.querySelector('output').innerHTML = `
    <p>Rewritten URL:<br><a href="${json.url}">${json.url}</a></p>
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
    submit(form);
    event.preventDefault();
  },
  true
);
