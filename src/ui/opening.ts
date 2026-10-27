import { STAGES } from '../core/levels';
import { asset } from '../assets';

/** A one-gesture prologue. No audio is started here; the host may unlock it in onEnter. */
export function showOpening(onEnter: () => void): Promise<void> {
  return new Promise((resolve) => {
    const stage = STAGES[0];
    const overlay = document.createElement('section');
    overlay.className = 'opening-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'opening-title');
    const art = asset(stage.background);
    overlay.style.setProperty('--opening-art', `url("${art.replace(/"/g, '\\"')}")`);
    overlay.innerHTML = `
      <div class="opening-grain" aria-hidden="true"></div>
      <div class="opening-frame">
        <p class="opening-kicker"><span>AN EMBERFALL CHRONICLE</span><i></i><span>SEVEN LANDS</span></p>
        <div class="opening-art" role="img" aria-label="${stage.name}, the first land">
          <div class="opening-sun"></div><div class="opening-ridge"></div>
          <span class="opening-art-caption">THE BEACON HAS GONE DARK</span>
        </div>
        <div class="opening-lockup">
          <p class="opening-overline">A story of courage, and the light we carry for one another</p>
          <h1 id="opening-title">ARMOR <em>OF</em><br>LIGHT</h1>
          <div class="opening-rule"><span></span><b>ELIAM · KEEPER OF THE EMBER</b><span></span></div>
        </div>
        <button class="opening-enter" type="button"><span>Enter the story</span><b aria-hidden="true">→</b></button>
        <p class="opening-foot">An illustrated adventure through seven imagined lands</p>
      </div>`;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      overlay.classList.add('leaving');
      const remove = () => {
        overlay.remove();
        resolve();
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) remove();
      else overlay.addEventListener('transitionend', remove, { once: true });
      window.setTimeout(remove, 420);
    };
    const enter = (event?: Event) => {
      event?.preventDefault();
      if (settled) return;
      // Deliberately invoke in the trusted click/key gesture for WebAudio unlock.
      onEnter();
      finish();
    };
    overlay.querySelector('button')!.addEventListener('click', enter);
    overlay.addEventListener('keydown', (event: KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === overlay) enter(event);
    });
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }));
  });
}
