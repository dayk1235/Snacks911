#!/bin/bash

echo "🚀 Starting Snacks911 Agent..."

while true; do

  echo "-----------------------------------"
  echo "🔍 Checking build..."

  BUILD_OUTPUT=$(npm run build 2>&1)

  mkdir -p logs
  echo "$BUILD_OUTPUT" > logs/build.log

  # =========================
  # DETECTAR ERRORES
  # =========================
  if echo "$BUILD_OUTPUT" | grep -q "Module not found"; then
    echo "❌ Module error detected"
    ACTION="fix_errors"
  else
    ACTION="continue"
  fi

  # =========================
  # FIX ERRORES
  # =========================
  if [ "$ACTION" = "fix_errors" ]; then
    echo "🛠 Fixing errors with Aider..."

    FILES=$(find ./src -name "*.tsx" -o -name "*.ts")

    aider $FILES \
      --model ollama/deepseek-coder:6.7b \
      --yes \
      --no-auto-commits \
      --message "
Fix all module resolution errors in this Next.js project.

Rules:
- Fix broken imports
- Replace '../components' with '@/components'
- Create missing files if necessary
- Ensure TypeScript is valid
- Do NOT break UI
- Prefer alias '@/'
"

    echo "🔁 Re-checking build..."
    npm run build

    if [ $? -ne 0 ]; then
      echo "❌ Still failing. Stopping loop."
      exit 1
    fi

    echo "✅ Errors fixed. Continuing..."
  fi

  echo "🧠 No errors. Ready for next step..."

  # =========================
  # 🧠 AUTO-LEARNING (MEJORA SKILL)
  # =========================
  if [ $((RANDOM % 3)) -eq 0 ]; then
    echo "🧠 Improving design skill..."

    aider .agents/skills/design-taste-frontend/SKILL.md \
      --model ollama/deepseek-coder:6.7b \
      --yes \
      --no-auto-commits \
      --message "
Improve this design skill.

Rules:
- ONLY modify the 'IMPROVABLE SECTION'
- Add better UI ideas
- Make it more premium (Apple/Nike style)
- Keep it structured
- Do NOT break existing rules
"
  fi

  # =========================
  # 🎨 MEJORA UI AUTOMÁTICA
  # =========================
  echo "🎨 Improving UI..."

  FILES="src/app/page.tsx src/components/Card.tsx"

  aider $FILES \
    --model ollama/deepseek-coder:6.7b \
    --yes \
    --no-auto-commits \
    --message "
Use the design-taste-frontend skill.

Improve the UI to a premium modern design.

Add:
- Hero section
- Better cards
- CTA button
- Proper spacing
- Modern layout

Do NOT break functionality.
"

  echo "😴 Sleeping before next loop..."
  sleep 15

done