---
title: "クラウドインフラ概念マップ"
---

# クラウドインフラ概念マップ

このページは、クラウドインフラの設計判断を「サービス名の一覧」ではなく、責務と依存関係からたどるための案内図です。図だけで判断せず、以下の代替説明と対応章を併せて参照してください。

![クラウドインフラ設計・構築ガイドの概念マップ。責任共有を起点に、identity、network、compute、storage、運用、可用性とDR、cost、IaCとautomationを各章へ接続する](https://itdojp.github.io/cloud-infra-book/assets/images/diagrams/introduction/cloud-infra-mindmap.svg)

## 図の代替説明

- **責任共有を起点にする**: クラウド事業者、利用組織、運用担当、委託先の責任分界を決めてから、identity、network、compute、storageの制御を設計します。
- **基盤を一体で設計する**: identityは権限境界、networkは通信境界、computeは実行境界、storageはデータ境界を担います。いずれか一つだけを最適化しても、安全性と可用性は成立しません。
- **運用で設計を閉じる**: 監視・ログ、変更管理、バックアップ、可用性とDR、cost管理を、構築後の追加作業ではなく初期設計へ含めます。
- **実装を再現可能にする**: IaCとautomationで構成をコード化し、差分レビュー、承認、rollback、監査証跡を継続運用へ接続します。
- **統合時にtrade-offを再評価する**: セキュリティ、性能、可用性、運用負荷、costは相互に影響します。第11章の設計パターンと付録のチェックリストで、局所最適になっていないかを確認します。

## 概念から対応章へ

### 責任共有と設計の前提

- [第1章：クラウドコンピューティングの基礎](../chapter-chapter01/index.md): サービスモデルと責任共有モデルを確認する。
- [第2章：クラウドインフラの共通概念とアーキテクチャ](../chapter-chapter02/index.md): リージョン、AZ、リソース管理、共通のidentity・network境界を整理する。

### 基盤コンポーネント

- [第3章：仮想マシン（Compute）の活用](../chapter-chapter03/index.md): computeの選択、拡張、監視の責務を確認する。
- [第4章：クラウドストレージの設計と利用](../chapter-chapter04/index.md): storageの整合性、耐久性、暗号化、復旧条件を確認する。
- [第5章：ネットワークとロードバランシング](../chapter-chapter05/index.md): networkの公開面、経路、名前解決、負荷分散を確認する。

### 制御と運用

- [第6章：IAMとセキュリティ実践](../chapter-chapter06/index.md): identity、最小権限、監査、データ保護を確認する。
- [第7章：監視とログ管理](../chapter-chapter07/index.md): 運用時の観測、検知、証跡、改善loopを確認する。
- [第8章：バックアップ・災害復旧戦略](../chapter-chapter08/index.md): 可用性、backup、RPO/RTO、DRの関係を確認する。

### 実行方式と自動化

- [第9章：サーバーレスとコンテナサービス](../chapter-chapter09/index.md): 実行方式によって変わる責任分界と運用境界を確認する。
- [第10章：Infrastructure as Code (IaC) と自動化](../chapter-chapter10/index.md): IaC、automation、差分review、rollbackを確認する。

### 統合判断と実務確認

- [第11章：エンタープライズ設計パターンと事例](../chapter-chapter11/index.md): 可用性、セキュリティ、運用負荷、costのtrade-offを統合する。
- [付録：参考資料](https://itdojp.github.io/cloud-infra-book/appendices/): 設計checklist、用語、provider比較、一次情報への導線を確認する。

図を入口にした場合も、実環境へ適用する前に対応章の前提、制約、検証条件へ戻り、利用するproviderとserviceの最新公式資料を確認してください。

{% include page-navigation.html %}
