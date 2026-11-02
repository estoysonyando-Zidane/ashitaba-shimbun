# 明日葉新聞

作者が自分のために毎朝発行している私家版の新聞です。一般公開や共同開発は行っていません。

- All rights reserved. 無断での複製・転載・再配布・機械学習への利用を禁じます（LICENSE）。
- Issue・Pull Request・Wiki は受け付けていません。
- 検索エンジンやクローラーによる収集を拒否しています（robots.txt / noindex）。

## 構成（作者メモ）

- `index.html` と `assets/` — 紙面ビューアー。`assets/layout.js`・`assets/paper.js` は組版エンジンで、ブラウザと Node の両方で動く。
- `editions/YYYY-MM-DD.json` — 各号のデータ。`editions/index.json` — 号の一覧（新しい順）。
- `tools/check.mjs` — 号の検査（文量・出典・禁じ手・組版のあふれ）。`tools/add-edition.mjs` — 一覧への登録。`tools/shot.mjs` — 全面の画面写真。
- 編集の手引きはスキル `japanese-daily-newspaper` にある。
