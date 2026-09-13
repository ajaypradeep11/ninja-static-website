# Connect the Voice bots tab to Vapi

The website starts calls with assistants you create in Vapi. It does not create assistants or send booking credentials from the browser. The standalone booking service lives next door at `../generic-backend`; see its README for deployment, tenant setup, and tool definitions.

## Website configuration

Copy `.env.example` to `.env.local` and fill in:

| Variable | Value from Vapi |
| --- | --- |
| `VITE_VAPI_PUBLIC_KEY` | Public key for commercial assistants |
| `VITE_VAPI_CLINIC_PUBLIC_KEY` | Public key for the clinic organization |
| `VITE_VAPI_CLINIC_ASSISTANT_ID` | Maple Clinic assistant ID |
| `VITE_VAPI_DEALER_ASSISTANT_ID` | Rideau Motorworks assistant ID |
| `VITE_VAPI_RESTAURANT_ASSISTANT_ID` | Ember & Oak assistant ID |
| `VITE_VAPI_REALTY_ASSISTANT_ID` | Optional existing realty assistant ID |

Run `npm run dev`, open `/work.html`, and choose **Voice bots**. The featured clinic assistant supports **Start voice call** directly on the showcase page. Grant microphone permission. **End call** stops the call; switching to another project category also stops a connecting or active showcase call. Other business cards open their own assistant pages. HTTPS is required outside localhost. Voice pages do not fall back to scripted booking confirmations. The clinic interface does not display call transcripts.

Project categories use a sliding pill indicator in the desktop sidebar. **Voice bots** is first and selected by default. The Rideau Motorworks, Ember & Oak, and Northshore voice demos are grouped under **Sample projects**, with sample badges. On mobile, the **Filters** button expands the categories and selecting one closes them. Arrow Up/Down and Home/End navigate categories; Escape closes the mobile controls. The indicator does not animate when reduced motion is enabled.

The clinic and dealer retain text-chat demos when opened normally. Their standalone voice pages are available with `?mode=voice#assistant`; the dealer card uses this link. Restaurant and realty use voice by default. Realty can connect to a Vapi assistant, but the shared backend currently implements only clinic, automotive, and restaurant booking rules.

Public keys are deliberately included in browser bundles. Restrict each public key to your website origins and the intended assistant IDs in Vapi. The clinic key is separate so a healthcare Vapi organization can be isolated too. Never use a Vapi private key or a tenant booking credential in a `VITE_` variable. See [Vapi public-key configuration](https://docs.vapi.ai/security-and-privacy/api-keys).

## Hosted build

Vite reads these variables at build time. Add the same names as GitHub repository **Actions variables** using the GitHub settings UI. The existing live deployment workflow passes them to the build. Changes to variables require a new build. PR preview deployments use separate `VITE_VAPI_PREVIEW_*` variables; they remain unavailable unless you deliberately configure preview assistants and origins.

No Cloud Run URL or tenant API secret belongs in this frontend. Calls go through the [Vapi Web SDK](https://docs.vapi.ai/quickstart/web); Vapi invokes authenticated booking tools on Cloud Run. The browser supplies only a public key and assistant ID. The small `src/work/voice.js` adapter is the boundary to replace when adding another voice provider.

## What remains to activate a business

1. Create its assistant in Vapi and use a matching business/service prompt.
2. Deploy `generic-backend`, provision the tenant, and add its generated booking tools to that assistant.
3. Configure the fixed `X-Tenant-ID` and tenant-specific Bearer credential on the tools in Vapi; do not put either in model arguments.
4. Fill in the website public key and assistant ID, then rebuild.
5. Place a real test call and confirm the booking in Firestore and, if enabled, Google Calendar.

Unit/browser tests use substitutes for Vapi, Calendar, and SMS. An actual voice call and cloud booking require your accounts and credentials.
