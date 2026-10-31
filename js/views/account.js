import { html, mount, $, PROVINCES, toast, friendlyError, confirmDialog } from '../lib.js';
import { sb, state, loadMyProfile, updateMyProfile, deleteMyAccount } from '../api.js';

export const auth = true;

export async function render(root, { isCurrent }) {
  const p = (await loadMyProfile()) ?? {};
  if (!isCurrent()) return;
  mount(root, html`
    <section class="container narrow page-pad">
      <h1>Account settings</h1>
      <form class="form box" id="profile">
        <h2>Public profile</h2>
        <label class="field"><span>Display name <b class="req">*</b></span><input name="display_name" required maxlength="60" value="${p.display_name ?? ''}"></label>
        <label class="field"><span>Location</span><input name="location" list="provinces" maxlength="80" value="${p.location ?? ''}" placeholder="Town or province"></label>
        <datalist id="provinces">${PROVINCES.map((x) => html`<option value="${x}">`)}</datalist>
        <label class="field"><span>About you</span><textarea name="bio" rows="3" maxlength="500" placeholder="A line or two for buyers and sellers">${p.bio ?? ''}</textarea></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Save profile</button></div>
      </form>

      <form class="form box" id="password">
        <h2>Login</h2>
        <p class="muted small">Signed in as <strong>${state.user.email}</strong>. Your email is never shown to other members.</p>
        <label class="field"><span>New password</span><input name="password" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
        <div class="form-actions"><button class="btn btn-ghost" type="submit">Change password</button></div>
      </form>

      <div class="box danger-zone">
        <h2>Delete account</h2>
        <p class="muted small">Permanently removes your profile, listings, photos and chats. Records of sale fees already paid are kept for accounting.</p>
        <button class="btn btn-danger" id="delete">Delete my account</button>
      </div>
    </section>`);

  $('#profile', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const display_name = f.get('display_name').toString().trim();
    if (!display_name) return toast('Please enter a display name.', 'error');
    try {
      await updateMyProfile({ display_name, location: f.get('location').toString().trim() || null, bio: f.get('bio').toString().trim() || null });
      await loadMyProfile();
      window.dispatchEvent(new Event('dd:unread'));
      toast('Profile saved.', 'success');
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  });

  $('#password', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = new FormData(e.target).get('password').toString();
    if (pw.length < 8) return toast('Use at least 8 characters.', 'error');
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return toast(friendlyError(error), 'error');
    e.target.reset();
    toast('Password changed.', 'success');
  });

  $('#delete', root).addEventListener('click', async () => {
    const yes = await confirmDialog({ title: 'Delete your account?', body: 'This cannot be undone. Your listings, photos and chats will be removed.', confirm: 'Delete account', danger: true });
    if (!yes) return;
    try {
      await deleteMyAccount();
      await sb.auth.signOut().catch(() => {});
      toast('Your account has been deleted.');
      location.hash = '#/';
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  });
}
