import { STAGES } from '../core/levels';
import { asset } from '../assets';
import { CHAPTERS } from '../story';

/** Focused, keyboard-friendly story card shown immediately before a land begins. */
export function showChapterIntro(index: number): Promise<boolean> {
  const i = Math.max(0, Math.min(STAGES.length - 1, Math.floor(index)));
  const stage = STAGES[i];
  const chapter = CHAPTERS[i];
  const beats = chapter.beats;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  return new Promise((resolve) => {
    const dialog = document.createElement('section');
    dialog.className = 'chapter-dialog chapter-overlay scrollable';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'chapter-title');
    const bg = asset(stage.background);
    dialog.innerHTML = `
      <div class="chapter-art" role="img" aria-label="${stage.name} landscape">
        <div class="chapter-art-wash"></div>
        <span class="chapter-art-index">LAND ${String(i + 1).padStart(2, '0')} <i></i> ${stage.name}</span>
      </div>
      <div class="chapter-body">
        <div class="chapter-copy">
          <p class="chapter-eyebrow">WATCHFIRE ${String(i + 1).padStart(2, '0')} <span>·</span> CHAPTER OPENS</p>
          <h2 id="chapter-title"></h2>
          <div class="chapter-progress" aria-hidden="true"></div>
          <article class="story-beat" aria-live="polite" aria-atomic="true">
            <p class="chapter-speaker"></p>
            <p class="chapter-text"></p>
          </article>
          ${i === 0 ? '<blockquote class="chapter-promise">“I will leave a light at every gate until she can find her way back.”</blockquote>' : ''}
        </div>
      </div>
      <footer class="chapter-actions">
        <button class="btn chapter-back" type="button">Back</button>
        <button class="btn chapter-skip" type="button">Skip story</button>
        <button class="btn primary chapter-next" type="button"><span>Next</span><b aria-hidden="true">→</b></button>
      </footer>`;
    dialog.style.setProperty('--chapter-art', `url("${bg.replace(/"/g, '\\"')}")`);

    let page = 0;
    let closed = false;
    const title = dialog.querySelector<HTMLElement>('#chapter-title')!;
    const speaker = dialog.querySelector<HTMLElement>('.chapter-speaker')!;
    const text = dialog.querySelector<HTMLElement>('.chapter-text')!;
    const progress = dialog.querySelector<HTMLElement>('.chapter-progress')!;
    const next = dialog.querySelector<HTMLButtonElement>('.chapter-next')!;
    title.textContent = chapter.title;

    const paint = () => {
      const beat = beats[page];
      speaker.textContent = beat.speaker;
      text.textContent = beat.text;
      progress.innerHTML = beats.map((_, n) => `<span class="${n === page ? 'current' : n < page ? 'passed' : ''}"></span>`).join('');
      next.querySelector('span')!.textContent = page === beats.length - 1 ? 'Begin this land' : 'Next';
      next.setAttribute('aria-label', page === beats.length - 1 ? 'Begin this land' : `Next story panel, ${page + 2} of ${beats.length}`);
    };
    const close = (accepted: boolean) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      dialog.classList.add('chapter-closing');
      const remove = () => {
        dialog.remove();
        previous?.focus({ preventScroll: true });
        resolve(accepted);
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) remove();
      else dialog.addEventListener('transitionend', remove, { once: true });
      window.setTimeout(remove, 300);
    };
    const onKey = (event: KeyboardEvent) => {
      if(event.key==='Tab'){
        const buttons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        return;
      }
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        close(false);
      } else if (event.key === 'Enter' && !event.repeat && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        advance();
      }
    };
    const advance = () => {
      if (page < beats.length - 1) {
        page += 1;
        paint();
        text.scrollTop = 0;
      } else close(true);
    };

    dialog.querySelector('.chapter-back')!.addEventListener('click', () => close(false));
    dialog.querySelector('.chapter-skip')!.addEventListener('click', () => close(true));
    next.addEventListener('click', advance);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(false);
    });
    document.addEventListener('keydown', onKey);
    paint();
    document.body.append(dialog);
    requestAnimationFrame(() => next.focus({ preventScroll: true }));
  });
}
