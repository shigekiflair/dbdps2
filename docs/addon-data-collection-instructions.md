# アドオンデータ収集 指示書（Gemini向け）

これは Trial Forge（DBD配信企画ポータル）の「禁止アドオン」機能用データを
収集してもらうための指示書です。この指示書の内容をそのままGeminiに渡してください。

---

## お願いしたいこと

Dead by Daylight（DBD）の**キラー固有アドオン**と**サバイバーアイテム用アドオン**の一覧を、
指定のCSV形式で作成してください。最終的に `data/addons.csv` というファイル1つに、
全アドオンを1行ずつまとめます。

## 出力フォーマット（厳守）

CSVのヘッダーは以下の7列で固定です。列の順序・列名も変更しないでください。

```
slug,name,description_summary,rarity,killer_slug,item_slug,icon_url
```

| 列名 | 内容 | 必須 |
|---|---|---|
| `slug` | 半角英小文字・数字・ハイフンのみのユニークID（例: `wooden-stake`）。全アドオン中で重複禁止 | ○ |
| `name` | 日本語名（例: 「木の杭」） | ○ |
| `description_summary` | 効果の要約。**下記「著作権について」を必ず守ること** | ○ |
| `rarity` | 下記「レアリティの値」のいずれか1つ | ○ |
| `killer_slug` | キラー固有アドオンの場合のみ、下記「キラーslug一覧」から1つ指定 | killer_slugかitem_slugのどちらか一方のみ |
| `item_slug` | アイテム用アドオンの場合のみ、下記「アイテムslug一覧」から1つ指定 | 同上 |
| `icon_url` | `addons/<slug>.png` の形式で機械的に生成（例: `addons/wooden-stake.png`） | ○ |

**重要なルール**
- `killer_slug`と`item_slug`は**必ずどちらか一方だけ**を埋め、もう片方は空欄にすること（両方埋める/両方空欄はNG）
- CSV内で名前や説明文にカンマ「,」が含まれる場合は、そのフィールド全体をダブルクォート `"..."` で囲むこと（例: `"回復速度、疲労耐性を上昇させる"`）
- 1行1アドオン。ヘッダー行は1行目のみ

## レアリティの値（`rarity`列はこの6つのいずれか）

```
common       … 茶（コモン）
uncommon     … 黄（アンコモン）
rare         … 緑（レア）
very_rare    … 紫（ベリーレア）
ultra_rare   … 虹（アルティメットレア/イリデセント）
event        … イベント限定配布アドオン（上記以外の特殊枠がある場合）
```

## 著作権について（必ず守ること）

`description_summary`は**ゲーム公式のテキストをそのままコピーしないでください**。
Wikiや公式サイトの文章を丸写しするのではなく、「何をする効果か」を自分の言葉で
1文程度に短く要約してください。
- ❌ 悪い例（公式テキストの丸写し）
- ✅ 良い例：「攻撃のクールダウンをわずかに短縮する」「フックからの脱出確率をわずかに上昇させる」

## キラーslug一覧（`killer_slug`用、全43体）

以下のslugを**一字一句そのまま**使ってください（表記ゆれ・別名は不可）。

```
the-trapper,the-wraith,the-hillbilly,the-nurse,the-shape,the-hag,the-doctor,
the-huntress,the-cannibal,the-nightmare,the-pig,the-clown,the-spirit,the-legion,
the-plague,the-ghost-face,the-demogorgon,the-oni,the-deathslinger,the-executioner,
the-blight,the-twins,the-trickster,the-nemesis,the-cenobite,the-artist,the-onryo,
the-dredge,the-mastermind,the-knight,the-skull-merchant,the-singularity,
the-xenomorph,the-good-guy,the-unknown,the-lich,the-dark-lord,the-houndmaster,
the-ghoul,the-animatronic,the-krasue,the-first,the-slasher
```

日本語名との対応（参考。sourceの`name`列はこの日本語名でOK）:

```
the-trapper=トラッパー, the-wraith=レイス, the-hillbilly=ヒルビリー, the-nurse=ナース,
the-shape=シェイプ, the-hag=ハグ, the-doctor=ドクター, the-huntress=ハントレス,
the-cannibal=カニバル, the-nightmare=ナイトメア, the-pig=ピッグ, the-clown=クラウン,
the-spirit=スピリット, the-legion=リージョン, the-plague=プレイグ,
the-ghost-face=ゴーストフェイス, the-demogorgon=デモゴーゴン, the-oni=鬼,
the-deathslinger=デススリンガー, the-executioner=エクセキューショナー,
the-blight=ブライト, the-twins=ツインズ, the-trickster=トリックスター,
the-nemesis=ネメシス, the-cenobite=セノバイト, the-artist=アーティスト,
the-onryo=オンリョウ, the-dredge=ドレッジ, the-mastermind=マスターマインド,
the-knight=ナイト, the-skull-merchant=スカルマーチャント,
the-singularity=シンギュラリティ, the-xenomorph=ゼノモーフ, the-good-guy=グッドガイ,
the-unknown=アンノウン, the-lich=リッチ, the-dark-lord=ダークロード,
the-houndmaster=ハウンドマスター, the-ghoul=グール, the-animatronic=アニマトロニック,
the-krasue=クラスエ, the-first=ファースト, the-slasher=スラッシャー
```

※`the-twins`（ヴィクター&シャーロット）はゲーム内で1つのアドオンプールを共有しているため、
まとめて`the-twins`に紐付けてください。

## アイテムslug一覧（`item_slug`用、サバイバーアイテム5種）

```
medkit    … 医療キット
toolbox   … 工具箱
flashlight… 懐中電灯
key       … 鍵
map       … マップ
```

## 入力例（このまま形式を真似てください）

```csv
slug,name,description_summary,rarity,killer_slug,item_slug,icon_url
wooden-stake,木の杭,トラップの設置速度をわずかに上昇させる,common,the-trapper,,addons/wooden-stake.png
iridescent-stone,イリデセントストーン,設置済みの全トラップの位置を看破可能にする,ultra_rare,the-trapper,,addons/iridescent-stone.png
gel-dressings,ジェル包帯,治療速度をわずかに上昇させる,common,,medkit,addons/gel-dressings.png
```

## 進め方（提案）

データ量が多いため、以下のように分割して進めてもらって構いません。
1回の出力ごとに、そのままCSVに追記できる形（ヘッダーなしの行だけ、もしくは
上記ヘッダー付き）で出力してください。

1. まずキラー1〜2体分（例: `the-trapper`, `the-wraith`）を試作 → 形式を確認
2. 問題なければ残りのキラーを数体ずつのバッチで進める（1バッチあたりキラー5体前後を推奨）
3. 最後にアイテム5種（medkit/toolbox/flashlight/key/map）分のアドオンをまとめる
4. 各キラー/アイテムにつき、現行ゲームに実装されている固有アドオンを網羅する（追加DLC/チャプターで増えている場合も含む）

## 完成後のチェックリスト

出来上がったCSVを`data/addons.csv`に反映する前に、以下を確認してください。
- [ ] `slug`が全行でユニークか（重複がないか）
- [ ] `killer_slug`は上記一覧のslugと完全一致しているか（typoがないか）
- [ ] `killer_slug`と`item_slug`のどちらか一方だけが埋まっているか
- [ ] `rarity`が6つの値のいずれかになっているか
- [ ] カンマを含むフィールドがダブルクォートで囲まれているか
- [ ] `description_summary`が公式テキストの丸写しになっていないか

## 反映方法（データが揃ったら）

1. 完成したCSVの中身を`data/addons.csv`に上書き保存（ヘッダー行込みで1ファイルにまとめる）
2. `npm run db:import-csv` を実行するとDBに自動投入される（既存重複行はスキップされる仕様）
