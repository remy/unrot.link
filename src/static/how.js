const $ = (s) => document.querySelector(s);

/**
 * @typedef {Object} Options
 * @property {string} url
 * @property {string} date
 * @property {boolean} wayback
 * @property {boolean} originMatch
 * @property {number} timeout
 */

/** @type {Options} */
let options = {};

document.body.addEventListener('change', (event) => {
  if (event.target.matches('input')) {
    const current = event.target.closest('div[data-step]');
    // reset all after this point
    const allSteps = Array.from(document.querySelectorAll(`div[data-step]`));
    const stepPosition = allSteps.indexOf(current);
    current.querySelector('button').hidden = false;
    allSteps.forEach((step, index) => {
      if (index > stepPosition) {
        step.hidden = true;
      }
    });
  }
});

document.body.addEventListener('click', (event) => {
  if (event.target.matches('button')) {
    const current = event.target.closest('div[data-step]');
    const step = current.dataset.step;

    const btn = current.querySelector('button');
    if (btn) {
      btn.hidden = true;
    }

    if (step === '1') {
      step1(current);
    }

    if (step === 'check-connect') {
      stepCheckConnect(current);
    }

    if (step === 'fetch') {
      stepCheckFetch(current);
    }

    if (step === 'fetch-redirected') {
      stepRedirectCheck(current);
    }

    if (step === 'wayback') {
      stepWaybackRedirect();
    }
  }
});

/**
 *
 * @param {HTMLFieldSetElement} fieldset
 * @param {string[]} values
 */
function getFieldValues(fieldset, values) {
  const res = {};
  for (const key of values) {
    const input = fieldset.elements[key];
    if (input.type === 'checkbox') {
      res[key] = input.checked;
    } else if (input.type === 'radio') {
      const radio = fieldset.querySelector(`input[name="${key}"]:checked`);
      if (radio) {
        res[key] = radio.value;
      } else {
        res[key] = undefined;
      }
    } else {
      res[key] = input.value;
    }
  }

  return res;
}

function step1(container) {
  const {
    url,
    date,
    wayback,
    'origin-match': originMatch,
    timeout,
  } = getFieldValues(container.querySelector('fieldset'), [
    'url',
    'date',
    'wayback',
    'origin-match',
    'timeout',
  ]);
  options = { url, date, wayback, originMatch, timeout };

  if (wayback) {
    // immediately skip everything else and go to wayback
    show('wayback');
  } else {
    show('check-connect');
  }
}

function stepCheckConnect(current) {
  const key = 'origin-check-ok';
  const { [key]: ok } = getFieldValues(current.querySelector('fieldset'), [
    key,
  ]);
  if (!ok) {
    current.querySelector(
      `input[name="origin-check-ok"][value="n"]`
    ).checked = true;
  }
  if (ok) {
    show('fetch');
  } else {
    show('wayback');
  }
}

function stepCheckFetch(current) {
  const { 'fetch-status': status } = getFieldValues(
    current.querySelector('fieldset'),
    ['fetch-status']
  );

  if (['404', '400', 'timeout'].includes(status)) {
    show('wayback');
  } else if (status === 'redirect') {
    show('fetch-redirected');
  } else if (['200', '429'].includes(status)) {
    show('fetch-200');
  }
}

function stepRedirectCheck(current) {
  const { 'redirect-type': type } = getFieldValues(
    current.querySelector('fieldset'),
    ['redirect-type']
  );

  if (type === 'redirect-origin') {
    if (options.originMatch) {
      show('wayback');
    } else {
      show('fetch-200');
    }
  }

  if (type === 'redirect-path') {
    show('wayback');
  }

  if (type === 'redirect-legit') {
    show('fetch-200');
  }
}

function stepWaybackRedirect() {
  const result = $('#redirect-result');

  fetch('/?' + new URLSearchParams(options), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then((data) => {
      result.innerHTML = `<a href="${data.url}" target="_blank">${data.url}</a>`;
    });

  show('wayback-result');
}

function show(step) {
  const div = $(`div[data-step="${step}"]`);
  const btn = div.querySelector('button');
  if (btn) {
    btn.hidden = false;
  }
  div.hidden = false;
  div.scrollIntoView({ behavior: 'smooth' });
}
