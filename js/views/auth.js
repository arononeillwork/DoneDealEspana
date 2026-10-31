import { html, mount, $, PROVINCES, toast, friendlyError } from '../lib.js';
import { sb, state } from '../api.js';

const site = () => `${location.origin}${location.pathname}`;

export async function render(root, { params: [mode], query }) {
  const next = query.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (state.user && (mode === 'login' || mode === 'signup')) {
    location.replace(`#${safeNext}`);
    return;
  }
  const nextQs = safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : '';

  const views = {
    login: html`
      <h1>Welcome back</h1>
      <p class="muted">Log in to message sellers, save items and manage your listings.</p>
      <form class="form" id="f">
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="field"><span>Password</span><input name="password" type="password" required autocomplete="current-password"></label>
        <p class="error-text" id="err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button>
      </form>
      <p class="small"><a href="#/forgot">Forgot your password?</a></p>
      <p class="muted">New here? <a href="#/signup${nextQs}">Create a free account</a></p>`,
    signup: html`
      <h1>Create your account</h1>
      <p class="muted">Free to join. List items, chat with buyers and track your sales.</p>
      <form class="form" id="f">
        <label class="field"><span>Display name</span><input name="display_name" required maxlength="60" autocomplete="nickname" placeholder="How other members see you"></label>
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="field"><span>Password</span><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
        <label class="field"><span>Location <span class="muted">(optional)</span></span><input name="location" list="provinces" maxlength="80" placeholder="Town or province"></label>
        <datalist id="provinces">${PROVINCES.map((x) => html`<option value="${x}">`)}</datalist>
        <label class="check">
          <input type="checkbox" name="agree" required>
          <span>I'm 18 or over and I agree to the <a href="#/terms" target="_blank">Terms &amp; Conditions</a> and <a href="#/privacy" target="_blank">Privacy Policy</a>. I understand every sale is a private agreement between buyer and seller.</span>
        </label>
        <p class="error-text" id="err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Create account</button>
      </form>
      <p class="muted">Already a member? <a href="#/login${nextQs}">Log in</a></p>`,
    forgot: html`
      <h1>Reset your password</h1>
      <p class="muted">We'll email you a link to choose a new password.</p>
      <form class="form" id="f">
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
        <p class="error-text" id="err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Send reset link</button>
      </form>
      <p class="small"><a href="#/login">Back to log in</a></p>`,
    reset: html`
      <h1>Choose a new password</h1>
      ${state.user
        ? html`<form class="form" id="f">
            <label class="field"><span>New password</span><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
            <p class="error-text" id="err" hidden></p>
            <button class="btn btn-primary btn-lg btn-block" type="submit">Save password</button>
          </form>`
        : html`<p class="muted">This reset link has expired or was opened in a different browser. <a href="#/forgot">Request a new one</a>.</p>`}`,
  };

  mount(root, html`<section class="container auth page-pad"><div class="auth-card">${views[mode]}</div></section>`);
  const form = $('#f', root);
  if (!form) return;
  const err = $('#err', root);
  const btn = $('button[type=submit]', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const f = new FormData(form);
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Please wait…';
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') });
        if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong email or password.' : /confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox for our link.' : error.message);
        toast('Welcome back!', 'success');
        location.hash = `#${safeNext}`;
      } else if (mode === 'signup') {
        if (!f.get('agree')) throw new Error('Please accept the Terms to continue.');
        const { data, error } = await sb.auth.signUp({
          email: f.get('email').trim(),
          password: f.get('password'),
          options: {
            emailRedirectTo: `${site()}?confirmed=1`,
            data: { display_name: f.get('display_name').trim(), location: f.get('location').trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast('Account created. Welcome!', 'success');
          location.hash = `#${safeNext}`;
        } else {
          mount(root, html`<section class="container auth page-pad"><div class="auth-card">
            <h1>Check your inbox</h1>
            <p>We sent a confirmation link to <strong>${f.get('email')}</strong>. Click it to activate your account, then log in.</p>
            <p class="small muted">Can't see it? Check your spam folder.</p>
            <a class="btn btn-primary" href="#/login">Go to log in</a>
          </div></section>`);
        }
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(f.get('email').trim(), { redirectTo: `${site()}?reset=1` });
        if (error) throw error;
        mount(root, html`<section class="container auth page-pad"><div class="auth-card"><h1>Check your inbox</h1><p>If an account exists for that email, a reset link is on its way.</p><a href="#/login">Back to log in</a></div></section>`);
      } else if (mode === 'reset') {
        const { error } = await sb.auth.updateUser({ password: f.get('password') });
        if (error) throw error;
        toast('Password updated.', 'success');
        location.hash = '#/dashboard';
      }
    } catch (e2) {
      err.textContent = friendlyError(e2);
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}
