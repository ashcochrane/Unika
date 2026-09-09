/**
 * Trade order pad — type quantities down a list, add the lot in one go.
 *
 * Every product, price and code is rendered by Liquid, so the page reads and
 * searches without JavaScript. What needs JavaScript is the arithmetic, the
 * filter, and posting a whole basket at once; a noscript note says so.
 *
 * Money is formatted with Intl against the market's own currency rather than a
 * hardcoded symbol, so the pad is correct in NZD and AUD without a second code
 * path. Saved lists live in localStorage, which is per-browser and can be
 * unavailable — every read and write is guarded and the feature simply hides.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-order-pad]');
  if (!root) return;

  const form = root.querySelector('[data-order-pad-form]');
  const rows = Array.from(root.querySelectorAll('[data-order-pad-row]'));
  const groups = Array.from(root.querySelectorAll('[data-order-pad-group]'));
  const quantities = Array.from(root.querySelectorAll('[data-order-pad-qty]'));
  const findInput = root.querySelector('[data-order-pad-find]');
  const countEl = root.querySelector('[data-order-pad-count]');
  const emptyEl = root.querySelector('[data-order-pad-empty]');
  const linesEl = root.querySelector('[data-order-pad-lines]');
  const totalEl = root.querySelector('[data-order-pad-total]');
  const submitButton = root.querySelector('[data-order-pad-submit]');
  const clearButton = root.querySelector('[data-order-pad-clear]');
  const errorEl = root.querySelector('[data-order-pad-error]');
  const saveEl = root.querySelector('[data-order-pad-save]');
  const saveButton = root.querySelector('[data-order-pad-save-button]');
  const listNameInput = root.querySelector('[data-order-pad-list-name]');
  const listsEl = root.querySelector('[data-order-pad-lists]');
  const chipsEl = root.querySelector('[data-order-pad-list-chips]');

  const STORAGE_KEY = 'unika:order-pad:lists';
  const cartAddUrl = root.dataset.cartAddUrl;
  const cartUrl = root.dataset.cartUrl;

  // Liquid renders the Price column with `money_with_currency` ("$16.25 NZD").
  // Intl's default gives "NZ$16.25", so the same row disagreed with itself.
  // Take the narrow symbol and append the code to match Liquid exactly, in
  // whichever currency the market is running.
  const currencyCode = root.dataset.currency || 'NZD';
  const amountFormat = new Intl.NumberFormat(root.dataset.locale || undefined, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  });
  const money = {
    format: function (amount) {
      return amountFormat.format(amount) + ' ' + currencyCode;
    },
  };

  const canStore = (function () {
    try {
      window.localStorage.setItem(STORAGE_KEY + ':probe', '1');
      window.localStorage.removeItem(STORAGE_KEY + ':probe');
      return true;
    } catch (error) {
      return false;
    }
  })();

  /* Tally ------------------------------------------------------------------ */

  function lineItems() {
    return quantities
      .map(function (input) {
        return { id: Number(input.dataset.variantId), quantity: Number(input.value) || 0, input: input };
      })
      .filter(function (line) {
        return line.quantity > 0;
      });
  }

  function refreshTally() {
    let cents = 0;

    quantities.forEach(function (input) {
      const quantity = Number(input.value) || 0;
      const lineCents = quantity * Number(input.dataset.price || 0);
      cents += lineCents;

      const cell = input.closest('tr').querySelector('[data-order-pad-line]');
      if (cell) cell.textContent = quantity > 0 ? money.format(lineCents / 100) : '';
      input.classList.toggle('is-set', quantity > 0);
    });

    const lines = lineItems().length;

    if (linesEl) {
      linesEl.textContent = lines === 0 ? 'No lines yet' : lines === 1 ? '1 line' : lines + ' lines';
    }
    if (totalEl) totalEl.textContent = lines === 0 ? '' : money.format(cents / 100);
    if (submitButton) submitButton.disabled = lines === 0;
    if (clearButton) clearButton.hidden = lines === 0;
    if (saveEl) saveEl.hidden = lines === 0 || !canStore;
  }

  /* Filter ----------------------------------------------------------------- */

  function applyFilter(term) {
    const needle = term.trim().toLowerCase();
    let shown = 0;

    rows.forEach(function (row) {
      const match = needle === '' || (row.dataset.search || '').indexOf(needle) !== -1;
      row.hidden = !match;
      if (match) shown += 1;
    });

    // A group heading with nothing under it is noise.
    groups.forEach(function (group) {
      const visible = group.querySelector('[data-order-pad-row]:not([hidden])');
      group.hidden = !visible;
    });

    if (emptyEl) emptyEl.hidden = shown !== 0;
    if (countEl) {
      countEl.textContent = needle === '' ? '' : shown === 1 ? '1 item' : shown + ' items';
    }
  }

  /* Saved lists ------------------------------------------------------------ */

  function readLists() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writeLists(lists) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
      return true;
    } catch (error) {
      return false;
    }
  }

  function renderLists() {
    if (!listsEl || !chipsEl) return;

    const lists = readLists();
    const names = Object.keys(lists).sort();

    chipsEl.textContent = '';
    listsEl.hidden = names.length === 0;

    names.forEach(function (name) {
      const item = document.createElement('li');
      item.className = 'order-pad__chip-item';

      const load = document.createElement('button');
      load.type = 'button';
      load.className = 'order-pad__chip-load';
      load.textContent = name;
      load.addEventListener('click', function () {
        loadList(lists[name]);
      });

      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'order-pad__chip-drop';
      drop.setAttribute('aria-label', 'Delete the list ' + name);
      drop.textContent = '×';
      drop.addEventListener('click', function () {
        const next = readLists();
        delete next[name];
        writeLists(next);
        renderLists();
      });

      item.append(load, drop);
      chipsEl.append(item);
    });
  }

  function loadList(saved) {
    quantities.forEach(function (input) {
      input.value = saved[input.dataset.variantId] || 0;
    });
    refreshTally();
    if (findInput) {
      findInput.value = '';
      applyFilter('');
    }
  }

  /* Submit ----------------------------------------------------------------- */

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function submit(event) {
    event.preventDefault();
    if (errorEl) errorEl.hidden = true;

    const invalid = quantities.find(function (input) {
      return !input.checkValidity();
    });
    if (invalid) {
      invalid.reportValidity();
      return;
    }

    const items = lineItems().map(function (line) {
      return { id: line.id, quantity: line.quantity };
    });
    if (items.length === 0) return;

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');

    fetch(cartAddUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: items }),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.description || body.message || 'That did not add to the cart.');
          return body;
        });
      })
      .then(function () {
        window.location.href = cartUrl;
      })
      .catch(function (error) {
        showError(error.message);
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
      });
  }

  /* Wiring ----------------------------------------------------------------- */

  quantities.forEach(function (input) {
    input.addEventListener('input', refreshTally);
    input.addEventListener('focus', function () {
      input.select();
    });
  });

  if (findInput) {
    findInput.addEventListener('input', function () {
      applyFilter(findInput.value);
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', function () {
      quantities.forEach(function (input) {
        input.value = 0;
      });
      refreshTally();
    });
  }

  if (saveButton && listNameInput) {
    saveButton.addEventListener('click', function () {
      const name = listNameInput.value.trim();
      if (name === '') {
        listNameInput.focus();
        return;
      }

      const saved = {};
      lineItems().forEach(function (line) {
        saved[line.id] = line.quantity;
      });

      const lists = readLists();
      lists[name] = saved;

      if (writeLists(lists)) {
        listNameInput.value = '';
        renderLists();
      } else {
        showError('This browser would not save the list.');
      }
    });
  }

  if (form) form.addEventListener('submit', submit);

  renderLists();
  refreshTally();
})();
