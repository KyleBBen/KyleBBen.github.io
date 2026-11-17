'use strict';

const records = window.houseSeats;
const parties = {
  UNC: 'United National Congress',
  PNM: 'People’s National Movement',
  TPP: 'Tobago People’s Party',
};
const byId = (id) => document.getElementById(id);
const speaker = records.find((member) => !member.constituency);
const elected = records.filter((member) => member.constituency)
  .sort((a, b) => a.constituency.localeCompare(b.constituency));
const search = byId('search');
const partyFilter = byId('party');
const details = byId('details');
const roster = byId('roster');
const chamber = byId('chamber');
const chamberButtons = new Map();
const listButtons = new Map();
const number = new Intl.NumberFormat('en-TT');
let selected;
let view = 'chamber';
let activeSeat;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function link(content, href, className) {
  const node = element('a', content, className);
  node.href = href;
  return node;
}

function shortName(name) {
  return name.replace(/^The Honourable\s+|^Mr\.\s+|^Mrs\.\s+|^Ms\.\s+/i, '').replace(/,?\s*MP$/i, '');
}

function initials(constituency) {
  const labels = {
    Arima: 'ARI', 'Caroni East': 'CAE', 'Chaguanas East': 'CHE',
    Fyzabad: 'FYZ', Mayaro: 'MAY', Naparima: 'NAP',
    'Port-of-Spain North/St. Ann’s West': 'POSN',
    'Port-of-Spain South': 'POSS', Siparia: 'SIP', Tabaquite: 'TAB', Tunapuna: 'TUN',
  };
  if (labels[constituency]) return labels[constituency];
  return constituency.replace(/[’']/g, '').split(/[^A-Za-z]+/).map((word) => word[0]).join('').toUpperCase();
}

function selectMember(member, seat) {
  selected = member;
  if (seat) activeSeat = seat;
  renderDetails();
  updateSelection();
  if (seat && matchMedia('(max-width: 700px)').matches) {
    details.focus({preventScroll: true});
    details.scrollIntoView({block: 'start'});
  }
}

function createSeat(member, kind) {
  const button = element('button', undefined, kind);
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', member.constituency
    ? member.constituency + ', ' + member.name + ', ' + member.affiliation
    : 'Speaker, ' + member.name);
  if (member.affiliation) button.dataset.party = member.affiliation;
  button.title = member.constituency ? member.constituency + ' · ' + shortName(member.name) : member.name;
  button.addEventListener('click', () => selectMember(member, button));
  return button;
}

function renderBalance() {
  for (const [abbr, name] of Object.entries(parties)) {
    const count = elected.filter((member) => member.affiliation === abbr).length;
    const bar = element('span');
    bar.style.flexGrow = count;
    bar.dataset.party = abbr;
    bar.setAttribute('aria-hidden', 'true');
    byId('balance-bar').append(bar);
    const label = element('span');
    label.dataset.party = abbr;
    label.title = name;
    label.append(element('i'), element('b', abbr), String(count));
    byId('legend').append(label);
  }
}

function renderSeats() {
  const chair = createSeat(speaker, 'speaker');
  chair.textContent = 'Speaker';
  chamberButtons.set(speaker, chair);
  byId('dais').append(chair);
  for (const abbr of Object.keys(parties)) {
    const bench = byId(abbr.toLowerCase() + '-bench');
    const group = elected.filter((member) => member.affiliation === abbr);
    const grid = element('div', undefined, 'bench-grid');
    bench.append(element('h3', abbr + ' · ' + group.length), grid);
    for (const member of group) {
      const button = createSeat(member, 'seat');
      button.textContent = initials(member.constituency);
      chamberButtons.set(member, button);
      grid.append(button);
    }
  }
  for (const member of [...elected, speaker]) {
    const button = createSeat(member, 'roster-entry');
    const label = element('span');
    label.append(element('strong', member.constituency || 'Speaker'), element('small', shortName(member.name)));
    button.append(label, element('span', member.affiliation || ''));
    listButtons.set(member, button);
    roster.append(button);
  }
}

function renderDetails() {
  details.replaceChildren();
  if (!selected) {
    details.append(element('p', 'SELECT A SEAT', 'detail-kicker'), element('h2', 'Meet your MP'),
      element('p', 'Pick a seat or search for your constituency to see its representative.', 'detail-meta'));
    return;
  }
  const member = selected;
  const top = element('div', undefined, 'detail-top');
  if (member.photo) {
    const portrait = element('img', undefined, 'portrait');
    portrait.src = member.photo;
    portrait.alt = '';
    portrait.addEventListener('error', () => portrait.remove(), {once: true});
    top.append(portrait);
  }
  const title = element('div');
  title.append(element('p', member.constituency || 'PRESIDING OFFICER', 'detail-kicker'),
    element('h2', shortName(member.name)), element('p', parties[member.affiliation] || 'Speaker of the House', 'detail-meta'));
  top.append(title);
  details.append(top);
  if (member.election) {
    const result = element('div', undefined, 'result');
    const {winner, runner, votes, runnerVotes, margin} = member.election;
    result.append(element('h3', '2025 election margin'), element('strong', number.format(margin) + ' votes'),
      element('p', winner + ' ' + number.format(votes) + ' · ' + runner + ' ' + number.format(runnerVotes)));
    details.append(result);
  }
  if (member.constituency) {
    const contact = element('div', undefined, 'contact');
    contact.append(element('h3', 'Constituency office'));
    if (member.phone) {
      const phone = element('p');
      for (const [index, label] of [...new Set(member.phone.split('/').map((value) => value.trim()))].entries()) {
        if (index) phone.append(' · ');
        const digits = label.replace(/\D/g, '');
        const prefix = {7: '1868', 10: '1', 11: ''}[digits.length];
        phone.append(prefix === undefined ? label : link(label, 'tel:+' + prefix + digits));
      }
      contact.append(phone);
    }
    if (member.email) {
      const email = element('p');
      email.append(link(member.email, 'mailto:' + member.email));
      contact.append(email);
    }
    if (!member.phone && !member.email) contact.append(link('See Parliament’s contact page', member.url + 'contact-information/'));
    details.append(contact);
  }
  details.append(link('Official Parliament profile', member.url, 'official'));
}

function updateSelection() {
  for (const buttons of [chamberButtons, listButtons]) {
    for (const [member, button] of buttons) button.setAttribute('aria-pressed', String(member === selected));
  }
}

function searchable(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(member) {
  if (partyFilter.value && partyFilter.value !== member.affiliation) return false;
  const target = searchable([member.name, member.constituency || 'Speaker', member.affiliation].join(' '));
  return searchable(search.value).split(' ').every((word) => target.includes(word));
}

function updateFilter() {
  let count = 0;
  for (const [member, button] of chamberButtons) {
    const match = matches(member);
    button.disabled = !match;
    listButtons.get(member).hidden = !match;
    if (match) count++;
  }
  const status = byId('match-status');
  status.hidden = !search.value.trim() && !partyFilter.value;
  status.textContent = count === 0 ? 'No matches. Try another name or constituency.'
    : count + (count === 1 ? ' match' : ' matches');
}

function setView(next) {
  view = next;
  chamber.hidden = view !== 'chamber';
  roster.hidden = view !== 'list';
  byId('show-chamber').setAttribute('aria-pressed', String(view === 'chamber'));
  byId('show-list').setAttribute('aria-pressed', String(view === 'list'));
  byId('layout-note').textContent = view === 'chamber'
    ? 'Illustrative seating · positions grouped by party'
    : 'Browse by constituency';
}

byId('show-chamber').addEventListener('click', () => setView('chamber'));
byId('show-list').addEventListener('click', () => setView('list'));
search.addEventListener('input', updateFilter);
search.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const results = [...elected, speaker].filter(matches);
  if (results.length === 1) selectMember(results[0], (view === 'chamber' ? chamberButtons : listButtons).get(results[0]));
});
partyFilter.addEventListener('change', updateFilter);
details.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeSeat?.offsetParent) activeSeat.focus();
});
renderBalance();
renderSeats();
selectMember(elected.find((member) => member.constituency === 'Malabar/Mausica') || elected[0]);
