/**
 * CertChain — app.js
 * Blockchain Academic Certification Simulator
 * Uses localStorage to persist certificates across sessions.
 * All blockchain interactions are simulated with realistic loading states.
 */

// ══════════════════════════════════════════════
//  CONSTANTS & STATE
// ══════════════════════════════════════════════

const STORAGE_KEY = 'certchain_certificates';
const LOADING_MESSAGES = [
  'Broadcasting transaction to network...',
  'Waiting for node confirmation...',
  'Block found · Recording hash...',
  'Writing to immutable ledger...',
  'Finalizing certificate record...',
];

let currentHash = '';           // Holds the last generated hash for copy
let loadingInterval = null;     // Interval for cycling loading messages
let messageIndex = 0;           // Tracks which loading message to show

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════

/**
 * showView(viewName)
 * Switches between 'home', 'issue', and 'verify' views.
 * Updates nav link active states and scrolls to top.
 */
function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(function (el) {
    el.classList.remove('active');
  });

  // Show the requested view
  var target = document.getElementById('view-' + viewName);
  if (target) {
    target.classList.add('active');
  }

  // Update nav active states
  ['home', 'issue', 'verify'].forEach(function (name) {
    var navEl = document.getElementById('nav-' + name);
    if (navEl) {
      if (name === viewName) {
        navEl.classList.add('active');
      } else {
        navEl.classList.remove('active');
      }
    }
  });

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If switching to verify, load recent certs from localStorage
  if (viewName === 'verify') {
    loadRecentCerts();
    // Clear previous result when switching views
    var verifyResult = document.getElementById('verify-result');
    if (verifyResult) {
      verifyResult.classList.add('hidden');
      verifyResult.innerHTML = '';
    }
    var verifyInput = document.getElementById('verify-input');
    if (verifyInput) {
      verifyInput.value = '';
    }
  }
}

/**
 * toggleMobileMenu()
 * Shows/hides the mobile navigation dropdown.
 */
function toggleMobileMenu() {
  var menu = document.getElementById('mobile-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// ══════════════════════════════════════════════
//  HASH GENERATION
// ══════════════════════════════════════════════

/**
 * generateHash()
 * Produces a pseudo-random 64-character hex string
 * formatted as a SHA-256 / Ethereum TX hash style ID.
 * Example: 0x8f4b2a1c3e9d7f5b...
 */
function generateHash() {
  var chars = '0123456789abcdef';
  var hash = '0x';
  for (var i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

/**
 * generateBlockNumber()
 * Returns a realistic-looking Ethereum mainnet block number.
 */
function generateBlockNumber() {
  var base = 19800000;
  var offset = Math.floor(Math.random() * 100000);
  return (base + offset).toLocaleString();
}

/**
 * generateTimestamp()
 * Returns a formatted date/time string for the current moment.
 */
function generateTimestamp() {
  var now = new Date();
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ══════════════════════════════════════════════
//  LOCAL STORAGE HELPERS
// ══════════════════════════════════════════════

/**
 * getCertificates()
 * Returns all stored certificates as an object keyed by hash.
 */
function getCertificates() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * saveCertificate(hash, data)
 * Persists a certificate record to localStorage.
 */
function saveCertificate(hash, data) {
  var certs = getCertificates();
  certs[hash] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

/**
 * findCertificate(hash)
 * Looks up a certificate by its hash. Returns null if not found.
 * Normalises the input (trims whitespace, lowercases) before lookup.
 */
function findCertificate(hash) {
  if (!hash) return null;
  var normalised = hash.trim().toLowerCase();
  var certs = getCertificates();

  // Direct match
  if (certs[normalised]) return certs[normalised];

  // Case-insensitive scan (handles mixed-case input)
  var keys = Object.keys(certs);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === normalised) {
      return certs[keys[i]];
    }
  }
  return null;
}

// ══════════════════════════════════════════════
//  ISSUE LOGIC
// ══════════════════════════════════════════════

/**
 * handleIssue(event)
 * Called when the issue form is submitted.
 * 1. Validates inputs.
 * 2. Shows a loading state with cycling messages.
 * 3. After 2.5 seconds, generates a hash, saves to localStorage,
 * and displays the result card.
 */
function handleIssue(event) {
  event.preventDefault();

  // Read form values
  var studentName = document.getElementById('student-name').value.trim();
  var degree      = document.getElementById('degree').value.trim();
  var university  = document.getElementById('university').value.trim();
  var year        = document.getElementById('year').value.trim();

  // Basic validation (HTML required attrs handle empty, but double-check)
  if (!studentName || !degree || !university || !year) {
    shakeButton('issue-btn');
    return;
  }

  // Disable submit button and show loading
  var issueBtn  = document.getElementById('issue-btn');
  var btnText   = document.getElementById('issue-btn-text');
  var loading   = document.getElementById('issue-loading');
  var statusEl  = document.getElementById('loading-status');

  issueBtn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span><span>Minting to Blockchain...</span>';
  loading.classList.remove('hidden');
  document.getElementById('issue-result').classList.add('hidden');

  // Cycle through loading messages every 500ms
  messageIndex = 0;
  statusEl.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(function () {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    statusEl.textContent = LOADING_MESSAGES[messageIndex];
  }, 500);

  // Simulate 2.5s blockchain minting delay
  setTimeout(function () {
    clearInterval(loadingInterval);
    loading.classList.add('hidden');

    // Generate certificate data
    var hash      = generateHash();
    var block     = generateBlockNumber();
    var timestamp = generateTimestamp();

    currentHash = hash;

    var certData = {
      hash:        hash,
      studentName: studentName,
      degree:      degree,
      university:  university,
      year:        year,
      block:       block,
      timestamp:   timestamp,
      issuedAt:    Date.now(),
    };

    // Persist to localStorage
    saveCertificate(hash, certData);

    // Render the success result
    renderIssueResult(certData);

    // Reset button
    issueBtn.disabled = false;
    btnText.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
      'Mint to Blockchain';

    console.log('[CertChain] Certificate minted:', certData);

  }, 2500);
}

/**
 * renderIssueResult(data)
 * Builds and displays the success card after a certificate is minted.
 */
function renderIssueResult(data) {
  var resultEl   = document.getElementById('issue-result');
  var hashEl     = document.getElementById('result-hash');
  var blockEl    = document.getElementById('result-block');
  var detailsEl  = document.getElementById('result-details');

  // Set hash and block
  hashEl.textContent  = data.hash;
  blockEl.textContent = 'Block #' + data.block;

  // Build detail chips
  var details = [
    { label: 'Student',     value: data.studentName },
    { label: 'Degree',      value: data.degree },
    { label: 'University',  value: data.university },
    { label: 'Year',        value: data.year },
    { label: 'Issued',      value: data.timestamp },
    { label: 'Status',      value: '✓ On-Chain', green: true },
  ];

  detailsEl.innerHTML = details.map(function (d) {
    return (
      '<div style="background:rgba(6,11,24,0.6);border:1px solid #1e3054;border-radius:8px;padding:0.75rem;">' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4d6a96;margin-bottom:0.25rem;">' + d.label + '</div>' +
        '<div style="font-size:0.82rem;font-weight:500;color:' + (d.green ? '#34d399' : '#c8d8ee') + ';">' + escapeHtml(d.value) + '</div>' +
      '</div>'
    );
  }).join('');

  resultEl.classList.remove('hidden');

  // Scroll into view smoothly
  setTimeout(function () {
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/**
 * resetIssueForm()
 * Clears the issue form so the user can issue another certificate.
 */
function resetIssueForm() {
  document.getElementById('issue-form').reset();
  document.getElementById('issue-result').classList.add('hidden');
  document.getElementById('issue-loading').classList.add('hidden');
  currentHash = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════
//  COPY LOGIC
// ══════════════════════════════════════════════

/**
 * copyHash()
 * Copies the current certificate hash to the clipboard.
 * Briefly changes the button label to "COPIED ✓".
 */
function copyHash() {
  if (!currentHash) return;

  var copyBtn   = document.getElementById('copy-btn');
  var labelEl   = document.getElementById('copy-btn-label');

  // Use modern clipboard API, fall back to execCommand
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(currentHash).then(function () {
      flashCopySuccess(copyBtn, labelEl);
    }).catch(function () {
      fallbackCopy(currentHash, copyBtn, labelEl);
    });
  } else {
    fallbackCopy(currentHash, copyBtn, labelEl);
  }
}

function fallbackCopy(text, btn, label) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    flashCopySuccess(btn, label);
  } catch (e) {
    label.textContent = 'ERROR';
  }
  document.body.removeChild(textarea);
}

function flashCopySuccess(btn, label) {
  btn.classList.add('copied');
  label.textContent = 'COPIED ✓';
  setTimeout(function () {
    btn.classList.remove('copied');
    label.textContent = 'COPY';
  }, 2000);
}

// ══════════════════════════════════════════════
//  VERIFY LOGIC
// ══════════════════════════════════════════════

/**
 * handleVerify()
 * Reads the input hash and looks it up in localStorage.
 * Renders a green success card or a red error card.
 */
function handleVerify() {
  var input    = document.getElementById('verify-input');
  var hash     = input ? input.value.trim() : '';
  var resultEl = document.getElementById('verify-result');
  var verifyBtn = document.getElementById('verify-btn');
  var btnText   = document.getElementById('verify-btn-text');

  if (!hash) {
    shakeElement(input);
    return;
  }

  // Show loading state on verify button
  verifyBtn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span>';

  // Simulate 1.2s query delay
  setTimeout(function () {
    verifyBtn.disabled = false;
    btnText.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="w-4 h-4"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>' +
      'Verify';

    var cert = findCertificate(hash);

    resultEl.classList.remove('hidden');

    if (cert) {
      renderVerifySuccess(cert, resultEl);
      console.log('[CertChain] Verification SUCCESS for hash:', hash, cert);
    } else {
      renderVerifyError(hash, resultEl);
      console.log('[CertChain] Verification FAILED — hash not found:', hash);
    }

    setTimeout(function () {
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  }, 1200);
}

/**
 * renderVerifySuccess(cert, container)
 * Renders the green "Verified" card with certificate details.
 */
function renderVerifySuccess(cert, container) {
  var details = [
    { label: 'Student Name', value: cert.studentName },
    { label: 'Degree',       value: cert.degree },
    { label: 'University',   value: cert.university },
    { label: 'Year',         value: cert.year },
    { label: 'Issued On',    value: cert.timestamp || 'N/A' },
    { label: 'Block Number', value: '#' + cert.block },
  ];

  var detailsHtml = details.map(function (d) {
    return (
      '<div style="background:rgba(6,11,24,0.6);border:1px solid #1e3054;border-radius:8px;padding:0.75rem;">' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4d6a96;margin-bottom:0.25rem;">' + d.label + '</div>' +
        '<div style="font-size:0.85rem;font-weight:500;color:#e8f0fb;">' + escapeHtml(String(d.value)) + '</div>' +
      '</div>'
    );
  }).join('');

  container.innerHTML =
    '<div class="verified-card rounded-2xl p-6" style="animation: slideUp 0.4s ease forwards;">' +
      // Header
      '<div class="flex items-start gap-4 mb-5">' +
        '<div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style="background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.4);">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
        '</div>' +
        '<div>' +
          '<div class="flex items-center gap-2 mb-1">' +
            '<p style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:1.05rem;color:#34d399;">✓ Verified: Authentic Credential</p>' +
          '</div>' +
          '<p style="font-size:0.82rem;color:#4d6a96;">This certificate exists on the blockchain and has not been tampered with.</p>' +
        '</div>' +
      '</div>' +
      // Hash display
      '<div class="rounded-lg p-4 mb-4" style="background:rgba(6,11,24,0.7);border:1px solid #1e3054;">' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4d6a96;margin-bottom:0.5rem;">Certificate ID</div>' +
        '<div class="hash-text" style="font-size:0.78rem;opacity:0.9;">' + escapeHtml(cert.hash) + '</div>' +
      '</div>' +
      // Details grid
      '<div class="grid grid-cols-2 gap-2.5 mb-5">' + detailsHtml + '</div>' +
      // Footer badge
      '<div class="flex items-center justify-between pt-4" style="border-top:1px solid rgba(30,48,84,0.8);">' +
        '<div class="flex items-center gap-2">' +
          '<div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>' +
          '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:0.72rem;color:#34d399;">On-Chain · Immutable Record</span>' +
        '</div>' +
        '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:0.7rem;color:#4d6a96;">Block #' + escapeHtml(String(cert.block)) + '</span>' +
      '</div>' +
    '</div>';
}

/**
 * renderVerifyError(hash, container)
 * Renders the red "Not Found" card.
 */
function renderVerifyError(hash, container) {
  container.innerHTML =
    '<div class="error-card rounded-2xl p-6" style="animation: slideUp 0.4s ease forwards;">' +
      '<div class="flex items-start gap-4 mb-4">' +
        '<div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style="background:rgba(239,68,68,0.12);border:2px solid rgba(239,68,68,0.35);">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</div>' +
        '<div>' +
          '<p style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:1.05rem;color:#f87171;margin-bottom:0.25rem;">✗ Error: Credential Not Found on Chain</p>' +
          '<p style="font-size:0.82rem;color:#4d6a96;">No certificate matching this ID was found. It may be invalid, revoked, or was issued on a different device.</p>' +
        '</div>' +
      '</div>' +
      '<div class="rounded-lg p-4 mb-4" style="background:rgba(6,11,24,0.7);border:1px solid #1e3054;">' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4d6a96;margin-bottom:0.5rem;">Queried Hash</div>' +
        '<div class="hash-text" style="color:#f87171;opacity:0.8;font-size:0.78rem;">' + escapeHtml(hash) + '</div>' +
      '</div>' +
      '<div class="flex items-center gap-2 pt-2">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" class="w-4 h-4 flex-shrink-0" opacity="0.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<p style="font-size:0.78rem;color:#4d6a96;">Ensure you copied the complete hash. Certificate data is stored per-device in this demo.</p>' +
      '</div>' +
      '<div class="mt-4 pt-4 flex gap-3" style="border-top:1px solid rgba(30,48,84,0.6);">' +
        '<button class="btn-ghost flex-1 text-xs py-2" onclick="showView(\'issue\')">Issue a Certificate →</button>' +
      '</div>' +
    '</div>';
}

// ══════════════════════════════════════════════
//  RECENT CERTIFICATES
// ══════════════════════════════════════════════

/**
 * loadRecentCerts()
 * Displays a list of recently minted certificates from localStorage
 * in the verify view so users can quickly click to test verification.
 */
function loadRecentCerts() {
  var section  = document.getElementById('recent-certs-section');
  var listEl   = document.getElementById('recent-certs-list');
  var certs    = getCertificates();
  var keys     = Object.keys(certs);

  if (keys.length === 0) {
    section.style.display = 'none';
    return;
  }

  // Sort by issuedAt descending (most recent first), show max 5
  keys.sort(function (a, b) {
    return (certs[b].issuedAt || 0) - (certs[a].issuedAt || 0);
  });

  var recent = keys.slice(0, 5);
  section.style.display = 'block';

  listEl.innerHTML = recent.map(function (hash) {
    var c = certs[hash];
    return (
      '<div class="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-all" ' +
           'style="background:rgba(13,21,38,0.7);border:1px solid #1e3054;" ' +
           'onmouseenter="this.style.borderColor=\'rgba(0,212,255,0.3)\'" ' +
           'onmouseleave="this.style.borderColor=\'#1e3054\'" ' +
           'onclick="fillVerifyInput(\'' + escapeAttr(hash) + '\')">' +
        '<div class="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<p style="font-size:0.82rem;font-weight:600;color:#c8d8ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(c.studentName) + ' — ' + escapeHtml(c.degree) + '</p>' +
          '<p class="hash-text" style="font-size:0.68rem;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(hash) + '</p>' +
        '</div>' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.08em;color:#4d6a96;flex-shrink:0;text-transform:uppercase;">Use →</div>' +
      '</div>'
    );
  }).join('');
}

/**
 * fillVerifyInput(hash)
 * Pre-fills the verify input and triggers verification.
 */
function fillVerifyInput(hash) {
  var input = document.getElementById('verify-input');
  if (input) {
    input.value = hash;
    handleVerify();
  }
}

// ══════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════

/**
 * shakeButton(id)
 * Applies a quick horizontal shake animation to indicate an error.
 */
function shakeButton(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  el.style.transform = 'translateX(0)';

  var keyframes = [
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ];

  if (el.animate) {
    el.animate(keyframes, { duration: 300, easing: 'ease-out' });
  }
}

/**
 * shakeElement(el)
 * Same as shakeButton but accepts a DOM element directly.
 */
function shakeElement(el) {
  if (!el) return;
  if (el.animate) {
    el.animate([
      { transform: 'translateX(-5px)', borderColor: 'rgba(239,68,68,0.6)' },
      { transform: 'translateX(5px)',  borderColor: 'rgba(239,68,68,0.6)' },
      { transform: 'translateX(-3px)', borderColor: 'rgba(239,68,68,0.6)' },
      { transform: 'translateX(0)',    borderColor: '' },
    ], { duration: 280, easing: 'ease-out' });
  }
  el.focus();
}

/**
 * escapeHtml(str)
 * Prevents XSS by escaping user-supplied strings before inserting as HTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * escapeAttr(str)
 * Escapes a string for safe use inside an HTML attribute (e.g. onclick='...').
 */
function escapeAttr(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

// ══════════════════════════════════════════════
//  NAVBAR SCROLL EFFECT
// ══════════════════════════════════════════════

window.addEventListener('scroll', function () {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (window.scrollY > 10) {
    navbar.style.borderBottomColor = 'rgba(30,48,84,0.9)';
    navbar.style.background = 'rgba(6,11,24,0.95)';
  } else {
    navbar.style.borderBottomColor = 'rgba(30,48,84,0.6)';
    navbar.style.background = 'rgba(6,11,24,0.8)';
  }
});

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════

/**
 * Runs once on page load.
 * Checks URL hash to support direct deep-linking (e.g. index.html#verify).
 */
(function init() {
  var hash = window.location.hash.replace('#', '');
  var validViews = ['home', 'issue', 'verify'];
  if (hash && validViews.indexOf(hash) !== -1) {
    showView(hash);
  } else {
    showView('home');
  }

  // Log welcome message to console for developers
  console.log('%c CertChain ', 'background:#0ea5e9;color:#fff;font-family:monospace;font-size:14px;font-weight:bold;padding:4px 8px;border-radius:4px;');
  console.log('%c Blockchain Academic Certification Simulator', 'color:#7a9ac0;font-family:monospace;font-size:11px;');
  console.log('%c localStorage key: "' + STORAGE_KEY + '"', 'color:#4d6a96;font-family:monospace;font-size:10px;');

  var count = Object.keys(getCertificates()).length;
  console.log('%c ' + count + ' certificate(s) stored on this device', 'color:#10b981;font-family:monospace;font-size:10px;');
})();
