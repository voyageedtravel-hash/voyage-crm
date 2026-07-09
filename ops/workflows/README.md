# GitHub Actions Activation (1 minute)

Token mein `workflow` scope nahi tha isliye ye files yahan parked hain.

## Activate karne ke 2 tareeke:

**Option A (fastest):** GitHub.com pe repo kholo → Add file → Create new file →
naam do `.github/workflows/ci.yml` → is folder ki `ci.yml` ka content paste → Commit.
Same for `image-check.yml`.

**Option B:** Naya PAT banao jisme `repo` + `workflow` dono scopes hon
(github.com/settings/tokens) → Claude ko do → wo push kar dega.

## Kya milega:
- **ci.yml** — har push pe JSX parse + Netlify-jaisi `CI=true` build. Fail = pata chal jayega deploy se pehle.
- **image-check.yml** — har Monday saare proposal image URLs live-check + dead milne pe auto GitHub issue.
