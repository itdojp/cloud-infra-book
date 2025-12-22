---
layout: book
order: 14
title: "付録：参考資料"
---

# 付録：参考資料

## A. 主要クラウドプロバイダーの比較表

### サービス比較

| カテゴリ | AWS | Azure | Google Cloud |
|---------|-----|-------|-------------|
| **仮想マシン** | EC2 | Virtual Machines | Compute Engine |
| **ストレージ（ブロック）** | EBS | Managed Disks | Persistent Disk |
| **ストレージ（オブジェクト）** | S3 | Blob Storage | Cloud Storage |
| **ネットワーク** | VPC | Virtual Network | VPC Network |
| **ロードバランサー** | ALB/NLB | Application Gateway | Cloud Load Balancing |
| **データベース（RDB）** | RDS | SQL Database | Cloud SQL |
| **データベース（NoSQL）** | DynamoDB | Cosmos DB | Cloud Firestore |
| **コンテナ管理** | ECS/EKS | ACI/AKS | GKE |
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
```
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
```
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

**耐障害性（Fault Tolerance）**
システムの一部に障害が発生しても、全体として機能し続ける能力。

**災害復旧（Disaster Recovery）**
災害や重大な障害からシステムを復旧させる計画と手順。

**RPO（Recovery Point Objective）**
災害発生時に許容されるデータ損失の時間。

**RTO（Recovery Time Objective）**
災害発生から復旧完了までの許容時間。

### クラウド固有用語

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
