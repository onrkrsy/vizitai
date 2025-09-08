window.ApiClient = (() => {
  const base = '';

  async function start(config) {
    const res = await fetch(`${base}/api/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'start failed');
    return data;
  }

  async function message(sessionId, message) {
    const res = await fetch(`${base}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'message failed');
    return data;
  }

  return { start, message };
})();


