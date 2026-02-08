/* Jawad — Microphone Setup Page
 * This runs as an extension page (moz-extension://...) so the permission
 * grant applies to all extension pages including the sidebar.
 * After granting, the sidebar can call getUserMedia without any prompt. */

async function enableMic() {
  const btn = document.getElementById('enable-btn');
  const status = document.getElementById('status');

  btn.disabled = true;
  btn.textContent = '⏳ Waiting for permission...';
  status.className = 'info';
  status.textContent = 'Firefox should show a permission prompt now...';

  try {
    // Request mic access — Firefox will show its native permission dialog
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Success! Release the mic immediately (we only needed the permission grant)
    stream.getTracks().forEach(function(t) { t.stop(); });

    // Persist the flag so the sidebar knows setup is done
    await browser.storage.local.set({ jawad_mic_granted: true });

    // Show success UI
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('done-card').classList.add('visible');

    // Auto-close this tab after 1.5 seconds
    setTimeout(function() {
      // Try to close via the tabs API (if we know our tab ID)
      // Otherwise the user can close manually
      browser.tabs.getCurrent().then(function(tab) {
        if (tab && tab.id) browser.tabs.remove(tab.id);
      }).catch(function() {
        // Fallback: just tell user to close
        status.textContent = 'Done! You can close this tab.';
      });
    }, 1500);

  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '🎤 Try Again';

    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      status.className = 'error';
      status.textContent = '❌ Permission denied. Click "Try Again" and select "Allow" when prompted.';
    } else if (e.name === 'NotFoundError') {
      status.className = 'error';
      status.textContent = '❌ No microphone found. Connect a mic and try again.';
    } else if (e.name === 'NotReadableError') {
      status.className = 'error';
      status.textContent = '❌ Microphone is in use by another app. Close it and try again.';
    } else {
      status.className = 'error';
      status.textContent = '❌ Error: ' + e.message;
    }
  }
}

// Check if already granted (e.g. user navigated here manually)
if (navigator.permissions && navigator.permissions.query) {
  navigator.permissions.query({ name: 'microphone' }).then(function(result) {
    if (result.state === 'granted') {
      // Already granted — show done state
      browser.storage.local.set({ jawad_mic_granted: true });
      document.getElementById('setup-card').style.display = 'none';
      document.getElementById('done-card').classList.add('visible');
      setTimeout(function() {
        browser.tabs.getCurrent().then(function(tab) {
          if (tab && tab.id) browser.tabs.remove(tab.id);
        }).catch(function() {});
      }, 1500);
    }
  }).catch(function() {
    // Permissions API not available, proceed normally
  });
}

