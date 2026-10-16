// Buttons with data-copy="text" copy it to the clipboard. Feedback goes to the nearest
// [data-copy-status] inside the same [data-copy-scope], or to the button itself.
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  const status = btn.closest('[data-copy-scope]')?.querySelector<HTMLElement>('[data-copy-status]') ?? btn;
  const original = status.innerHTML;
  let timer: number | undefined;

  btn.addEventListener('click', async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy!);
    } catch {
      ok = false;
    }
    status.textContent = ok ? 'Copied ✓' : 'Copy failed, select it instead';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (status.innerHTML = original), 1800);
  });
});
