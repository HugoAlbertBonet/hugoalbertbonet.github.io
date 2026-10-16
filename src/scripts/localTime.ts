// Fills every [data-local-time] with the current time in its data-tz timezone, e.g. "09:41".
const els = document.querySelectorAll<HTMLElement>('[data-local-time]');

const tick = () => {
  els.forEach((el) => {
    el.textContent = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: el.dataset.tz,
    }).format(new Date());
  });
};

if (els.length) {
  tick();
  window.setInterval(tick, 30_000);
}
