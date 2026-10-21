/**
 * iGROWth · Google Apps Script — înscrierile de pe sportiveducat.ro/parteneri
 * ajung ca rânduri noi într-un Google Sheet.
 *
 * INSTALARE (o singură dată, ~5 minute)
 * ------------------------------------------------------------------------
 * 1. Deschide Google Sheet-ul „Parteneri — înscrieri sportiveducat.ro"
 *    (sau creează unul nou în Google Drive).
 * 2. Meniu: Extensii → Apps Script. Șterge codul existent și lipește
 *    tot fișierul ăsta.
 * 3. Schimbă TOKEN-ul de mai jos cu un șir lung, aleatoriu
 *    (ex. generat cu: openssl rand -hex 24). Salvează (Ctrl+S).
 * 4. Deploy → New deployment → tipul „Web app":
 *      Execute as:     Me
 *      Who has access: Anyone
 *    → Deploy → autorizează contul → copiază „Web app URL"
 *      (arată ca https://script.google.com/macros/s/AKfy…/exec).
 * 5. În Cloudflare → proiectul sportiveducat → Settings → Variables and
 *    Secrets, pe Production, adaugă:
 *      PARTNER_SHEET_URL    = Web app URL de la pasul 4
 *      PARTNER_SHEET_TOKEN  = același TOKEN ca la pasul 3   (tip: Secret)
 *    și refă deploy-ul (sau așteaptă următorul push).
 * 6. Verificare: https://sportiveducat.ro/api/lead în browser trebuie să
 *    arate "sheet_parteneri": true. Apoi trimite un formular de test.
 *
 * „Anyone" e necesar ca funcția Cloudflare să poată apela scriptul fără
 * login Google. Scrierea e protejată de TOKEN: fără el, cererea e refuzată.
 *
 * Dacă modifici codul: Deploy → Manage deployments → Edit → Version: New
 * version. URL-ul rămâne același.
 *
 * Fișierul poate fi descărcat oricând ca Excel: Fișier → Descarcă →
 * Microsoft Excel (.xlsx).
 */

const TOKEN = 'SCHIMBA-MA-cu-un-sir-lung-si-aleatoriu';
const SHEET_NAME = 'Înscrieri';

/** Ordinea coloanelor din tabel: [cheia din formular, titlul coloanei]. */
const COLUMNS = [
  ['created_at',        'Data (UTC)'],
  ['role',              'Tip'],
  ['full_name',         'Nume'],
  ['club_name',         'Club / echipă'],
  ['city',              'Oraș'],
  ['sport',             'Sport'],
  ['athletes',          'Nr. sportivi'],
  ['phone',             'Telefon'],
  ['email',             'Email'],
  ['call_time',         'Interval preferat'],
  ['estimated_monthly', 'Estimare calculator (€/lună)'],
  ['utm_source',        'utm_source'],
  ['utm_medium',        'utm_medium'],
  ['utm_campaign',      'utm_campaign'],
  ['utm_content',       'utm_content'],
  ['utm_term',          'utm_term'],
  ['gclid',             'gclid'],
  ['fbclid',            'fbclid'],
  ['landing_url',       'Pagina de intrare'],
  ['referrer',          'Referrer'],
  ['country',           'Țară'],
  ['_status',           'Status'],
  ['_notes',            'Note'],
];

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'bad json' });
  }
  if (!data || data.token !== TOKEN) return reply({ ok: false, error: 'unauthorized' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const row = COLUMNS.map(([key]) => {
      if (key === '_status') return 'Nou';
      if (key === '_notes') return '';
      if (key === 'role') return data.role === 'club' ? 'Club' : 'Antrenor';
      if (key === 'created_at') return data.created_at ? new Date(data.created_at) : new Date();
      /* apostroful oprește Sheets să transforme telefonul în număr
         (și să piardă 0-ul de la început) sau să execute „=formule" */
      const v = String(data[key] ?? '').slice(0, 500);
      return /^[=+\-@0]/.test(v) ? "'" + v : v;
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/** GET pe URL-ul scriptului — verificare rapidă din browser. */
function doGet() {
  return reply({ ok: true, info: 'iGROWth · parteneri → Google Sheets' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    /* prima foaie, goală, a unui fișier nou se refolosește, ca să nu rămână „Sheet1" gol */
    const first = ss.getSheets()[0];
    sheet = first.getLastRow() === 0 ? first.setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(([, title]) => title));
    sheet.getRange(1, 1, 1, COLUMNS.length)
      .setFontWeight('bold').setBackground('#0E2A5C').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
