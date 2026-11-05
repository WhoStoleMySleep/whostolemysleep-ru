#!/bin/bash
# PostToolUse for Edit|Write: applies the linters' fixes to the changed file and hands what is left to Claude.
file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
root="$CLAUDE_PROJECT_DIR"
bin="$root/node_modules/.bin"

case "$file" in
  "$root"/node_modules/* | "$root"/.nuxt/* | "$root"/.output/* | "") exit 0 ;;
  "$root"/*) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0
cd "$root" || exit 0

report=""

case "$file" in
  *.mjs | *.ts | *.vue)
    "$bin/eslint" --fix --no-warn-ignored "$file" >/dev/null 2>&1
    out=$("$bin/eslint" --no-warn-ignored --format json "$file" 2>/dev/null |
      jq -r '.[] | .filePath as $f | .messages[] | "\($f):\(.line):\(.column) \(.message) [\(.ruleId)]"')
    [ -n "$out" ] && report+="$out"$'\n'
    ;;
esac

case "$file" in
  "$root"/app/*.css | "$root"/app/*.vue)
    "$bin/stylelint" --fix --allow-empty-input "$file" >/dev/null 2>&1
    out=$("$bin/stylelint" --allow-empty-input --formatter unix "$file" 2>&1) || report+="$out"$'\n'
    ;;
esac

if [ -n "$report" ]; then
  jq -n --arg ctx "Линтер после автоисправлений, осталось исправить вручную:"$'\n'"$report" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
fi

exit 0
