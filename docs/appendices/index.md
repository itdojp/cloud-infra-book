---
layout: book
order: 14
title: "付録：参考資料"
---

# 付録：参考資料

この付録は、本文を読み進める際に参照するための「差分マップ」「設計チェックリスト」「用語集」「参考リンク」をまとめたものです。

## コード例の読み方

本書のコード例は、用途に応じて大きく2種類に分けています。

1. **実行可能サンプル**: 変数やID等を自環境に合わせて差し替えれば、実行できることを想定した例
2. **擬似コード/概念例**: 概念や設計意図を伝えるための例（そのままでは実行できない）

実行可能サンプルであっても、読者の環境（リージョン、アカウント設定、権限、組織の運用ルール）に依存するため、適用前に検証環境で確認してください。

## A. 主要クラウドプロバイダーの比較表

### サービス比較

| カテゴリ | AWS | Azure | Google Cloud |
|---------|-----|-------|-------------|
| **仮想マシン** | EC2 | Virtual Machines | Compute Engine |
| **ストレージ（ブロック）** | EBS | Managed Disks | Persistent Disk |
| **ストレージ（オブジェクト）** | S3 | Blob Storage | Cloud Storage |
| **ネットワーク** | VPC | Virtual Network | VPC Network |
| **ロードバランサー** | ALB/NLB | Application Gateway | Cloud Load Balancing |
| **ID/アクセス管理** | IAM | Entra ID + RBAC | IAM |
| **鍵管理（KMS）** | KMS | Key Vault | Cloud KMS |
| **監査ログ** | CloudTrail | Activity Log | Cloud Audit Logs |
| **秘密情報管理** | Secrets Manager / SSM | Key Vault | Secret Manager |
| **WAF/DDoS** | AWS WAF / Shield | WAF / DDoS Protection | Cloud Armor |
| **CDN** | CloudFront | Front Door | Cloud CDN |
| **データベース（RDB）** | RDS | SQL Database | Cloud SQL |
| **データベース（NoSQL）** | DynamoDB | Cosmos DB | Cloud Firestore |
| **コンテナ管理** | ECS/EKS | ACI/AKS | GKE |
| **コンテナレジストリ** | ECR | ACR | Artifact Registry |
| **サーバーレス** | Lambda | Azure Functions | Cloud Functions |
| **監視・ログ** | CloudWatch | Azure Monitor | Cloud Monitoring |

### 料金体系の特徴

#### AWS
- 従量課金制が基本
- リザーブドインスタンスで最大75%割引
- セービングプランで柔軟な割引
- スポットインスタンスで90%割引

#### Azure
- Microsoft製品との統合割引
- ハイブリッドユースベネフィット
- 予約インスタンスで最大72%割引
- 開発/テスト用価格

#### Google Cloud
- 持続利用割引（自動適用）
- 確約利用割引で最大57%割引
- プリエンプティブルインスタンス
- 秒単位課金

## B. 設計パターン集

### 1. 高可用性パターン

#### マルチAZ構成
```text
[Load Balancer]
      |
   [AZ-1A]  [AZ-1B]  [AZ-1C]
      |        |        |
   [Web]    [Web]    [Web]
      |        |        |
   [App]    [App]    [App]
      |        |        |
   [DB Master] [DB Standby] [DB Read Replica]
```

#### リードレプリカ パターン
- 読み取り専用レプリカでパフォーマンス向上
- 地理的分散での災害対策
- 分析ワークロードの分離

### 2. スケーラビリティパターン

#### 水平スケーリング
- オートスケーリンググループ
- ロードバランサーによる負荷分散
- ステートレス設計

#### 垂直スケーリング
- インスタンスタイプの変更
- メモリ・CPU の動的調整
- ダウンタイムの考慮

### 3. セキュリティパターン

#### 多層防御
```text
[Internet] → [WAF] → [Load Balancer] → [Web Tier]
                                          ↓
                                      [App Tier]
                                          ↓
                                      [DB Tier]
```

#### ゼロトラスト
- すべてのアクセスを認証・認可
- 最小権限の原則
- 継続的な監視とログ

## C. チェックリスト

### 設計意思決定チェックリスト（Compute / Storage / Network）

設計の初期段階で「何を決める必要があるか」を見落とさないための観点です。要件や組織の制約に応じて取捨選択してください。

#### Compute（仮想マシン/コンテナ/サーバーレス）

- [ ] ワークロード特性（常時稼働/バッチ/イベント駆動）を整理した
- [ ] 可用性要件（SLO/SLA）と障害時の挙動（Multi-AZ等）を定義した
- [ ] スケール方式（水平/垂直/オートスケール）と上限を決めた
- [ ] OS/ランタイムの更新責任（パッチ/EOL）を整理した
- [ ] 依存先（DB/外部API等）のボトルネックを考慮した
- [ ] 観測性（メトリクス/ログ/トレース）を設計した

#### Storage（オブジェクト/ブロック/ファイル/DB）

- [ ] 目的（トランザクション/分析/アーカイブ等）を整理した
- [ ] 整合性要件（強整合/結果整合）を整理した
- [ ] 耐久性/可用性要件を整理した
- [ ] 暗号化（保存/転送）と鍵管理の方針を決めた
- [ ] バックアップ/復旧手順（RPO/RTO）を定義した
- [ ] コスト要因（容量/リクエスト/データ転送）を把握した

#### Network（VPC/VNet、LB、DNS、プライベート接続）

- [ ] IPレンジ/サブネット設計（将来拡張含む）を決めた
- [ ] 公開範囲（インターネット境界）と責任分界を定義した
- [ ] ルーティング/分離（public/private、セグメント）を設計した
- [ ] 名前解決（DNS）とTLS終端（証明書）を設計した
- [ ] アクセス制御（SG/NSG/NACL）を設計した
- [ ] プライベート接続（VPC Endpoint/Private Link等）の要否を整理した
- [ ] ネットワークの観測性（Flow Logs等）を設計した

### セキュリティチェックリスト

#### 認証・認可
- [ ] 多要素認証の有効化
- [ ] IAMロールの最小権限設定
- [ ] アクセスキーの定期ローテーション
- [ ] サービスアカウントの適切な管理

#### ネットワークセキュリティ
- [ ] VPC/サブネットの適切な設計
- [ ] セキュリティグループの最小化
- [ ] NACLの設定
- [ ] VPNまたはDirect Connectの利用

#### データ保護
- [ ] 保存時暗号化の有効化
- [ ] 転送時暗号化の実装
- [ ] バックアップの暗号化
- [ ] 鍵管理システムの利用

### 運用チェックリスト

#### 監視・ログ
- [ ] メトリクス監視の設定
- [ ] アラート設定
- [ ] ログの集約と分析
- [ ] 異常検知の実装

#### バックアップ・災害復旧
- [ ] 自動バックアップの設定
- [ ] 復旧手順の文書化
- [ ] 災害復旧テストの実施
- [ ] RPO/RTOの定義と測定

#### コスト最適化
- [ ] 使用状況の定期確認
- [ ] 不要リソースの削除
- [ ] 予約インスタンスの活用
- [ ] コストアラートの設定

## D. 用語集

### 基本用語

**可用性（Availability）**
システムが正常に動作している時間の割合。通常は年間稼働率で表現される。

**耐久性（Durability）**
データが失われずに保持される確率。可用性（サービスが使えるか）とは別の指標であり、用途に応じて「データ損失の許容度」とセットで考える。

**耐障害性（Fault Tolerance）**
システムの一部に障害が発生しても、全体として機能し続ける能力。

**整合性（Consistency）**
分散システムにおいて、複数の読み取りが同じ状態を観測できる性質。強整合/結果整合など、要求水準により設計・コストが変わる。

**災害復旧（Disaster Recovery）**
災害や重大な障害からシステムを復旧させる計画と手順。

**RPO（Recovery Point Objective）**
災害発生時に許容されるデータ損失の時間。

**RTO（Recovery Time Objective）**
災害発生から復旧完了までの許容時間。

**SLI / SLO / SLA**
サービスの信頼性を測るための指標（SLI）、目標（SLO）、契約上の合意（SLA）。SLAの数値は、前提条件や除外条件（計測範囲、免責、制御外要因）と併せて読む。

### クラウド固有用語

**共有責任モデル（Shared Responsibility Model）**
クラウド事業者と利用者の責任分界を示す考え方。IaaS/PaaS/SaaSで「利用者側に残る責任」（設定、権限、データ管理、監査等）が変化する。

**制御プレーン（Control Plane）/データプレーン（Data Plane）**
設定や管理API等を扱う層（制御プレーン）と、実際の通信や処理を担う層（データプレーン）を分けて捉える考え方。障害や権限制御の影響範囲を整理する際に有用。

**弾力性（Elasticity）**
需要に応じて自動的にリソースを増減する能力。

**スケーラビリティ（Scalability）**
負荷の増加に対してシステムの性能を向上させる能力。

**マルチテナンシー（Multi-tenancy）**
複数の顧客が同じインフラストラクチャを共有する仕組み。

**ハイブリッドクラウド（Hybrid Cloud）**
パブリッククラウドとプライベートクラウドを組み合わせた環境。

## E. 参考リンク

### 公式ドキュメント

#### AWS
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-learning/)
- [AWS Pricing Calculator](https://calculator.aws/)

#### Azure
- [Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/)
- [Azure Security Documentation](https://docs.microsoft.com/en-us/azure/security/)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

#### Google Cloud
- [Google Cloud Architecture Center](https://cloud.google.com/architecture)
- [Google Cloud Security](https://cloud.google.com/security)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)

### コミュニティ・学習リソース

#### 認定資格
- AWS Solutions Architect
- Azure Solutions Architect Expert
- Google Cloud Professional Cloud Architect

#### 書籍
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Building Microservices" by Sam Newman
- "Site Reliability Engineering" by Google

#### オンライン学習
- AWS Training and Certification
- Microsoft Learn
- Google Cloud Training
- Linux Academy / A Cloud Guru

---

この付録は、クラウドインフラエンジニアの日常業務で参照する基本的な情報をまとめたものです。技術の進歩に応じて定期的に更新することをお勧めします。
