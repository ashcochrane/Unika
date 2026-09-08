/**
 * Colour Matcher — add matched ColorFill products to the cart.
 *
 * Reads a { code: {id, available, title, price} } map rendered by Liquid
 * (snippets/variant-code-map.liquid) and posts to the Cart AJAX API when a
 * row's Add button is clicked.
 *
 * Event delegation is used deliberately: DataTables re-renders rows on paging,
 * search and sort, which destroys any listener bound directly to a button.
 */
(function () {
  'use strict';

  const mapEl = document.getElementById('ColourMatcherVariants');
  if (!mapEl) return;

  let variants;
  try {
    variants = JSON.parse(mapEl.textContent);
  } catch (error) {
    console.error('[colour-matcher] variant map is not valid JSON', error);
    return;
  }

  const RESET_DELAY = 2400;

  function setState(button, text, state) {
    button.textContent = text;
    if (state) {
      button.dataset.state = state;
    } else {
      delete button.dataset.state;
    }
  }

  function addToCart(button) {
    const code = button.dataset.code;
    const variant = variants[code];

    if (!variant) {
      setState(button, 'Not stocked', 'error');
      window.setTimeout(function () {
        setState(button, 'Add', null);
      }, RESET_DELAY);
      return;
    }

    if (!variant.available) {
      setState(button, 'Out of stock', 'error');
      window.setTimeout(function () {
        setState(button, 'Add', null);
      }, RESET_DELAY);
      return;
    }

    button.disabled = true;
    setState(button, 'Adding', 'busy');

    const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('cart/add returned ' + response.status);
        return response.json();
      })
      .then(function () {
        setState(button, 'Added', 'success');
        document.dispatchEvent(
          new CustomEvent('colour-matcher:added', { detail: { code: code, variant: variant } })
        );
      })
      .catch(function (error) {
        console.error('[colour-matcher] add to cart failed', error);
        setState(button, 'Try again', 'error');
      })
      .finally(function () {
        window.setTimeout(function () {
          button.disabled = false;
          setState(button, 'Add', null);
        }, RESET_DELAY);
      });
  }

  /**
   * The Colour Matcher covers the full Unika ColorFill range, but only part of
   * it is stocked here. Marking unstocked rows up front is more honest than
   * letting someone click and be told no.
   */
  function markUnstocked(scope) {
    (scope || document).querySelectorAll('.colour-matcher-add').forEach(function (button) {
      if (button.dataset.checked === '1') return;
      button.dataset.checked = '1';
      const variant = variants[button.dataset.code];
      if (!variant) {
        button.disabled = true;
        button.title = 'Not stocked in New Zealand';
        setState(button, 'Enquire', 'unstocked');
      } else if (!variant.available) {
        button.disabled = true;
        setState(button, 'Out of stock', 'error');
      } else {
        button.title = 'Add ' + variant.title + ' — ' + variant.price;
      }
    });
  }

  markUnstocked();

  // DataTables rebuilds rows on paging, search and sort, so re-mark after each draw.
  document.addEventListener('draw.dt', function () {
    markUnstocked();
  });
  if (window.jQuery) {
    window.jQuery(document).on('draw.dt', function () {
      markUnstocked();
    });
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('.colour-matcher-add');
    if (button && !button.disabled) addToCart(button);
  });
})();
