document
  .querySelector('#try-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const searchParams = new URLSearchParams(Object.fromEntries(formData));
    console.log(event.target.action + '?' + searchParams.toString());
    const res = await fetch(
      event.target.action + '?' + searchParams.toString(),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const json = await res.json();

    document.querySelector('output').innerHTML = `
    <p>Status: <strong>${json.status}</strong></p>
    <p>Rewritten URL: <a href="${json.url}">${json.url}</a></p>
    `;
  });
