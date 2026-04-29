# Cline Setup Instructions - Snacks911 Web

## Installation Complete ✅

Cline has been installed and configured for the Snacks911 WebApp project.

### Configuration Files Created
1. **cline.config.json** - Main Cline configuration with project metadata
2. **.clineRules** - Development rules and project guidelines

### Quick Start

#### Connect Cline to Your IDE
- Open the project in VS Code
- Install Cline extension if not already installed
- Cline will auto-detect the `cline.config.json`

#### Run Development Server
```bash
npm run dev
```

#### Available AI Commands
```bash
npm run ai:fix-overflow     # Fix overflow issues
npm run ai:fix-cursor       # Fix cursor styling
npm run ai:add-logout       # Add logout functionality
npm run ai:toggle-password  # Toggle password visibility
npm run ai:order-alert      # Setup order alerts
npm run ai:order-sound      # Setup order sounds
npm run ai:manage-staff     # Staff management features
npm run ai:auto             # Auto AI tasks
```

### Project Context for Cline
- **Database**: Supabase with PostgreSQL + RLS
- **State Management**: Zustand stores
- **Main Pages**: 
  - Public: Menu, Orders, Cart, Checkout
  - Admin: Dashboard, Products, Orders, Cash Management, Staff
  - Auth: Login, Password Reset

### File Structure to Know
```
src/
├── app/          # Next.js app routes
├── components/   # React components
├── lib/          # Stores, utilities, services
├── core/         # AI logic & engines
├── ai/           # AI runtime agents
└── types/        # TypeScript types

supabase/
└── migrations/   # Database schema changes
```

### Tips for Using Cline
1. Always check existing implementations before creating new ones
2. Update types when changing database schema
3. Test responsive design (mobile-first)
4. Verify Supabase RLS policies after DB changes
5. Use existing Zustand stores as references

### Dependencies
- Next.js 16.2.2
- React 19.2.4
- Supabase JS SDK
- Google Generative AI
- TypeScript 5
- Tailwind CSS 4

### Troubleshooting
- If Cline doesn't detect config, restart VS Code
- Check `.clineRules` for project-specific guidelines
- Review existing code patterns before implementing new features
