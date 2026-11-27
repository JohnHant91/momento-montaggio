#!/bin/bash
# Mette il Mac di Johnny a fare da motore di montaggio dell'Agenzia Momento AI (runner di GitHub Actions).
# Uso (nel Terminale del Mac):  bash <(curl -fsSL https://raw.githubusercontent.com/JohnHant91/momento-montaggio/main/scripts/mac-motore.sh)
# Per toglierlo:                bash <(curl -fsSL .../scripts/mac-motore.sh) togli
# Non salva password né chiavi: per registrarsi usa l'accesso a GitHub che fai tu con "gh auth login".
set -euo pipefail
REPO="JohnHant91/momento-montaggio"
CASA="$HOME/momento-motore"
RUN="$CASA/runner"
dico() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
errore() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

[ "$(uname -s)" = "Darwin" ] || errore "Questo script è per il Mac."
[ "$(uname -m)" = "arm64" ] || errore "Serve un Mac con processore Apple (M1 o successivi)."
for p in "$HOME/.homebrew/bin" /opt/homebrew/bin /usr/local/bin; do [ -d "$p" ] && PATH="$p:$PATH"; done
export PATH
command -v brew >/dev/null || errore "Manca Homebrew. Installalo da https://brew.sh e rilancia questo comando."

if [ "${1:-}" = "togli" ]; then
  dico "Tolgo il motore dal Mac"
  if [ -d "$RUN" ]; then
    cd "$RUN"; ./svc.sh stop 2>/dev/null || true; ./svc.sh uninstall 2>/dev/null || true
    t=$(gh api -X POST "repos/$REPO/actions/runners/remove-token" -q .token) && ./config.sh remove --token "$t" || true
  fi
  rm -rf "$CASA"; echo "Fatto: il Mac non è più un motore. I montaggi tornano sulle macchine di GitHub."; exit 0
fi

dico "1/5 Programmi che servono (ffmpeg, python, node, gh): installo solo quelli che mancano"
for x in ffmpeg-full python@3.12 node gh; do brew list --formula "$x" >/dev/null 2>&1 || brew install "$x"; done
ls "$HOME/Library/Fonts"/DejaVuSans-Bold.ttf >/dev/null 2>&1 || brew install --cask font-dejavu || echo "⚠︎ font DejaVu non installato: uso un font di sistema"
"$(brew --prefix)/opt/ffmpeg-full/bin/ffmpeg" -hide_banner -filters 2>/dev/null | grep -q vidstabdetect || echo "⚠︎ questo ffmpeg non ha la stabilizzazione (vidstab): i reel escono lo stesso, ma senza stabilizzare."

dico "2/5 Accesso a GitHub (si apre il browser: entra con il tuo account, quello del repository)"
gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol https --web
gh api "repos/$REPO" -q .full_name >/dev/null || errore "Questo account GitHub non vede il repository $REPO."

dico "3/5 Scarico il programma ufficiale di GitHub che riceve i lavori (actions/runner)"
mkdir -p "$RUN" "$CASA/cache"; cd "$RUN"
if [ ! -x ./config.sh ]; then
  V=$(gh api repos/actions/runner/releases/latest -q .tag_name | sed 's/^v//')
  curl -fL --progress-bar -o runner.tgz "https://github.com/actions/runner/releases/download/v$V/actions-runner-osx-arm64-$V.tar.gz"
  tar xzf runner.tgz && rm runner.tgz
fi

dico "4/5 Collego il Mac al repository come motore \"momento-mac\""
./svc.sh stop 2>/dev/null || true
TOKEN=$(gh api -X POST "repos/$REPO/actions/runners/registration-token" -q .token)
./config.sh --url "https://github.com/$REPO" --token "$TOKEN" --name "mac-$(scutil --get LocalHostName 2>/dev/null || hostname -s)" --labels momento-mac --work "$CASA/lavoro" --unattended --replace
unset TOKEN

dico "5/5 Lo faccio partire da solo all'accensione del Mac"
# il servizio deve trovare i programmi di Homebrew
printf "PATH=%s\n" "$(dirname "$(command -v brew)"):/usr/bin:/bin:/usr/sbin:/sbin" > .env
./svc.sh install >/dev/null 2>&1 || true
./svc.sh start
sleep 3; ./svc.sh status | tail -3 || true
printf "\n\033[1;32m✓ Fatto. Il Mac è il motore di montaggio. Scrivi a Claude: \"fatto\".\033[0m\n"
echo "Il Mac monta quando è acceso e sveglio. Per toglierlo: stesso comando con la parola  togli  in fondo."
