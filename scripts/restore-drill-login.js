// Cek login ke API hasil restore drill (docs/restore-drill.md). Dijalankan DI DALAM
// container api (yang tidak punya port di host):
//   dc cp scripts/restore-drill-login.js api:/tmp/login.js
//   dc exec -e DRILL_USERNAME -e DRILL_PASSWORD api node /tmp/login.js
// Kredensial dari environment, tidak pernah dari argumen. Token tidak dicetak.
const username = process.env.DRILL_USERNAME;
const password = process.env.DRILL_PASSWORD;
if (!username || !password) {
  console.error('DRILL_USERNAME dan DRILL_PASSWORD wajib diisi');
  process.exit(2);
}

(async () => {
  const base = 'http://127.0.0.1:3001';
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await login.json().catch(() => ({}));
  if (login.status !== 200 || !body.data?.accessToken) {
    console.error(`GAGAL login: HTTP ${login.status} ${body.error ?? ''} ${body.message ?? ''}`);
    process.exit(1);
  }

  // Token dipakai sekali untuk membuktikan JWT + baca data jalan.
  const me = await fetch(`${base}/api/auth/me`, {
    headers: { authorization: `Bearer ${body.data.accessToken}` },
  });
  if (me.status !== 200) {
    console.error(`GAGAL /api/auth/me: HTTP ${me.status}`);
    process.exit(1);
  }
  const u = body.data.user;
  console.log(`OK login: ${u.username} (${u.role}), /api/auth/me HTTP 200`);
})().catch((err) => {
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
