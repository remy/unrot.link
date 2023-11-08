const form = document.querySelector('#try-form');

async function submit(form) {
  const formData = new FormData(form);
  const searchParams = new URLSearchParams(Object.fromEntries(formData));
  console.log(form.action + '?' + searchParams.toString());
  const res = await fetch(form.action + '?' + searchParams.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();

  document.querySelector('output').innerHTML = `
      <p>Status: <strong>${json.status}</strong></p>
      <p>Rewritten URL: <a href="${json.url}">${json.url}</a></p>
      `;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(event.target);
});

document.querySelector('#try').addEventListener(
  'click',
  (event) => {
    if (event.target.dataset.ignore) {
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
