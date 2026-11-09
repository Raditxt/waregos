// PreToolUse hook: blokir perintah git berbahaya dari Claude (Bash & PowerShell).
// Exit 2 = tolak tool call; pesan di stderr dikirim balik ke Claude.
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = JSON.parse(raw)?.tool_input?.command ?? '';
  } catch {
    process.exit(0);
  }

  const rules = [
    [/\bgit\b[^\n;|&]*\spush\b/i, 'git push (push dilakukan Raditya sendiri)'],
    [/\bgit\b[^\n;|&]*\sreset\b[^\n;|&]*--hard\b/i, 'git reset --hard'],
    [/\bgit\b[^\n;|&]*\sclean\b[^\n;|&]*\s-[a-z]*f/i, 'git clean -f'],
    [/\bgit\b[^\n;|&]*\sbranch\b[^\n;|&]*\s(-D\b|--delete\s+--force|-d\s+--force|--force\s+-d)/, 'git branch -D'],
    [/\bgit\b[^\n;|&]*\scheckout\b[^\n;|&]*\s(--\s+)?\.(\s|$|["';|&])/i, 'git checkout . (buang semua perubahan)'],
    [/\bgit\b[^\n;|&]*\srestore\b[^\n;|&]*\s\.(\s|$|["';|&])/i, 'git restore . (buang semua perubahan)'],
  ];

  for (const [re, label] of rules) {
    if (re.test(cmd)) {
      process.stderr.write(
        `Diblokir oleh git-guardrails: ${label}. Perintah ini dilarang untuk Claude di repo ini. ` +
          `Minta Raditya menjalankannya sendiri (mis. ketik "! <perintah>").\n`,
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
