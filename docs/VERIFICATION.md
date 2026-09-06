# Verification — 6 September 2026

**Story:** a citizen describes a problem, confirms a supported destination, prepares and edits a document, downloads it, finds the official filing channel, and can explicitly save a case and record follow-up events when the private services are configured.

| Boundary                                   | Result                              | Evidence                                                                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build and code checks                      | Pass                                | Production Next.js build, ESLint, TypeScript, `git diff --check`; dependency audit: zero vulnerabilities.                                                                                                        |
| Domain and database                        | Pass                                | 60 Vitest tests. Full migrations run in PGlite with authenticated/service roles, RLS, ownership checks, budget reservations, enrollment caps, event history, retry leases, email quotas, deletion and retention. |
| Routing                                    | Pass for this synthetic baseline    | 100 labeled cases: 60 supported across all 15 routes, 20 explicitly unsupported and 20 ambiguous. All matched their expected outcomes. No claim about unseen real-world accuracy or the live model.              |
| Browser → API → template → preview → guide | Pass                                | 19 Playwright tests, including all 15 entity/pathway journeys against the local app, AI-unavailable fallback, edited identity without losing facts, and PDF download.                                            |
| Account UI                                 | Pass against simulated API contract | Invalid OTP, voluntary storage, filing, exceptional event, estimate suppression, reminder preference, export and deletion. Actual Supabase Auth/SMTP require deployment verification.                            |
| Accessibility and responsive layout        | Automated checks pass               | axe checks on home, directory, guide, preview, account and privacy screens; skip-link keyboard focus; 320px layout and 200% CSS zoom reflow. Not a WCAG certification or real screen-reader usability test.      |
| Privacy in browser                         | Pass                                | Identity absent from draft-generation payload; persistent storage opt-in; expired drafts discarded; no account auto-save.                                                                                        |
| PDF                                        | Pass                                | Synthetic one-page SENA document rendered and visually inspected; identity, recipient, facts, requests, legal references and signature remain readable.                                                          |
| Public data                                | Pass                                | All five identities checked against DAFP. DANE import validates 1,121 distinct codes in 33 department/district groups.                                                                                           |
| Source availability                        | Pass at check time                  | 11 URLs responded successfully without redirects; 0 sources older than 30 days. The ICETEX homepage redirect was reviewed and its canonical URL adopted. HTTP success does not verify a completed submission.    |

## Fixes found by verification

- Corrected aggregate rounding in SQL (SUM(bigint) produces numeric).
- Fixed import resolution for workspace paths containing spaces.
- Improved contrast of small labels and keyboard skip-link focus.
- Removed decorative mobile overflow at high zoom.
- Preserved edited facts when updating identity.
- Made the reminder preference respond immediately while the server saves it.
- Exposed exhausted reminder retries to the protected worker health result.

## Deployment and participant checks outstanding

No cloud migration, production deployment, live AI invocation or email delivery was performed. No citizen petition was submitted to a government entity. No participant usability session occurred.

Configure the real operator and verified privacy contact, dedicated Supabase project, SMTP, worker and budget settings. Then execute the live checks and ten-person usability protocol in RELEASE.md before opening the 50-person beta. Production RLS and Auth behavior must be checked through the actual Supabase API in addition to the embedded database tests.

The proposed privacy contact remains `info@mipeticion.co` in the environment example. It is not represented as a verified mailbox. Account storage is gated until the required operator and service settings are present.
