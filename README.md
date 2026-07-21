# クラウドインフラ設計・構築ガイド

クラウドインフラエンジニアが実際の設計・構築業務で必要な知識を体系的に学べる実践書です。単なる操作手順ではなく、設計判断の根拠（なぜその選択をするのか）を説明できる状態を目指します。

## 対象読者

- クラウドインフラエンジニア（経験年数 1〜5年）
- オンプレミス環境からクラウドへの移行を検討している方
- より体系的なクラウド知識を身につけたい方

## 章構成（概要）

- 第1〜2章: 基礎編（概念と共通アーキテクチャ）
- 第3〜5章: コアサービス編（Compute / Storage / Network）
- 第6〜8章: 運用管理編（セキュリティ / 監視 / バックアップ・災害復旧）
- 第9〜10章: 先進技術編（サーバーレス・コンテナ / IaC）
- 第11章: 統合編（エンタープライズ設計パターンと事例）

## オンライン版（入口）

- リポジトリ内: `docs/index.md`
- GitHub Pages を有効化している場合: [クラウドインフラ設計・構築ガイド](https://itdojp.github.io/cloud-infra-book/)

`docs`が唯一サポート対象のJekyllビルド面です。`src`は原稿の編集元ですが、
リポジトリルート全体をJekyllでビルドまたはserveする運用はサポートしません。

## ローカル品質チェック

このリポジトリでは、書籍メタデータと公開設定のずれを防ぐため、ローカル QA にメタデータ整合チェックを含めています。
Node.js 22.22.2以降の22.x、24.15.0以降の24.x、または26.0.0以上を使用してください。
JekyllのビルドにはRuby 3.3と、`Gemfile.lock`で指定するBundler 2.5.22が必要です。

```bash
gem install bundler -v 2.5.22
bundle _2.5.22_ install
npm ci
npm run test
npm run build
```

`npm run check:metadata` は、`book-config.json`、`package.json`、`docs/_config.yml`、`docs/index.md` の title / version / repository / Pages URL を照合します。
`npm run build` はBundlerを介し、`Gemfile.lock`に固定されたJekyll依存関係でビルドします。`npm run build:safe`は同じ処理を呼び出す互換コマンドです。

## フィードバック

- Issue: [itdojp/cloud-infra-book の Issues](https://github.com/itdojp/cloud-infra-book/issues)

## ライセンス

本書は `LICENSE.md` に記載の条件で提供されます。
