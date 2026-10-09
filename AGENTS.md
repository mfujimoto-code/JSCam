# JSCam — Grok 向け指示

ブラウザのライブカメラ画像処理ベンチ。正本は `jscam/` の分割グローバルスクリプト（バンドラ無し）。
使い方は `README.md`。現行の構造・決定・コーディングルールは `jscam/cam2-design.md`。
このファイルは編集と git で守ることだけ書く。

## ソース

- ライブ JS の集合と読み込み順は `jscam/index.html` の `<script>` が正本。本数は増減する。
- 静的ファイルを足す／外すときは、次を同じ集合に保つ。`index.html`、`jscam/Dockerfile` の COPY、`compose.yaml` の bind mount、`jscam/.dockerignore` の許可（`!ファイル名`）。抜けはイメージビルド失敗や実行時 404 になる。
- スナップショット（現行は `cam.js`）はライブ API の掃除で触らない。
- `tmp/` は gitignore。コミットしない。

## 編集

- 新規・修正は `cam2-design.md` の「コーディングルール」に合わせる。
- コメントは why だけ。throw は `new Error('…')`、短い英語。
- 公開 API は名前空間のプロパティ。実行経路に無い公開定数は置かない。
- UI を変えたらブラウザで操作して確認する。

## バージョンと設計書

- コードまたは設計を変えたら `jscam/cam2.js` の `JSCAM_VERSION` を UTC `YYYY.MM.DD-HHMMSSZ-<short HEAD>` に更新する。
- master にマージしたあと、マージ後のコードに合わせて `cam2-design.md` を直し、バージョンもバンプする。

## Git

- 「master に反映」「master にマージ」はローカル master への commit / merge。origin へ push しない（明示されたときだけ）。
- コミット主題は短い英語。
