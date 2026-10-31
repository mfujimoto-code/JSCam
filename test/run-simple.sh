#!/bin/sh
set -e
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
port=${JSCAM_SIMPLE_PORT:-8081}

python3 -m http.server "$port" --directory "$root/jscam" >/tmp/jscam-simple-http.log 2>&1 &
http_pid=$!
trap 'kill "$http_pid" 2>/dev/null || true' EXIT INT TERM

i=0
while [ "$i" -lt 50 ]; do
	if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${port}/')" 2>/dev/null; then
		break
	fi
	i=$((i + 1))
	sleep 0.1
done

export BASE_URL="http://127.0.0.1:${port}"
export JSCAM_SUITE=simple
cd "$root/test"
pw="$root/test/node_modules/.bin/playwright"
if [ ! -x "$pw" ]; then
	echo "missing $pw" >&2
	exit 1
fi
"$pw" test --project=http "$@"
