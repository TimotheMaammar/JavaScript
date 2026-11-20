/**
 * Copies TLDR newsletter emails from Gmail into Drive, one folder per day.
 * Layout: TLDR/dump_2026-11-20/0712_<subject>.txt (any number of mails per day)
 *
 * Gmail is only READ: no label, no move, no archive, no delete.
 * Already-copied mails are remembered inside this script (Script Properties).
 *
 * Setup:
 *  1. Paste this file in a new project at script.google.com.
 *  2. Adjust QUERY below (a Gmail search, same syntax as the Gmail search bar).
 *  3. Run setup() once (accept the permissions), then runDump() to test.
 */

// Gmail search used to find the newsletters. Examples:
//   'from:dan@tldrnewsletter.com newer_than:14d'   (no filter or label needed)
//   'label:tldr newer_than:14d'                    (if you made a Gmail filter)
// The newer_than part is the look-back window: widen it once to backfill old mails.


const QUERY = 'from:dan@tldrnewsletter.com newer_than:14d';
const ROOT_FOLDER = 'TLDR';             // Drive root folder, created if missing
const MAX_CHARS_PER_MAIL = 90000;       // safety cap per email
const FORGET_AFTER_DAYS = 10;           // how long "already copied" memory is kept

function runDump() {
  const root = getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER);
  const tz = Session.getScriptTimeZone();
  const props = PropertiesService.getScriptProperties();
  const seen = props.getProperties();

  // No upper limit on the number of mails: page through all search results.
  const PAGE = 100;
  let start = 0;
  let threads = GmailApp.search(QUERY, start, PAGE);
  while (threads.length > 0) {
    threads.forEach(function (thread) {
      thread.getMessages().forEach(function (msg) {
        const key = 'id_' + msg.getId();
        if (seen[key]) return; // already copied

        const day = Utilities.formatDate(msg.getDate(), tz, 'yyyy-MM-dd');
        const time = Utilities.formatDate(msg.getDate(), tz, 'HHmm');
        const dayFolder = getOrCreateFolder_(root, 'dump_' + day); // created only when a mail exists
        const subject = msg.getSubject() || '(no subject)';
        const body = cleanBody_(msg.getPlainBody()).slice(0, MAX_CHARS_PER_MAIL);
        const content =
          'Date: ' + day + ' ' + time + '\n' +
          'From: ' + msg.getFrom() + '\n' +
          'Subject: ' + subject + '\n\n' +
          body + '\n';
        const safeName = subject.replace(/[^\w\- ]+/g, '').trim().slice(0, 60).replace(/\s+/g, '_');
        dayFolder.createFile(time + '_' + safeName + '.txt', content, MimeType.PLAIN_TEXT);

        props.setProperty(key, day); // remember it, only inside this script
        seen[key] = day;
      });
    });
    if (threads.length < PAGE) break;
    start += PAGE;
    threads = GmailApp.search(QUERY, start, PAGE);
  }

  forgetOld_(props, seen, tz);
}

function cleanBody_(text) {
  // Collapse long runs of blank lines and trim trailing spaces
  return (text || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Housekeeping of this script's own memory only (Gmail and Drive are untouched).
function forgetOld_(props, seen, tz) {
  const cutoff = Utilities.formatDate(
    new Date(Date.now() - FORGET_AFTER_DAYS * 24 * 3600 * 1000), tz, 'yyyy-MM-dd');
  Object.keys(seen).forEach(function (key) {
    if (key.indexOf('id_') === 0 && seen[key] < cutoff) props.deleteProperty(key);
  });
}

function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * Run once: creates a daily trigger. Google runs it at a random moment inside
 * the chosen hour (20 = between 20:00 and 21:00, script time zone), so the whole
 * day's newsletters are already in the mailbox.
 */
function setup() {
  const RUN_HOUR = 20;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runDump') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDump').timeBased().everyDays(1).atHour(RUN_HOUR).create();
}
