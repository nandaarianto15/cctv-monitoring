# Employee Vision AI — Enterprise Suite

A high-performance, edge-first browser application for workplace occupancy and activity observation. Person detection (TensorFlow.js COCO-SSD) and body pose estimation (MediaPipe PoseLandmarker) run entirely in client WebGL memory; users draw desk zones per camera, manually identify employees, and the app derives occupancy, posture, and observable-activity states with temporal smoothing.

**Privacy & Security First:** No backend server required, no face recognition, no biometrics, and zero video persistence. Camera frames are processed strictly in-memory and discarded. Track IDs are temporary and never equated with employee identities automatically.

---

## Architecture & Visual Redesign

The user experience has been completely redesigned into a premium enterprise SaaS monitoring product (inspired by Linear and Raycast) featuring:

- **Mandatory Left Sidebar Navigation:** Persistent, collapsible left sidebar with clear active states and mobile drawer navigation. Absolutely no top navbar.
- **Refined Enterprise Palette:** Light theme foundation (`#F7F8FA`) with dark slate sidebar (`#171A21`), subtle borders (`#E5E8ED`), and restrained status accents (`#5277A8`, `#2F8A65`, `#C18A3C`, `#C65C5C`).
- **Zero-Dependency Lucide-Compatible Design System:** Clean stroke icons, reusable stat cards, custom tables, state badges, and form controls.
- **Independent Observability Dimensions:**
  - **Occupancy:** `IN_ZONE` | `OUT_ZONE`
  - **Posture:** `SITTING` | `STANDING` | `UNKNOWN`
  - **Activity:** `WORKING` | `NOT_WORKING` | `UNKNOWN`
  - **Desk State:** `OCCUPIED` | `UNOCCUPIED` | `UNKNOWN`

---

## Pages & Capabilities

1. **Overview:** Executive dashboard with compact KPI metrics, camera health table, active desk occupancy overview, and real-time event audit log.
2. **Live Monitoring:** Video-first observation interface with detection bounding boxes, tracking confidence, camera switcher, and employee track assignment.
3. **Workspace Mapping:** Interactive polygon canvas (React-Konva) allowing operators to draw, edit, and drag desk boundaries in normalized coordinates.
4. **Employees:** Professional employee directory with search, active badges, and live track assignment inspection.
5. **Activity History:** Chronological audit trail with frequency histogram, multi-criteria filtering, and live identified staff monitoring.
6. **Camera Management:** Video source registry with WebRTC device discovery, mobile facing mode selection, and isolated stream controls.
7. **Settings:** Granular engine tuning including max FPS, frame downscaling, COCO-SSD confidence, MediaPipe pose limits, tracking IoU, temporal dwell/away periods, and data retention.

---

## Quickstart

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

### Verification & Testing

```bash
# Run Vitest unit tests (57 tests)
npm run test

# Strict TypeScript type check
npm run typecheck

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Camera Support & Deployment

Because `getUserMedia` requires a secure context (`https://` or `http://localhost`), local testing works out of the box. For mobile or remote testing:

### ngrok (Tunneling to mobile devices)
```bash
ngrok http 5173
```
Open the generated `https://*.ngrok.app` URL on your phone camera, grant camera permissions, and choose front or rear facing mode in **Camera Management**.

### Zero Video Storage Guarantee
Raw frames from webcams or mobile devices are processed in GPU/WebGL memory for inference only. Images and video streams are never stored on disk or sent over any network. Only metadata events (occupancy, posture, activity transitions) are persisted in the local browser repository.
