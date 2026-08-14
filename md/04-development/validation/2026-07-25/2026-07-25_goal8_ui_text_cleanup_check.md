# Goal 8 UI Text Cleanup Check - 2026-07-25

## Scope

This check covers the cleanup of student-facing mojibake and broken Chinese UI text in `Mental-LLM_JxFdj`:

- `index.html`
- `src/app/pageRuntime.js`

## Implementation Result

Cleaned user-visible text includes:

- page title and mobile app title
- left navigation titles
- mood/status switcher labels
- welcome headings and supporting copy
- chat and GAD panel titles
- pause / restart / exit button titles
- greeting bubble text
- input placeholders
- microphone status text
- profile-page card headings and advisory text
- login modal title, description, labels, and primary button
- settings modal headings and key placeholders
- mobile floating-menu item labels
- floating-ball icon fallback

Also aligned:

- default `pageRuntime.js` greeting fallback text
- initial profile upload-status text in `index.html`

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

```powershell
$env:PYTHONIOENCODING='utf-8'; @'
from pathlib import Path
path = Path('index.html')
for i, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
    if any(token in line for token in ['浣','鍐','璇','鏈','鐒','寮','鍚','姝','鏆','銆','锛','€','','','','鑱','椹','伉','妫','牭','墠','櫔']) and not line.strip().startswith('<!--'):
        print(f'{i}: {line}')
'@ | python -
```

Result: no remaining user-visible mojibake hits. The only earlier false positive was the Google Fonts URL containing `display=swap`.

## Residual Risks

- Some HTML comments still contain old mojibake text from historical source content; they are non-user-facing and were not rewritten in this slice.
- Student-facing copy is now readable, but external live Agent/workflow/Feishu integration still requires separate verification.
