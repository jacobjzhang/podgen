# Podgen Roadmap

This is a living roadmap. Priorities may shift based on user feedback and unit economics.

## Near-Term (0-3 months)
- **Database**: persist episodes, user profiles, preferences, and topic history.
- **Auth**: email + OAuth (Google/Apple) with team workspaces.
- **Queueing audio generation**: async jobs, retries, and status updates; show progress in UI.
- **URL validation**: sanitize/validate user-submitted URLs, blocklists, and fetch heuristics.
- **Storage**: move audio from base64 to object storage with signed URLs.
- **Audio QA**: automated checks for length, truncation, silence, and missing chunks.
- **Discoverability metadata**: auto-generate titles + short excerpts for each episode.
- **Observability**: latency, cost per episode, failure rate, and cache hit rate.

## Mid-Term (3-9 months)
- **Personalization engine**: listening habits, topic weighting, host style tuning.
- **Scheduling**: daily/weekly shows with RSS feeds and calendar triggers.
- **Collaboration**: shared topic lists, templates, and team editing.
- **Multilingual**: bilingual shows and region-specific news.
- **Audio post**: intro/outro music, leveling, noise reduction, chapters.
- **Dynamic ad insertion**: injected audio ads with targeting and frequency caps.

## Long-Term (9-24 months)
- **Creator marketplace**: sell show templates, host styles, and branded voices.
- **Enterprise news rooms**: internal briefing pods per department/region.
- **API platform**: programmatic generation for partners and apps.
- **Content graph**: link topics, sources, and trends for better story selection.
- **Mobile apps**: offline listening, push-to-play morning briefings.

## $1B Valuation Ideas
- **Distribution moat**: default daily briefings for teams (Slack/Teams/Email/RSS).
- **Enterprise ARR**: security, governance, and compliance for large orgs.
- **Marketplace take-rate**: revenue share on premium templates/voices/brands.
- **API usage revenue**: metered TTS + dialogue generation at scale.
- **Data flywheel**: feedback improves topic selection and retention.
- **Network effects**: shared templates + public charts of “most listened to” briefs.
- **Brand partnerships**: sponsored segments with transparent labeling.
- **Localization at scale**: thousands of hyper-local news shows.
