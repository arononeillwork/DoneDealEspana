import { html, raw, mount } from '../lib.js';
import { LEGAL, SALE_FEE_EUR } from '../config.js';
import { ICONS } from '../components.js';

const UPDATED = '31 October 2026';

const operator = () => {
  const bits = [LEGAL.operatorName, LEGAL.taxId && `NIF/CIF ${LEGAL.taxId}`, LEGAL.address].filter(Boolean);
  return html`
    <p>DoneDealEspana (“DoneDealEspana”, “we”, “us”) is an online classifieds platform for buying and selling items in Spain.${bits.length ? html` It is operated by ${bits.join(', ')}.` : ''}${LEGAL.email ? html` Contact: <a href="mailto:${LEGAL.email}">${LEGAL.email}</a>.` : ''}</p>`;
};

const keyNotice = html`
  <div class="legal-key" role="note">
    <div class="legal-key-icon">${raw(ICONS.handshake)}</div>
    <div>
      <h2>Every transaction is between the buyer and the seller</h2>
      <p><strong>DoneDealEspana is a meeting place, not a party to any sale.</strong> Each transaction arranged through this website is a private agreement made directly between the buyer and the seller, and <strong>the buyer and the seller alone are legally responsible for it</strong>.</p>
      <p>That includes the item's description, condition, ownership and legality, the price, payment, collection or delivery, taxes, warranties, returns, refunds and any dispute. DoneDealEspana does not own, inspect, store, sell, ship or guarantee any item, does not take or hold payments for items, and does not act as an agent, broker or representative for either party.</p>
    </div>
  </div>`;

const terms = () => html`
  <h1>Terms &amp; Conditions</h1>
  <p class="muted">Last updated: ${UPDATED}</p>
  ${keyNotice}

  <h2>1. Who we are</h2>
  ${operator()}
  <p>By creating an account or using the website you agree to these Terms. If you don't agree, please don't use DoneDealEspana.</p>

  <h2>2. What DoneDealEspana does</h2>
  <p>We provide tools that let members publish listings, search for items, message each other and keep track of their listings and sales. We are a hosting service for the content members publish. We do not review listings before they go live, and we do not take part in the negotiation, payment or handover of any item.</p>

  <h2>3. Transactions between buyers and sellers</h2>
  <ul>
    <li><strong>The contract of sale is formed only between the buyer and the seller.</strong> DoneDealEspana is never the seller, the buyer or a guarantor.</li>
    <li>The buyer and the seller are each responsible for checking who they are dealing with, for agreeing the price and conditions, and for complying with all laws that apply to their transaction, including tax and consumer law.</li>
    <li>Payment for items is arranged directly between buyer and seller, outside DoneDealEspana. We do not process, hold, escrow or refund item payments.</li>
    <li>Collection, delivery, shipping costs and risk in transit are agreed between buyer and seller.</li>
    <li>Any claim about an item (for example that it is faulty, not as described, not delivered or not paid for) must be resolved between the buyer and the seller. We may, at our discretion, remove listings or suspend accounts, but we are not obliged to mediate and we are not liable for the outcome.</li>
    <li><strong>Selling as a business:</strong> if you sell as a trader or professional, you must say so clearly in your listing and you are responsible for meeting your legal obligations to consumers under Spanish and EU law (such as information duties, the right of withdrawal and legal guarantees). Sales between private individuals are generally not covered by those consumer protections.</li>
  </ul>

  <h2>4. Your account</h2>
  <ul>
    <li>You must be at least 18 years old and give accurate information.</li>
    <li>You are responsible for everything done with your account. Keep your password private and tell us if you think someone else has used it.</li>
    <li>One person, one account. Accounts may not be sold or transferred.</li>
  </ul>

  <h2>5. Listing rules</h2>
  <p>You may list almost any kind of item, as long as you own it (or are authorised to sell it), it is described honestly with real photos, and selling it is legal in Spain. You must not list or offer:</p>
  <ul>
    <li>weapons, ammunition, explosives or fireworks; drugs, medicines or drug paraphernalia; tobacco or alcohol to minors;</li>
    <li>stolen, counterfeit or replica goods, or items that infringe someone else's intellectual property;</li>
    <li>live animals, protected species or products made from them;</li>
    <li>recalled or unsafe products, or items that require a licence you don't have;</li>
    <li>adult content, personal data, documents of identity, accounts or tickets where resale is prohibited;</li>
    <li>services, jobs, property rentals or anything that is not a physical item, unless we expressly allow it.</li>
  </ul>
  <p>Listings must not contain misleading information, contact details meant to take payment off-platform in a deceptive way, or spam. We may remove any listing or content that breaks these rules or the law.</p>

  <h2>6. The €${SALE_FEE_EUR} sale fee</h2>
  <ul>
    <li>Creating an account, listing items and messaging are free.</li>
    <li>When a seller marks an item as sold, the seller pays a <strong>fixed sale fee of €${SALE_FEE_EUR}.00 per item</strong> (including any applicable taxes) by card through Stripe Checkout. The item is then shown as sold and added to the seller's items-sold count.</li>
    <li>The fee is payment for the use of the DoneDealEspana platform only. <strong>It is not a payment for the item</strong>, it is not passed to the buyer, and paying it does not make DoneDealEspana part of the transaction.</li>
    <li>Card payments are processed by Stripe; we never see or store full card details. The fee is non-refundable once the item has been marked as sold, except where the law requires otherwise or the fee was charged in error.</li>
    <li>We may change the fee in future. Any change is shown on the website before it applies and never affects fees already paid.</li>
  </ul>

  <h2>7. Staying safe</h2>
  <ul>
    <li>Meet in a public place where possible and check the item before you pay.</li>
    <li>Be careful with requests to pay in advance, by money transfer services, or to a person or account you can't verify.</li>
    <li>Never share card details, passwords or one-time codes in chat. DoneDealEspana will never ask you to pay for an item.</li>
    <li>Report suspicious listings or messages to us.</li>
  </ul>

  <h2>8. Messages and behaviour</h2>
  <p>Use messages to discuss items listed on DoneDealEspana. Be respectful: no harassment, discrimination, threats, spam or fraud. Messages are private between the participants, but we may review them when investigating a report, preventing fraud or complying with the law.</p>

  <h2>9. Your content</h2>
  <p>You keep ownership of the photos and text you upload. You give DoneDealEspana a free, non-exclusive licence to host, display, resize and share that content in order to run and promote the service while it is on the website. You confirm you have the right to upload it.</p>

  <h2>10. Our responsibility</h2>
  <p>We provide DoneDealEspana “as is” and do our best to keep it available and secure, but we can't promise it will always be uninterrupted or error-free. Because we are not part of any transaction, <strong>we are not liable for the items listed, the conduct of members, or any loss arising from a transaction between buyer and seller</strong>. Nothing in these Terms limits liability that cannot be limited by law, including for fraud, gross negligence, or death or personal injury caused by our negligence, and nothing affects your statutory rights.</p>

  <h2>11. Suspension and closing your account</h2>
  <p>We may suspend or close accounts and remove content that breaks these Terms or the law, or to protect members. You can delete your account at any time from Account settings.</p>

  <h2>12. Changes</h2>
  <p>We may update these Terms. We'll show the date of the latest version above, and if a change is significant we'll tell members before it takes effect.</p>

  <h2>13. Law and disputes</h2>
  <p>These Terms are governed by Spanish law. If you are a consumer, you may bring proceedings in the courts of your place of residence and you keep the protection of the mandatory laws of the country where you live.</p>`;

const privacy = () => html`
  <h1>Privacy Policy</h1>
  <p class="muted">Last updated: ${UPDATED}</p>
  ${operator()}
  <p>This policy explains what personal data DoneDealEspana uses and why, in line with the EU General Data Protection Regulation (GDPR) and Spain's data protection law (LOPDGDD).</p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Account data:</strong> email address, password (stored hashed by our authentication provider), display name, optional location and bio.</li>
    <li><strong>Listings:</strong> photos, descriptions, prices and other details you publish. These are public.</li>
    <li><strong>Messages:</strong> the content of chats between members.</li>
    <li><strong>Sale fees:</strong> records of fees paid (amount, date, item). Card details are handled by Stripe and never reach us.</li>
    <li><strong>Usage:</strong> basic counts such as listing views, and technical logs kept by our hosting providers for security.</li>
  </ul>

  <h2>Why we use it</h2>
  <ul>
    <li>To provide the service you signed up for: your account, listings, messages and sale tracking (performance of a contract).</li>
    <li>To keep the platform safe and prevent fraud and misuse (legitimate interest).</li>
    <li>To keep accounting records of sale fees (legal obligation).</li>
  </ul>
  <p>We don't sell your data and we don't use advertising trackers. Your email address is never shown to other members.</p>

  <h2>Who processes it for us</h2>
  <ul>
    <li><strong>Supabase</strong>: database, login and photo storage, hosted in the EU (Paris).</li>
    <li><strong>Stripe</strong>: card payments for sale fees.</li>
    <li><strong>Vercel</strong>: website hosting and delivery.</li>
  </ul>
  <p>Where a provider processes data outside the EEA, it does so under appropriate safeguards such as the EU Standard Contractual Clauses.</p>

  <h2>How long we keep it</h2>
  <p>We keep your data while your account is open. When you delete your account, your profile, listings, photos and messages are deleted. Records of sale fees are kept for as long as accounting and tax law requires.</p>

  <h2>Your rights</h2>
  <p>You can access, correct, delete or export your data, object to or restrict its use, and withdraw consent at any time. You can edit or delete most data yourself in Account settings${LEGAL.email ? html`, or contact us at <a href="mailto:${LEGAL.email}">${LEGAL.email}</a>` : ''}. You also have the right to complain to the Spanish data protection authority (Agencia Española de Protección de Datos, <a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>

  <h2>Cookies and local storage</h2>
  <p>We only use your browser's local storage for things the site needs to work, such as keeping you logged in. We don't use advertising or analytics cookies.</p>`;

const how = () => html`
  <h1>How DoneDealEspana works</h1>
  <p class="lead">A simple, friendly way to buy and sell anything in Spain.</p>
  <ol class="steps steps-col">
    <li><span class="step-n">1</span><div><h3>Create a free account</h3><p>Choose a display name. Your email stays private.</p></div></li>
    <li><span class="step-n">2</span><div><h3>List your item for free</h3><p>Add photos, a title, a price and a description. Condition, brand and item specifics help buyers decide.</p></div></li>
    <li><span class="step-n">3</span><div><h3>Chat with buyers</h3><p>Buyers message you from the listing. Every chat stays in your Messages inbox, and you can see views, saves and chats for each item in My items.</p></div></li>
    <li><span class="step-n">4</span><div><h3>Close the deal yourselves</h3><p>Agree the price, payment and collection or delivery directly with the other person. DoneDealEspana is not part of the sale.</p></div></li>
    <li><span class="step-n">5</span><div><h3>Mark it as sold: €${SALE_FEE_EUR}</h3><p>Pay the fixed €${SALE_FEE_EUR} sale fee securely with Stripe. The listing shows as sold and your items-sold count goes up on your profile.</p></div></li>
  </ol>
  ${keyNotice}
  <p><a class="btn btn-primary" href="#/sell">Start selling</a> <a class="btn btn-ghost" href="#/terms">Read the Terms</a></p>`;

export async function render(root, { params: [page] }) {
  const body = page === 'terms' ? terms() : page === 'privacy' ? privacy() : how();
  mount(root, html`<section class="container narrow page-pad legal">${body}</section>`);
}
