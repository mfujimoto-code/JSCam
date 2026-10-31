# JSCam テスト仕様

ライブ JS（`jscam/`、`cam.js` を除く）の回帰を、実行の仕方で三つに分ける。画素ケースの詳細期待値は、実装した spec を正本とし、未実装の項目は本ファイルの表に残す。

被テストの読み込み順は `jscam/jscam-boot.js` の配列。テストコードは `test/` に置き、nginx の四者同期（boot / Dockerfile COPY / compose bind / `.dockerignore`）には載せない。

## 三つの実行環境

| | 簡易自動 | フル自動 | マニュアル |
|---|---|---|---|
| 誰が回すか | このコンテナで `sh test/run-simple.sh` | Docker ホストで `docker compose -f compose.ci.yaml --profile test run --rm --build test` | 人がブラウザと実カメラ |
| 配信 | Python が `jscam/` を直出し | **イメージの COPY のみ**（bind 無し） | compose `web` の 8888 または Pages |
| ブラウザ | コンテナ内 Playwright Chromium | `jscam-test:local`（公式 Playwright image） | 任意（正本 UA は Chromium） |
| GUI | 不要 | 不要 | 必要 |
| ホストに要るもの | Node、`test/node_modules`、OS の Chromium 依存 | **Docker だけ**（git pull 後） | カメラ付き端末 |
| Grok コンテナ | 可 | 不可（入れ子 Docker） | 対象外 |

`JSCAM_SUITE=simple`（既定）では nginx 専用ケースを skip する。フル自動の compose は `JSCAM_SUITE=full` を付ける。

## 起動

### 簡易自動

```bash
sh test/run-simple.sh
```

`http://127.0.0.1:8081/` はセキュアコンテキスト。`--project=http` のみ。HTTPS / 非セキュア / healthz は走らない。

#### 実行環境の作成

Docker は使わない。同じ OS 上で Python が `jscam/` を配信し、Playwright の headless Chromium がそれを開く。GUI / `DISPLAY` / Xvfb は不要。

**構成物**

| もの | 置き場 | git |
|---|---|---|
| ライブ JS | `jscam/` | 正本 |
| spec / `run-simple.sh` / `package-lock.json` | `test/` | 正本 |
| `@playwright/test@1.55.0` | `test/node_modules/` | gitignore |
| Chromium 本体 | `~/.cache/ms-playwright/`（既定） | リポジトリ外 |
| OS 共有ライブラリ（`libnss3` など） | ディストリのパッケージ | リポジトリ外 |

`test/package.json` の `@playwright/test` は **1.55.0 固定**。フル自動の `mcr.microsoft.com/playwright:v1.55.0-noble` と同じ版にする。

**前提**

- Linux。Python 3（標準ライブラリの `http.server` だけ使う）
- Node.js 18 以上。`npm` は **Node 公式配布に付くもの**を使う
- リポジトリのルートがカレント（`jscam/` と `test/` が見える）

入れない:

- `docker.io` / Compose（簡易自動は容器を増やさない）
- Ubuntu の `apt install npm`（`eslint` / `webpack` / `node-*` が数百個入る）
- `xvfb`

**手順（空の Linux）**

1. Python 3 を確認する。

```bash
python3 --version
```

2. `node` と `npm` を確認する。どちらか無ければ、Node 公式の Linux バイナリを PATH に足す（Ubuntu の `nodejs` パッケージだけだと `npm` が無いことがある）。

```bash
node --version
npm --version
```

3. ランナーを入れる。ブラウザは次の段で入れるので、ここではダウンロードしない。

```bash
cd test
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
```

`npm ci` は `package-lock.json` どおりに入れる。`npm install` で版を動かさない。

4. Chromium だけ入れる（Firefox / WebKit は入れない。dispatch が rVFC 必須のため）。

```bash
./node_modules/.bin/playwright install chromium
```

5. Chromium がリンクする OS ライブラリを入れる。root なら `sudo` は不要。

```bash
./node_modules/.bin/playwright install-deps chromium
```

6. リポジトリルートへ戻り、起動する。

```bash
cd ..
sh test/run-simple.sh
```

`run-simple.sh` は `test/node_modules/.bin/playwright` を直接呼ぶ（システムの `npx` に依存しない）。既定ポートは 8081。占有されているときは `JSCAM_SIMPLE_PORT=18081 sh test/run-simple.sh`。配信ログは `/tmp/jscam-simple-http.log`。終了時に配信プロセスを止める。

**環境変数**

| 変数 | 既定 | 意味 |
|---|---|---|
| `BASE_URL` | スクリプトが `http://127.0.0.1:<port>` をセット | Playwright の origin |
| `JSCAM_SUITE` | スクリプトが `simple` をセット | `full` 専用ケースを skip |
| `JSCAM_SIMPLE_PORT` | `8081` | Python 配信ポート |
| `PLAYWRIGHT_BROWSERS_PATH` | `~/.cache/ms-playwright` | Chromium の置き場 |

**成功の目安（現行の実装済み spec）**

`http` プロジェクトだけが走る。`delivery.spec.js` と `insecure.spec.js` は skip。A 系（boot、ハロー、convert、Frame、Accum、delta、render、UI）が pass。終了コード 0。レポートは `test/playwright-report/`（gitignore）。

一度作った `node_modules` とブラウザキャッシュは残してよい。`package-lock.json` が変わったときだけ `npm ci` をやり直す。Chromium の版を上げるときは `package.json` とフル自動の image タグを同じ版にしてから `playwright install chromium` する。

### フル自動

pull したリポジトリで、Docker ホストから:

```bash
docker compose -f compose.ci.yaml --profile test run --rm --build test
```

依存の `web` が先に起き、終了コードが合否。HTML レポートは `test/playwright-report/`。ホストに Node は不要。

中身:

- HTTP プロジェクト `BASE_URL=http://web:8081` — boot、画素、非セキュア、配信
- HTTPS プロジェクト `CAMERA_URL=https://web:8443` — 偽カメラ vis（`--use-fake-device-for-media-stream`）

### マニュアル

`docker compose up -d web` のあと `https://127.0.0.1:8888/`（証明書は Advanced → Proceed）。Pages の公開 URL でも可。項目は下表の「手動」。

## 項目

凡例: 簡 = 簡易自動、フ = フル自動、手 = マニュアル。実装列は spec ファイル。空は仕様のみ（未実装）。

### A. ライブ JS の仕様（Chromium で `jsCam` を呼ぶ）

| ID | 内容 | 簡 | フ | 手 | 実装 |
|---|---|---|---|---|---|
| A1 | boot、全 script 200、`kick`、`#app-version`、rVFC、Night Vision | Y | Y | | `boot.spec.js` |
| A2 | `Surface.extract(..., 1)` が 1px ハロー複製 | Y | Y | | `surface-halo.spec.js` |
| A3 | `rgba→argb` が画素あたり `0xAARRGGBB` | Y | Y | | `image.spec.js` |
| A4 | `gray` / `yuv` / `r,g,b` ← `argb`、表示 `rgba` ← 平面 | Y | Y | | `image.spec.js` |
| A5 | `stat(..., shape)` は inner のみ、stride = 幅 | Y | Y | | `image.spec.js` |
| A6 | `Frame(im, 1)` の `innerNum` / `get('argb')` / histogram | Y | Y | | `frame.spec.js` |
| A7 | `equalize.lut` の Nl = `innerNum` | Y | Y | | `image.spec.js` |
| A8 | Sobel / Laplacian がハロー込み近傍 | Y | Y | | `image.spec.js` |
| A9 | `Accum` size 変更で factor=1、`*-a` は outer コピー | Y | Y | | `accum-delta.spec.js` |
| A10 | `delta.get` は `argb` から convert | Y | Y | | `accum-delta.spec.js` |
| A11 | `render.buildImage` Raw / GRAY | Y | Y | | `render.spec.js` |
| A12 | Night Vision LUT が vis 全体の innerNum | Y | Y | | `render.spec.js` |
| A13 | 未知 convert が `fatal` | Y | Y | | `image.spec.js` |
| A14 | `#image-mode` / Flip の DOM 操作 | Y | Y | | `ui.spec.js` |

### B. 配信（nginx イメージ）

| ID | 内容 | 簡 | フ | 手 | 実装 |
|---|---|---|---|---|---|
| B1 | `GET /healthz` が 200 | | Y | | `delivery.spec.js` |
| B2 | boot が読む JS/CSS が 200（COPY / dockerignore） | | Y | | `delivery.spec.js` |
| B3 | `Cache-Control: no-store`、`Permissions-Policy` | | Y | | `delivery.spec.js` |
| B4 | `http://web:8081` は非セキュア、`#camera-help` 表示 | | Y | | `insecure.spec.js` |
| B5 | `https://web:8443` + 偽カメラで `.io-hud.is-live` | | Y | | `camera-secure.spec.js` |

### C. 人手

| ID | 内容 | 簡 | フ | 手 |
|---|---|---|---|---|
| C1 | 実カメラの Start、Controls、ズーム／フォーカス | | | Y |
| C2 | 複数 camera-select、ImageCapture | | | Y |
| C3 | 証明書警告の Advanced → Proceed | | | Y |
| C4 | HUD 重なり、ピンチ、モバイルレイアウト | | | Y |
| C5 | iOS Safari | | | Y |
| C6 | GitHub Pages の実 URL | | | Y |

A を変えたら簡易自動。B を変えたらフル自動。C および画面の見た目はマニュアル（AGENTS のブラウザ確認と同じ）。

## ファイル

| パス | 役割 |
|---|---|
| `test/SPEC.md` | 本仕様 |
| `test/run-simple.sh` | 簡易自動 |
| `compose.ci.yaml` | フル自動（web に bind 無し） |
| `compose.yaml` の `test` | Docker が使える開発機向け。web は bind あり |
| `test/Dockerfile` | Playwright 1.55.0 + spec を COPY |
| `test/playwright.config.js` | プロジェクト `http` / `https` |
| `test/*.spec.js` | ケース |

`@playwright/test` の版と `mcr.microsoft.com/playwright:v1.55.0-noble` は一致させる。
