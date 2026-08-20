---
version: alpha
name: Bank-Grade eKYC Biometric System
description: Visual Identity and Design System Specification for SIC FaceRecognition eKYC Web Application
colors:
  primary: "#0F172A"       # Deep Slate / Navy Base
  secondary: "#334155"     # Slate Secondary Text & Borders
  tertiary: "#2563EB"      # Electric Blue Accent (Primary Buttons & Active State)
  success: "#059669"       # Emerald Green (Pass Liveness & Successful Match)
  warning: "#D97706"       # Amber Warning (Low Light / Reposition Face)
  error: "#DC2626"         # Crimson Red (Spoof Detected / Match Failed)
  neutral: "#F8FAFC"       # Off-white Text on Dark Surfaces
  surface: "#1E293B"       # Dark Glassmorphism Card Surface
  background: "#090D16"    # Midnight Deep Background
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: 500
    letterSpacing: 0.05em
rounded:
  sm: 6px
  md: 12px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# DESIGN.md — Bank-Grade eKYC Visual Identity Specification

This document defines the persistent visual identity and design system for the **SIC FaceRecognition eKYC** web application according to the Google Labs `DESIGN.md` specification format.

---

## 1. Overview (Brand & Style)

The **SIC eKYC System** visual identity evokes **high-tech trust, bank-grade security, and crisp biometric precision**. 
- **Mood**: Sleek dark mode, glassmorphism UI cards, precise biometric HUD overlays, soft neon indicator rings.
- **Aesthetic**: Premium financial institution UI (resembling modern banking apps like Revolut, MBBank, Techcombank).
- **Core Principle**: Clear visual feedback at every step of the face liveness check.

---

## 2. Colors

The color palette is built around high-contrast midnight neutrals, electric blue accents, and unambiguous biometric status colors:

- **Primary (`#0F172A`)**: Deep Navy Slate used for core headers and container frames.
- **Secondary (`#334155`)**: Muted slate used for secondary text, subtle dividers, and inactive borders.
- **Tertiary (`#2563EB`)**: Electric Blue driving primary interactions, buttons, and active camera focus.
- **Success (`#059669`)**: Emerald Green used when Liveness checks pass and Face Verification succeeds.
- **Warning (`#D97706`)**: Amber Orange indicating poor lighting or request to adjust head position.
- **Error (`#DC2626`)**: Crimson Red indicating Anti-spoofing alert or Match failure.
- **Surface (`#1E293B`)**: Semi-transparent dark glass surface (`backdrop-filter: blur(12px)`).
- **Background (`#090D16`)**: Midnight black-blue foundational background.

---

## 3. Typography

- **Headlines (`Inter`)**: Clean, authoritative sans-serif establishing institutional trust.
- **Body (`Inter`)**: High readability for instructions and eKYC step descriptions.
- **Labels & Metrics (`Space Grotesk`)**: Monospaced geometric font used for 512-d vector metrics, confidence scores (e.g., `99.4%`), timestamps, and pose angles (`Yaw: -12°`).

---

## 4. Layout & Spacing

- **Camera Viewport**: Centered 4:3 or 16:9 responsive video container with an interactive Oval Biometric Guide.
- **Card Padding**: Spacing scale (`md: 16px`, `lg: 24px`, `xl: 32px`).
- **Responsive Layout**: Single column centered modal for mobile devices; split-screen (Camera HUD + Live Metrics) on desktop.

---

## 5. Elevation & Depth

- **Glassmorphism**: Cards use `background: rgba(30, 41, 59, 0.7)`, `border: 1px solid rgba(255, 255, 255, 0.1)`, and `backdrop-filter: blur(16px)`.
- **Glow Effects**: Active camera oval HUD features a subtle outer glow (`box-shadow: 0 0 25px rgba(37, 99, 235, 0.3)`).

---

## 6. Shapes & Radius

- **Cards & Modals**: Smooth `lg: 20px` rounded corners.
- **Buttons & Badges**: Pill-shaped `full: 9999px` or `md: 12px`.
- **Biometric Guide**: Dynamic oval ring overlaid on camera video stream.

---

## 7. Components

### Camera Oval HUD
- Center oval guide line.
- Dynamic color change: Gray (Searching) ➔ Blue (Positioning) ➔ Green (Live Verified) ➔ Red (Spoof Alert).

### Status Badge
- Rounded pill badge displaying confidence score and status (e.g., `PASS 98.6%`).

---

## 8. Do's and Don'ts

### Do:
- ✅ Always provide instant visual indicator (color ring & micro-animation) when head pose changes.
- ✅ Use high contrast for text over dark glass surfaces.
- ✅ Display monospaced `Space Grotesk` for confidence metrics and vector distances.

### Don't:
- ❌ Do not use plain, unstyled HTML default inputs or browser buttons.
- ❌ Do not use bright white backgrounds for camera viewports.
- ❌ Do not hide liveness progress indicators from the user.
