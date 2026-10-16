// Links marked [data-jump] (terminal answers, carousel) briefly highlight the section they scroll to.
document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-jump]');
  if (!link || link.pathname !== location.pathname) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  target.classList.remove('flash');
  void target.offsetWidth; // restart the animation on repeated clicks
  target.classList.add('flash');
  window.setTimeout(() => target.classList.remove('flash'), 1600);
});
