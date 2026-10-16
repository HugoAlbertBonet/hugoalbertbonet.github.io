// Phone "+ show all" buttons: [data-more-toggle] inside a [data-more] block reveals its .extra items.
document.querySelectorAll<HTMLElement>('[data-more]').forEach((root) => {
  const btn = root.querySelector<HTMLButtonElement>('[data-more-toggle]');
  btn?.addEventListener('click', () => {
    root.classList.add('expanded');
    btn.hidden = true;
    root.querySelector<HTMLElement>('.extra')?.focus({ preventScroll: true });
  });
});
