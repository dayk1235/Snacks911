---
design-tokens:
  colors:
    palette:
      background:
        deep: "#020203"
        base: "#050506"
        elevated: "#0a0a0c"
      accent:
        primary: "#FF4500"
        hover: "#FF6030"
        gradient: "#FF6B00"
        gold: "#FFB800"
        glow: "rgba(255, 69, 0, 0.2)"
      foreground:
        primary: "#EDEDEF"
        secondary: "#8A8F98"
        muted: "#666666"
      status:
        success: "#22C55E"
        danger: "#EF4444"
    surface:
      glass: "rgba(255, 255, 255, 0.03)"
      border: "rgba(255, 255, 255, 0.08)"
  typography:
    family:
      display: "Bebas Neue, Impact, sans-serif"
      body: "Inter, sans-serif"
      chat: "Plus Jakarta Sans, sans-serif"
    weight:
      regular: 400
      medium: 500
      semibold: 600
      bold: 700
      black: 800
    line-height:
      tight: 1.2
      relaxed: 1.6
  radii:
    sm: "8px"
    md: "12px"
    lg: "18px"
    xl: "24px"
  motion:
    easing:
      premium: "cubic-bezier(0.16, 1, 0.3, 1)"
    duration:
      fast: "200ms"
      normal: "300ms"
      slow: "400ms"
  shadows:
    premium: "0 12px 40px rgba(0, 0, 0, 0.6)"
    glow: "0 0 20px rgba(255, 69, 0, 0.2)"
---

# Snacks 911 Design System

## Vision: Cinematic Emergency Cravings
Snacks 911 is built on a high-octane visual identity that blends the urgency of a first-responder service with the premium aesthetic of late-night gourmet food. The design system is "Cinematic Dark," utilizing deep blacks and electric orange to create a look that feels both intense and appetizing.

## Visual Language

### 1. Depth & Glassmorphism
The interface uses a multi-layered dark palette. 
- **Deep Backgrounds**: We use `#020203` as the foundation to create infinite depth.
- **Glass Surfaces**: Modals and sticky elements employ a "Glass-Dark" effect (blur 20px) with subtle borders (`rgba(255, 255, 255, 0.05)`). This creates a sophisticated, high-tech feel without breaking the dark immersion.

### 2. High-Energy Accents
- **Electric Orange**: Our primary brand color (`#FF4500`) represents fire, flavor, and urgency. It is used sparingly but with high impact: in buttons, active states, and "fire text" gradients.
- **Glow & Heat**: Interactive elements don't just change color; they "ignite." Hover states on cards and buttons trigger subtle glows and scale-ups, simulating the energy of the brand.

### 3. Aggressive Typography
- **Headings**: The display font (Bebas Neue/Impact) is bold and capitalized, mirroring the "911" emergency theme. It commands attention and communicates speed.
- **Body**: The body copy uses Inter for maximum legibility in high-pressure ordering scenarios.
- **Conversational**: In our AI chat interface, we shift to Plus Jakarta Sans to provide a slightly more friendly and modern tone, balancing the intensity of the rest of the site.

### 4. Interactive Motion (Premium Easing)
Movement is never linear. We use a custom "Premium Easing" (`cubic-bezier(0.16, 1, 0.3, 1)`) for all transitions. This creates a "snappy yet smooth" feel—elements decelerate elegantly, giving the application a refined, polished weight.

### 5. Bento Grid Layouts
For information-dense areas like the Admin Dashboard or menu sections, we utilize a Bento Grid system. This allows for clear hierarchy and a modern, modular look where different sizes of cards sit together in a cohesive, masonry-like structure.

## Component Intent

- **Buttons**: Every button is an invitation to action. Primary buttons use a fire-gradient (`#FF4500` to `#FF6B00`) and "glow pulse" animations to draw the eye.
- **Cards**: Menu items are encased in "Premium Cards" that lift and glow on hover, making the food photography feel tactile and reachable.
- **Chat**: The "OrderBot" uses a dark, radial-gradient container with a subtle tech-grid background, positioning the AI as a high-tech assistant for the user's "emergency" food needs.
