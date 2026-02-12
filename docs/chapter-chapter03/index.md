---
layout: book
order: 5
title: "第3章：仮想マシン（Compute）の活用"
---

# 第3章：仮想マシン（Compute）の活用

## はじめに

仮想マシン（VM）は、クラウドコンピューティングの最も基本的かつ重要なサービスです。AWS EC2、Azure Virtual Machines、Google Compute Engine は、それぞれ実装の詳細は異なりますが、オンデマンドでスケーラブルなコンピューティングリソースを提供するという同じ目的を持っています。

本章では、仮想マシンの選択から設計、運用、最適化まで、実践的な知識とスキルを体系的に学びます。単にインスタンスを起動するだけでなく、ビジネス要件に最適化された、セキュアで費用対効果の高いコンピュート環境を構築する方法を習得します。

## 3.1 仮想マシンの種類と選び方（インスタンスタイプ、OS）

### インスタンスタイプ選択の経済学と技術

クラウドにおける仮想マシンの選択は、単なる技術的な決定ではありません。それは、パフォーマンス、コスト、将来の拡張性、運用の複雑さのバランスを取る、戦略的な意思決定です。

#### なぜこれほど多くのインスタンスタイプが存在するのか

**ワークロードの多様性への対応**

現代のアプリケーションは、極めて多様な特性を持っています。代表例は次のとおりです。

```text
ウェブサーバー：
- CPU: 中程度の使用率（20〜40%）
- メモリ: リクエスト数に比例
- ネットワーク: 高いスループット要求
- ストレージ: 低I/O

データベース：
- CPU: クエリ複雑度に依存
- メモリ: データセット全体をキャッシュ
- ネットワーク: 中程度
- ストレージ: 高IOPS要求

機械学習トレーニング：
- CPU: 前処理で使用
- GPU: モデル学習で集中使用
- メモリ: 大容量データセット
- ストレージ: 高スループット
```

これらの異なる要求に対して、単一のハードウェア構成で対応することは、技術的にも経済的にも非効率です。

### インスタンスファミリーの詳細解説

#### 1. 汎用インスタンス（General Purpose）

**特徴と設計思想：**
```text
リソースバランス：
- vCPU : メモリ = 1:4 の比率が一般的
- 中程度のネットワーク性能
- EBS最適化がデフォルト有効（新世代）

利用シナリオ：
- マイクロサービスアーキテクチャ
- 小〜中規模のデータベース
- 開発・テスト環境
- エンタープライズアプリケーション
```

**各プロバイダーの詳細：**

**AWS (M6i, M6a, T3, T4g)**
```text
M6i/M6a シリーズ：
- Intel Xeon 第3世代 / AMD EPYC 第3世代
- ニトロシステムによる最適化
- 最大 384 vCPU, 1536 GiB メモリ
- ネットワーク: 最大 50 Gbps

T3/T4g シリーズ（バースト可能）：
- ベースライン性能 + バーストクレジット
- コスト効率重視のワークロード向け
- CPUクレジットの蓄積と消費
- T4g: ARM ベース（Graviton2）で20%コスト削減

価格例（us-east-1, 2024年）：
m6i.large (2 vCPU, 8 GiB): $0.096/時間
t3.large (2 vCPU, 8 GiB): $0.0832/時間
```

**Azure (Dv4, Dav4, B シリーズ)**
```text
Dv4/Dav4 シリーズ：
- Intel Xeon Platinum 8272CL / AMD EPYC 7452
- 最大 96 vCPU, 384 GiB メモリ
- Premium SSD サポート
- 高速ネットワーク対応

B シリーズ（バースト可能）：
- 低コストのベースライン性能
- クレジットバンキングシステム
- 開発環境に最適

価格例（East US, 2024年）：
D2v4 (2 vCPU, 8 GiB): $0.096/時間
B2s (2 vCPU, 4 GiB): $0.0416/時間
```

**GCP (N2, N2D, E2)**
```text
N2/N2D シリーズ：
- Intel Xeon / AMD EPYC 第2世代
- カスタムマシンタイプ対応
- 最大 128 vCPU, 864 GiB メモリ
- 高性能ネットワーク

E2 シリーズ（コスト最適化）：
- 複数のCPUプラットフォーム
- 自動的なライブマイグレーション
- 事前定義・カスタム両対応

価格例（us-central1, 2024年）：
n2-standard-2 (2 vCPU, 8 GiB): $0.0971/時間
e2-standard-2 (2 vCPU, 8 GiB): $0.0669/時間
```

#### 2. コンピュート最適化（Compute Optimized）

**設計思想：**
```text
高性能CPU重視：
- 高周波数プロセッサ
- vCPU : メモリ = 1:2 の比率
- 最新のCPUアーキテクチャ

適用シナリオ：
- 高性能ウェブサーバー
- 科学計算・シミュレーション
- 分散分析
- 高性能ゲームサーバー
```

**各プロバイダーの詳細：**

**AWS (C6i, C6a, C7g)**
```text
C6i/C6a シリーズ：
- Intel Xeon 第3世代 / AMD EPYC 第3世代
- 最大 3.5 GHz の高クロック
- 最大 192 vCPU, 384 GiB メモリ
- EBS最適化・SR-IOV対応

C7g シリーズ（ARM）：
- AWS Graviton3 プロセッサ
- 最大 40% パフォーマンス向上
- 最大 60% エネルギー効率改善

価格例（us-east-1, 2024年）：
c6i.large (2 vCPU, 4 GiB): $0.085/時間
c7g.large (2 vCPU, 4 GiB): $0.0725/時間
```

**Azure (Fv2, Fx)**
```text
Fv2 シリーズ：
- Intel Xeon Platinum 8272CL
- 最大 3.7 GHz ベースクロック
- 最大 72 vCPU, 144 GiB メモリ
- 高速ネットワーク・Premium SSD

価格例（East US, 2024年）：
F2s_v2 (2 vCPU, 4 GiB): $0.085/時間
```

**GCP (C2, C2D)**
```text
C2/C2D シリーズ：
- Intel Xeon / AMD EPYC 第2世代
- 最大 3.9 GHz のターボクロック
- 最大 60 vCPU, 240 GiB メモリ
- 高性能ネットワーク

価格例（us-central1, 2024年）：
c2-standard-2 (2 vCPU, 8 GiB): $0.1002/時間
c2d-standard-2 (2 vCPU, 8 GiB): $0.0891/時間
```

#### 3. メモリ最適化（Memory Optimized）

**設計思想：**
```text
大容量メモリ重視：
- vCPU : メモリ = 1:8 または 1:16 の比率
- 高メモリ帯域幅
- NUMA最適化

適用シナリオ：
- インメモリデータベース（Redis, Memcached）
- リアルタイム解析
- 大容量キャッシュ
- 高性能計算（HPC）
```

**各プロバイダーの詳細：**

**AWS (R6i, R6a, X1e, z1d)**
```text
R6i/R6a シリーズ：
- Intel Xeon 第3世代 / AMD EPYC 第3世代
- 最大 1024 GiB メモリ
- DDR4-3200 メモリ
- 高帯域幅メモリアクセス

X1e シリーズ：
- 最大 3904 GiB メモリ
- SAP HANA 認定
- 高メモリ帯域幅

z1d シリーズ：
- 高周波数 + 高メモリ
- NVMe SSD 搭載
- 最大 4.0 GHz ターボクロック

価格例（us-east-1, 2024年）：
r6i.large (2 vCPU, 16 GiB): $0.126/時間
x1e.large (2 vCPU, 61 GiB): $0.334/時間
z1d.large (2 vCPU, 16 GiB): $0.186/時間
```

**Azure (Ev4, Eav4, Mv2)**
```text
Ev4/Eav4 シリーズ：
- Intel Xeon Platinum / AMD EPYC 第2世代
- 最大 672 GiB メモリ
- Premium SSD サポート
- 高速ネットワーク

Mv2 シリーズ：
- 最大 5.7 TiB メモリ
- SAP HANA 認定
- 最大 416 vCPU

価格例（East US, 2024年）：
E2v4 (2 vCPU, 16 GiB): $0.126/時間
M64s_v2 (64 vCPU, 1024 GiB): $5.888/時間
```

**GCP (N2-highmem, M1, M2)**
```text
N2-highmem シリーズ：
- Intel Xeon 第2世代
- 最大 6.5 GiB メモリ/vCPU
- 最大 864 GiB メモリ
- カスタムマシンタイプ対応

M1/M2 シリーズ：
- 最大 12 TiB メモリ
- SAP HANA 認定
- 専用ホスト

価格例（us-central1, 2024年）：
n2-highmem-2 (2 vCPU, 16 GiB): $0.1188/時間
m1-ultramem-40 (40 vCPU, 961 GiB): $6.7034/時間
```

#### 4. ストレージ最適化（Storage Optimized）

**設計思想：**
```text
高速ストレージ重視：
- NVMe SSD 搭載
- 高 IOPS・低レイテンシ
- ローカルストレージ

適用シナリオ：
- 分散ファイルシステム
- データウェアハウス
- 高IOPS NoSQL データベース
- 検索エンジン
```

**各プロバイダーの詳細：**

**AWS (I3, I3en, I4i, D2, D3)**
```text
I3/I3en シリーズ：
- NVMe SSD 搭載
- 最大 15.2 TiB NVMe ストレージ
- 最大 325万 IOPS
- 10 Gbps ネットワーク

I4i シリーズ：
- 最新世代 NVMe SSD
- 最大 30 TiB NVMe ストレージ
- 最大 400万 IOPS
- AWS Nitro SSD

D2/D3 シリーズ：
- HDD ベース大容量ストレージ
- 最大 48 TiB HDD ストレージ
- 分散ファイルシステム向け

価格例（us-east-1, 2024年）：
i3.large (2 vCPU, 15.25 GiB + 475 GB NVMe): $0.156/時間
i4i.large (2 vCPU, 16 GiB + 468 GB NVMe): $0.1692/時間
d3.large (2 vCPU, 8 GiB + 6000 GB HDD): $0.1662/時間
```

**Azure (Lv2, Lv3)**
```text
Lv2/Lv3 シリーズ：
- NVMe SSD 搭載
- 最大 1.92 TiB NVMe ストレージ
- 高 IOPS・低レイテンシ
- 高速ネットワーク

価格例（East US, 2024年）：
L8s_v2 (8 vCPU, 64 GiB + 1920 GB NVMe): $0.696/時間
L8s_v3 (8 vCPU, 64 GiB + 1920 GB NVMe): $0.624/時間
```

**GCP (Local SSD)**
```text
Local SSD：
- 375 GB NVMe SSD
- 最大 24 個まで接続可能
- 最大 680,000 IOPS
- 任意のマシンタイプに追加可能

価格例（us-central1, 2024年）：
Local SSD: $0.04/時間（375 GB あたり）
n2-standard-2 + 1x Local SSD: $0.1371/時間
```

#### 5. 高性能コンピューティング（HPC）

**設計思想：**
```text
大規模並列処理：
- 高性能CPU・GPU
- 高帯域幅ネットワーク
- 低レイテンシ通信
- RDMA 対応

適用シナリオ：
- 科学計算・シミュレーション
- 機械学習・AI トレーニング
- 金融モデリング
- 気象・地震解析
```

**各プロバイダーの詳細：**

**AWS (HPC6a, HPC7g)**
```text
HPC6a シリーズ：
- AMD EPYC 第3世代
- 最大 96 vCPU
- Elastic Fabric Adapter (EFA)
- 100 Gbps ネットワーク

HPC7g シリーズ：
- AWS Graviton3E プロセッサ
- 最大 128 vCPU
- DDR5 メモリ
- 200 Gbps ネットワーク

価格例（us-east-1, 2024年）：
hpc6a.48xlarge (96 vCPU, 384 GiB): $2.88/時間
hpc7g.4xlarge (16 vCPU, 128 GiB): $1.2848/時間
```

**Azure (HBv3, HCv1, NCv3)**
```text
HBv3 シリーズ：
- AMD EPYC 第3世代
- 最大 120 vCPU
- InfiniBand HDR
- 200 Gbps ネットワーク

HCv1 シリーズ：
- Intel Xeon Platinum
- 最大 44 vCPU
- InfiniBand EDR
- 100 Gbps ネットワーク

NCv3 シリーズ：
- NVIDIA V100 GPU
- 最大 4 GPU
- NVLink 2.0
- RDMA 対応

価格例（East US, 2024年）：
HB120rs_v3 (120 vCPU, 448 GiB): $3.168/時間
HC44rs (44 vCPU, 352 GiB): $2.64/時間
NC24rs_v3 (24 vCPU, 448 GiB + 4x V100): $18.12/時間
```

**GCP (C2, N2, A2)**
```text
C2 シリーズ：
- Intel Xeon Cascade Lake
- 最大 60 vCPU
- 高性能ネットワーク
- 科学計算最適化

A2 シリーズ：
- NVIDIA A100 GPU
- 最大 16 GPU
- NVLink 3.0
- 高帯域幅メモリ

価格例（us-central1, 2024年）：
c2-standard-60 (60 vCPU, 240 GiB): $3.006/時間
a2-highgpu-1g (12 vCPU, 85 GiB + 1x A100): $3.673/時間
```

### インスタンスタイプ選択のフレームワーク

#### 1. ワークロード分析

**パフォーマンス要件の定量化：**

```python
# ワークロード分析の例
workload_analysis = {
    "cpu_utilization": {
        "average": 45,  # %
        "peak": 85,     # %
        "pattern": "burst"  # steady, burst, periodic
    },
    "memory_usage": {
        "average": 4.2,  # GB
        "peak": 6.8,     # GB
        "cache_ratio": 0.6  # データキャッシュ比率
    },
    "network": {
        "throughput": 150,  # Mbps
        "connections": 1000,  # concurrent
        "latency_sensitive": True
    },
    "storage": {
        "iops": 1500,      # IOPS
        "throughput": 50,   # MB/s
        "capacity": 100     # GB
    }
}
```

#### 2. コスト最適化

**Right-sizing の実践：**

```python
# コスト最適化の計算例
def calculate_instance_cost(instance_type, hours_per_month=730):
    prices = {
        "m6i.large": 0.096,
        "m6i.xlarge": 0.192,
        "c6i.large": 0.085,
        "r6i.large": 0.126
    }
    
    monthly_cost = prices[instance_type] * hours_per_month
    return monthly_cost

# 使用例
instances = ["m6i.large", "m6i.xlarge", "c6i.large", "r6i.large"]
for instance in instances:
    cost = calculate_instance_cost(instance)
    print(f"{instance}: ${cost:.2f}/month")
```

#### 3. ベンチマーキング

**性能評価の基準：**

```bash
# CPU ベンチマーク
sysbench cpu --threads=2 --time=60 run

# メモリ ベンチマーク
sysbench memory --memory-total-size=10G --threads=2 run

# ストレージ ベンチマーク
fio --name=random-read --ioengine=libaio --rw=randread --bs=4k --numjobs=1 --size=4G --runtime=60 --time_based --group_reporting

# ネットワーク ベンチマーク
iperf3 -c target-server -t 60 -P 4
```

### オペレーティングシステムの選択

#### 1. Linux ディストリビューション

**Amazon Linux 2023**
```text
特徴：
- AWS 最適化
- 長期サポート（最大5年）
- dnf（RPM）によるパッケージ管理
- セキュリティ更新の迅速な提供

適用シナリオ：
- AWS 中心の環境
- 運用コストを抑えたい場合
- AWS サービスとの統合重視
```

**Ubuntu**
```text
特徴：
- 豊富なパッケージ
- 活発なコミュニティ
- 定期的なLTSリリース
- クラウドネイティブ対応

適用シナリオ：
- 開発環境
- コンテナ化アプリケーション
- オープンソースソフトウェア
```

**CentOS/RHEL**
```text
特徴：
- エンタープライズ志向
- 長期サポート
- 安定性重視
- 商用サポート（RHEL）

適用シナリオ：
- エンタープライズアプリケーション
- 長期運用システム
- コンプライアンス要件
```

#### 2. Windows Server

**Windows Server 2019/2022**
```text
特徴：
- Active Directory 統合
- .NET アプリケーション
- SQL Server 最適化
- PowerShell 自動化

適用シナリオ：
- Microsoft 技術スタック
- エンタープライズアプリケーション
- レガシーシステム移行
```

**ライセンス考慮事項：**
```text
BYOL (Bring Your Own License)：
- 既存ライセンスの活用
- ライセンス持込割引
- コンプライアンス管理

License Included：
- 従量課金モデル
- 初期投資不要
- 使用量に応じた課金
```

### 実践的な選択事例

#### 事例1: ウェブアプリケーション

**要件：**
- 平均 100 並行ユーザー
- レスポンス時間 < 200ms
- 月間 50GB データ転送
- 高可用性要求

**選択結果：**
```text
推奨構成：
- インスタンスタイプ: m6i.large
- OS: Ubuntu LTS（例: 22.04）
- 配置: 複数AZでの冗長化
- ロードバランサー: Application Load Balancer

根拠：
- バランスの取れたリソース比率
- バーストトラフィックに対応
- コスト効率の良い選択
```

#### 事例2: データベースサーバー

**要件：**
- 500GB データベース
- 高IOPS要求（10,000 IOPS）
- メモリ集約的処理
- 99.9% 可用性

**選択結果：**
```text
推奨構成：
- インスタンスタイプ: r6i.xlarge
- OS: Amazon Linux 2023
- ストレージ: gp3 (プロビジョンド IOPS)
- 配置: Multi-AZ 配置

根拠：
- 高メモリ・CPU 比率
- EBS 最適化
- マネージドサービス利用
```

#### 事例3: 機械学習ワークロード

**要件：**
- 大規模データセット処理
- GPU 計算
- 分散処理
- バッチ処理

**選択結果：**
```text
推奨構成：
- インスタンスタイプ: p4d.24xlarge
- OS: Deep Learning AMI
- ストレージ: FSx for Lustre
- 配置: スポットインスタンス活用

根拠：
- 高性能GPU（8x A100）
- 高帯域幅ネットワーク
- 最適化されたML環境
```

## 3.2 仮想マシンのライフサイクル管理

### 起動から停止までの包括的管理

仮想マシンの適切なライフサイクル管理は、単にインスタンスを起動・停止するだけではありません。設計、プロビジョニング、設定、監視、メンテナンス、最適化、廃止まで、すべてのフェーズを通じて一貫した品質とセキュリティを確保する必要があります。

#### 1. 設計・計画フェーズ

**キャパシティプランニング**

```python
# キャパシティプランニングの例
import math

def calculate_capacity_requirements(business_metrics):
    """
    ビジネスメトリクスからキャパシティ要件を計算
    """
    # 基本メトリクス
    daily_users = business_metrics['daily_active_users']
    peak_concurrency_ratio = business_metrics['peak_concurrency_ratio']
    growth_rate = business_metrics['annual_growth_rate']
    
    # 現在の要件計算
    current_peak_users = daily_users * peak_concurrency_ratio
    
    # 成長を考慮した将来要件
    planning_horizon = 2  # 2年間
    future_peak_users = current_peak_users * (1 + growth_rate) ** planning_horizon
    
    # リソース要件の計算
    cpu_per_user = 0.1  # vCPU/user
    memory_per_user = 0.25  # GB/user
    
    required_vcpu = math.ceil(future_peak_users * cpu_per_user)
    required_memory = math.ceil(future_peak_users * memory_per_user)
    
    # 冗長性とバッファーを考慮
    redundancy_factor = 2.0  # アクティブ-スタンバイ
    buffer_factor = 1.3  # 30%のバッファー
    
    final_vcpu = math.ceil(required_vcpu * redundancy_factor * buffer_factor)
    final_memory = math.ceil(required_memory * redundancy_factor * buffer_factor)
    
    return {
        'current_peak_users': current_peak_users,
        'future_peak_users': future_peak_users,
        'required_vcpu': final_vcpu,
        'required_memory': final_memory,
        'recommended_instances': calculate_instance_mix(final_vcpu, final_memory)
    }

def calculate_instance_mix(total_vcpu, total_memory):
    """
    必要なリソースから最適なインスタンス構成を計算
    """
    instance_types = {
        'm6i.large': {'vcpu': 2, 'memory': 8, 'cost_per_hour': 0.096},
        'm6i.xlarge': {'vcpu': 4, 'memory': 16, 'cost_per_hour': 0.192},
        'm6i.2xlarge': {'vcpu': 8, 'memory': 32, 'cost_per_hour': 0.384},
        'm6i.4xlarge': {'vcpu': 16, 'memory': 64, 'cost_per_hour': 0.768}
    }
    
    # 最適化アルゴリズム（簡略化）
    best_config = None
    min_cost = float('inf')
    
    for instance_type, specs in instance_types.items():
        # 必要なインスタンス数を計算
        instances_for_cpu = math.ceil(total_vcpu / specs['vcpu'])
        instances_for_memory = math.ceil(total_memory / specs['memory'])
        required_instances = max(instances_for_cpu, instances_for_memory)
        
        # コストを計算
        monthly_cost = required_instances * specs['cost_per_hour'] * 730
        
        if monthly_cost < min_cost:
            min_cost = monthly_cost
            best_config = {
                'instance_type': instance_type,
                'count': required_instances,
                'monthly_cost': monthly_cost,
                'total_vcpu': required_instances * specs['vcpu'],
                'total_memory': required_instances * specs['memory']
            }
    
    return best_config

# 使用例
business_metrics = {
    'daily_active_users': 10000,
    'peak_concurrency_ratio': 0.15,
    'annual_growth_rate': 0.25
}

capacity_plan = calculate_capacity_requirements(business_metrics)
print(f"推奨構成: {capacity_plan['recommended_instances']}")
```

#### 2. プロビジョニング・起動フェーズ

**Infrastructure as Code による自動化**

```yaml
# Terraform による VM プロビジョニング例
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "instance_count" {
  description = "Number of instances to launch"
  type        = number
  default     = 2
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m6i.large"
}

# NOTE:
# - SSM Public Parameter の "-latest" は更新されるため、差分が出て意図しないロールアウトにつながる場合があります。
# - 運用では AMI ID を変数で固定し、計画的に更新してください。
variable "amazon_linux_2023_ami_id" {
  description = "Pinned Amazon Linux 2023 AMI ID (optional)"
  type        = string
  default     = null
}

# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# AMI の選択（Amazon Linux 2023）
# SSM Public Parameter から最新AMIを取得
data "aws_ssm_parameter" "amazon_linux_2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  amazon_linux_2023_ami_id = coalesce(
    var.amazon_linux_2023_ami_id,
    data.aws_ssm_parameter.amazon_linux_2023_ami.value
  )
}

# セキュリティグループ
resource "aws_security_group" "web_server" {
  name_prefix = "${var.environment}-web-"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-web-sg"
  }
}

# Launch Template
resource "aws_launch_template" "web_server" {
  name_prefix   = "${var.environment}-web-"
  image_id      = local.amazon_linux_2023_ami_id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.web_server.id]

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    environment = var.environment
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.environment}-web-server"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }

  # EBS 最適化
  ebs_optimized = true

  # 詳細監視
  monitoring {
    enabled = true
  }

  # メタデータサービス v2 強制
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "web_server" {
  name                = "${var.environment}-web-asg"
  vpc_zone_identifier = data.aws_subnets.default.ids
  target_group_arns   = [aws_lb_target_group.web_server.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.instance_count
  max_size         = var.instance_count * 2
  desired_capacity = var.instance_count

  launch_template {
    id      = aws_launch_template.web_server.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.environment}-web-server"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

**User Data による初期設定**

```bash
#!/bin/bash
# userdata.sh

set -e

# 変数設定
ENVIRONMENT="${environment}"
LOG_FILE="/var/log/userdata.log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting instance initialization for environment: $ENVIRONMENT"

# システム更新
log "Updating system packages"
yum update -y

# 必要なパッケージのインストール
log "Installing required packages"
yum install -y \
    httpd \
    awslogs \
    amazon-cloudwatch-agent \
    htop \
    git \
    wget \
    curl \
    unzip

# Apache の設定
log "Configuring Apache"
systemctl enable httpd
systemctl start httpd

# カスタムインデックスページの作成
cat > /var/www/html/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>$ENVIRONMENT Web Server</title>
</head>
<body>
    <h1>Welcome to $ENVIRONMENT Environment</h1>
    <p>Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)</p>
    <p>Availability Zone: $(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)</p>
    <p>Instance Type: $(curl -s http://169.254.169.254/latest/meta-data/instance-type)</p>
    <p>Local IP: $(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)</p>
    <p>Timestamp: $(date)</p>
</body>
</html>
EOF

# CloudWatch Agent の設定
log "Configuring CloudWatch Agent"
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "metrics": {
        "namespace": "Custom/$ENVIRONMENT",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "/"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/httpd/access_log",
                        "log_group_name": "/aws/ec2/$ENVIRONMENT/httpd/access",
                        "log_stream_name": "{instance_id}"
                    },
                    {
                        "file_path": "/var/log/httpd/error_log",
                        "log_group_name": "/aws/ec2/$ENVIRONMENT/httpd/error",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    }
}
EOF

# CloudWatch Agent の起動
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# 自動起動設定
systemctl enable amazon-cloudwatch-agent

# セキュリティ設定
log "Applying security configurations"

# SSH の設定強化
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# ファイアウォール設定
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# アプリケーションのデプロイ
log "Deploying application"
cd /var/www/html
git clone https://github.com/your-org/your-app.git app
chown -R apache:apache app/
systemctl restart httpd

# ヘルスチェック用エンドポイント
cat > /var/www/html/health.html << EOF
{
    "status": "healthy",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "instance_id": "$(curl -s http://169.254.169.254/latest/meta-data/instance-id)",
    "services": {
        "httpd": "$(systemctl is-active httpd)",
        "cloudwatch-agent": "$(systemctl is-active amazon-cloudwatch-agent)"
    }
}
EOF

log "Instance initialization completed successfully"

# 完了通知（SNS等）
aws sns publish \
    --topic-arn "arn:aws:sns:us-east-1:123456789012:instance-notifications" \
    --message "Instance $(curl -s http://169.254.169.254/latest/meta-data/instance-id) initialized successfully in $ENVIRONMENT environment" \
    --subject "Instance Initialization Complete"

log "Initialization complete"
```

#### 3. 設定・構成管理フェーズ

**Ansible による構成管理**


```yaml
# playbook.yml
---
- name: Configure web servers
  hosts: web_servers
  become: yes
  vars:
    app_name: "myapp"
    app_version: "1.0.0"
    environment: "production"

  tasks:
    - name: Install packages
      yum:
        name:
          - httpd
          - php
          - php-mysql
          - git
          - htop
          - vim
        state: present

    - name: Configure Apache
      template:
        src: httpd.conf.j2
        dest: /etc/httpd/conf/httpd.conf
        backup: yes
      notify: restart httpd

    - name: Create virtual host
      template:
        src: vhost.conf.j2
        dest: /etc/httpd/conf.d/`{% raw %}`{{ app_name }}`{% endraw %}`.conf
      notify: restart httpd

    - name: Deploy application
      git:
        repo: https://github.com/your-org/`{% raw %}`{{ app_name }}`{% endraw %}`.git
        dest: /var/www/html/`{% raw %}`{{ app_name }}`{% endraw %}`
        version: "`{% raw %}`{{ app_version }}`{% endraw %}`"
        force: yes
      notify: restart httpd

    - name: Set file permissions
      file:
        path: /var/www/html/`{% raw %}`{{ app_name }}`{% endraw %}`
        owner: apache
        group: apache
        mode: '0755'
        recurse: yes

    - name: Configure logrotate
      template:
        src: logrotate.conf.j2
        dest: /etc/logrotate.d/`{% raw %}`{{ app_name }}`{% endraw %}`

    - name: Setup monitoring
      include_tasks: monitoring.yml

    - name: Configure backup
      include_tasks: backup.yml

  handlers:
    - name: restart httpd
      systemd:
        name: httpd
        state: restarted
        enabled: yes
```


#### 4. 運用・監視フェーズ

**CloudWatch による監視設定**

```python
# monitoring_setup.py
import boto3
import json

def setup_comprehensive_monitoring(instance_id, environment):
    """
    包括的な監視設定を行う
    """
    cloudwatch = boto3.client('cloudwatch')
    
    # カスタムメトリクスの設定
    custom_metrics = [
        {
            'MetricName': 'ApplicationResponseTime',
            'Namespace': f'Custom/{environment}',
            'Dimensions': [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
        },
        {
            'MetricName': 'ActiveConnections',
            'Namespace': f'Custom/{environment}',
            'Dimensions': [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
        }
    ]
    
    # アラームの設定
    alarms = [
        {
            'AlarmName': f'{environment}-{instance_id}-HighCPU',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'CPUUtilization',
            'Namespace': 'AWS/EC2',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 80.0,
            'ActionsEnabled': True,
            'AlarmActions': [
                'arn:aws:sns:us-east-1:123456789012:high-cpu-alarm'
            ],
            'AlarmDescription': 'High CPU utilization detected',
            'Dimensions': [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
        },
        {
            'AlarmName': f'{environment}-{instance_id}-HighMemory',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'MemoryUtilization',
            'Namespace': 'CWAgent',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 85.0,
            'ActionsEnabled': True,
            'AlarmActions': [
                'arn:aws:sns:us-east-1:123456789012:high-memory-alarm'
            ],
            'AlarmDescription': 'High memory utilization detected',
            'Dimensions': [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
        },
        {
            'AlarmName': f'{environment}-{instance_id}-DiskSpace',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 1,
            'MetricName': 'DiskSpaceUtilization',
            'Namespace': 'CWAgent',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 90.0,
            'ActionsEnabled': True,
            'AlarmActions': [
                'arn:aws:sns:us-east-1:123456789012:disk-space-alarm'
            ],
            'AlarmDescription': 'Low disk space detected',
            'Dimensions': [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
        }
    ]
    
    # アラーム作成
    for alarm in alarms:
        try:
            cloudwatch.put_metric_alarm(**alarm)
            print(f"Created alarm: {alarm['AlarmName']}")
        except Exception as e:
            print(f"Failed to create alarm {alarm['AlarmName']}: {e}")
    
    return True

# 実行例
if __name__ == "__main__":
    instance_id = "i-1234567890abcdef0"
    environment = "production"
    setup_comprehensive_monitoring(instance_id, environment)
```

#### 5. メンテナンス・更新フェーズ

**自動化されたパッチ管理**

```bash
#!/bin/bash
# patch_management.sh

set -e

# 設定
ENVIRONMENT="production"
MAINTENANCE_WINDOW="02:00-04:00"
BACKUP_RETENTION_DAYS=30
NOTIFICATION_TOPIC="arn:aws:sns:us-east-1:123456789012:maintenance-notifications"

# ログ設定
LOG_FILE="/var/log/patch_management.log"
exec 1> >(tee -a $LOG_FILE)
exec 2> >(tee -a $LOG_FILE >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 事前チェック
pre_patch_checks() {
    log "Starting pre-patch checks"
    
    # ディスク容量チェック
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 85 ]; then
        log "ERROR: Disk usage is $DISK_USAGE%. Aborting patch installation."
        exit 1
    fi
    
    # サービス状態チェック
    CRITICAL_SERVICES=("httpd" "amazon-cloudwatch-agent")
    for service in "${CRITICAL_SERVICES[@]}"; do
        if ! systemctl is-active --quiet $service; then
            log "ERROR: Critical service $service is not running. Aborting patch installation."
            exit 1
        fi
    done
    
    # メモリ使用量チェック
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ $MEMORY_USAGE -gt 90 ]; then
        log "WARNING: Memory usage is $MEMORY_USAGE%. Proceeding with caution."
    fi
    
    log "Pre-patch checks completed successfully"
}

# バックアップ作成
create_backup() {
    log "Creating system backup"
    
    # 重要な設定ファイルのバックアップ
    BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # 設定ファイル
    tar -czf $BACKUP_DIR/system_config.tar.gz \
        /etc/httpd/ \
        /etc/ssh/ \
        /etc/crontab \
        /etc/fstab \
        /etc/hosts \
        /etc/resolv.conf \
        2>/dev/null || true
    
    # アプリケーションファイル
    tar -czf $BACKUP_DIR/application.tar.gz \
        /var/www/html/ \
        2>/dev/null || true
    
    # データベースバックアップ（該当する場合）
    if systemctl is-active --quiet mysqld; then
        mysqldump --all-databases --single-transaction > $BACKUP_DIR/mysql_backup.sql
    fi
    
    # S3へのバックアップ
    aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/instances/$(curl -s http://169.254.169.254/latest/meta-data/instance-id)/$(date +%Y%m%d_%H%M%S)/ --recursive
    
    log "Backup created successfully at $BACKUP_DIR"
}

# パッチ適用
apply_patches() {
    log "Starting patch installation"
    
    # パッケージリストの更新
    yum update -y --security
    
    # 特定のパッケージの更新（必要に応じて）
    CRITICAL_PACKAGES=("kernel" "glibc" "openssl" "openssh")
    for package in "${CRITICAL_PACKAGES[@]}"; do
        if yum list updates $package &>/dev/null; then
            log "Updating critical package: $package"
            yum update -y $package
        fi
    done
    
    log "Patch installation completed"
}

# 事後チェック
post_patch_checks() {
    log "Starting post-patch checks"
    
    # サービス状態チェック
    CRITICAL_SERVICES=("httpd" "amazon-cloudwatch-agent")
    for service in "${CRITICAL_SERVICES[@]}"; do
        if ! systemctl is-active --quiet $service; then
            log "ERROR: Critical service $service is not running after patch installation."
            # 自動回復試行
            systemctl start $service
            sleep 5
            if ! systemctl is-active --quiet $service; then
                log "ERROR: Failed to restart $service. Manual intervention required."
                # 通知送信
                aws sns publish \
                    --topic-arn $NOTIFICATION_TOPIC \
                    --message "Critical service $service failed to start after patching on $(hostname). Manual intervention required." \
                    --subject "Patch Installation Error"
            fi
        fi
    done
    
    # アプリケーションヘルスチェック
    if ! curl -f http://localhost/health.html &>/dev/null; then
        log "ERROR: Application health check failed after patch installation."
        # 通知送信
        aws sns publish \
            --topic-arn $NOTIFICATION_TOPIC \
            --message "Application health check failed after patching on $(hostname). Manual intervention required." \
            --subject "Patch Installation Error"
    fi
    
    log "Post-patch checks completed"
}

# 通知送信
send_notification() {
    local status=$1
    local message=$2
    
    aws sns publish \
        --topic-arn $NOTIFICATION_TOPIC \
        --message "$message on $(hostname) at $(date)" \
        --subject "Patch Management: $status"
}

# 古いバックアップの削除
cleanup_old_backups() {
    log "Cleaning up old backups"
    
    # ローカルバックアップの削除
    find /opt/backups -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} \;
    
    # S3バックアップの削除（S3 Lifecycle Policy推奨）
    aws s3api put-bucket-lifecycle-configuration \
        --bucket your-backup-bucket \
        --lifecycle-configuration file://backup-lifecycle.json
    
    log "Old backups cleanup completed"
}

# メイン処理
main() {
    log "Starting patch management process"
    
    # 開始通知
    send_notification "Started" "Patch management process started"
    
    # 処理実行
    pre_patch_checks
    create_backup
    apply_patches
    post_patch_checks
    cleanup_old_backups
    
    # 完了通知
    send_notification "Completed" "Patch management process completed successfully"
    
    log "Patch management process completed successfully"
}

# 実行
main "$@"
```

#### 6. 最適化・スケーリングフェーズ

**自動スケーリング設定**

```python
# auto_scaling_setup.py
import boto3
import json
from datetime import datetime, timedelta

class AutoScalingManager:
    def __init__(self, region='us-east-1'):
        self.autoscaling = boto3.client('autoscaling', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        
    def create_scaling_policy(self, asg_name, policy_name, policy_type='TargetTrackingScaling'):
        """
        スケーリングポリシーを作成
        """
        if policy_type == 'TargetTrackingScaling':
            # ターゲット追跡スケーリング
            response = self.autoscaling.put_scaling_policy(
                AutoScalingGroupName=asg_name,
                PolicyName=policy_name,
                PolicyType='TargetTrackingScaling',
                TargetTrackingConfiguration={
                    'TargetValue': 70.0,
                    'PredefinedMetricSpecification': {
                        'PredefinedMetricType': 'ASGAverageCPUUtilization'
                    },
                    'ScaleOutCooldown': 300,
                    'ScaleInCooldown': 300
                }
            )
        elif policy_type == 'StepScaling':
            # ステップスケーリング
            response = self.autoscaling.put_scaling_policy(
                AutoScalingGroupName=asg_name,
                PolicyName=policy_name,
                PolicyType='StepScaling',
                AdjustmentType='ChangeInCapacity',
                StepAdjustments=[
                    {
                        'MetricIntervalLowerBound': 0.0,
                        'MetricIntervalUpperBound': 50.0,
                        'ScalingAdjustment': 1
                    },
                    {
                        'MetricIntervalLowerBound': 50.0,
                        'ScalingAdjustment': 2
                    }
                ],
                Cooldown=300
            )
        
        return response['PolicyARN']
    
    def create_scheduled_scaling(self, asg_name, schedule_name, recurrence, min_size, max_size, desired_capacity):
        """
        スケジュールベースのスケーリングを作成
        """
        self.autoscaling.put_scheduled_update_group_action(
            AutoScalingGroupName=asg_name,
            ScheduledActionName=schedule_name,
            Recurrence=recurrence,
            MinSize=min_size,
            MaxSize=max_size,
            DesiredCapacity=desired_capacity
        )
    
    def setup_predictive_scaling(self, asg_name):
        """
        予測スケーリングを設定
        """
        self.autoscaling.put_scaling_policy(
            AutoScalingGroupName=asg_name,
            PolicyName='PredictiveScalingPolicy',
            PolicyType='PredictiveScaling',
            PredictiveScalingConfiguration={
                'MetricSpecifications': [
                    {
                        'TargetValue': 70.0,
                        'PredefinedMetricPairSpecification': {
                            'PredefinedMetricType': 'ASGCPUUtilization'
                        }
                    }
                ],
                'Mode': 'ForecastAndScale',
                'SchedulingBufferTime': 300,
                'MaxCapacityBreachBehavior': 'HonorMaxCapacity',
                'MaxCapacityBuffer': 10
            }
        )
    
    def configure_comprehensive_scaling(self, asg_name, environment):
        """
        包括的なスケーリング設定
        """
        # 1. CPU ベースのターゲット追跡
        cpu_policy_arn = self.create_scaling_policy(
            asg_name, 
            f'{environment}-cpu-target-tracking',
            'TargetTrackingScaling'
        )
        
        # 2. メモリベースのターゲット追跡
        memory_policy_arn = self.autoscaling.put_scaling_policy(
            AutoScalingGroupName=asg_name,
            PolicyName=f'{environment}-memory-target-tracking',
            PolicyType='TargetTrackingScaling',
            TargetTrackingConfiguration={
                'TargetValue': 80.0,
                'CustomizedMetricSpecification': {
                    'MetricName': 'MemoryUtilization',
                    'Namespace': 'CWAgent',
                    'Dimensions': [
                        {
                            'Name': 'AutoScalingGroupName',
                            'Value': asg_name
                        }
                    ],
                    'Statistic': 'Average'
                },
                'ScaleOutCooldown': 300,
                'ScaleInCooldown': 300
            }
        )
        
        # 3. ネットワークベースのターゲット追跡
        network_policy_arn = self.autoscaling.put_scaling_policy(
            AutoScalingGroupName=asg_name,
            PolicyName=f'{environment}-network-target-tracking',
            PolicyType='TargetTrackingScaling',
            TargetTrackingConfiguration={
                'TargetValue': 6000000.0,  # 6MB/s
                'PredefinedMetricSpecification': {
                    'PredefinedMetricType': 'ASGAverageNetworkIn'
                },
                'ScaleOutCooldown': 300,
                'ScaleInCooldown': 300
            }
        )
        
        # 4. スケジュールベースのスケーリング
        # 営業時間の開始（平日 9:00）
        self.create_scheduled_scaling(
            asg_name,
            f'{environment}-scale-up-business-hours',
            '0 9 * * 1-5',  # 平日 9:00 AM
            2, 10, 4
        )
        
        # 営業時間の終了（平日 18:00）
        self.create_scheduled_scaling(
            asg_name,
            f'{environment}-scale-down-after-hours',
            '0 18 * * 1-5',  # 平日 6:00 PM
            1, 6, 2
        )
        
        # 週末の最小構成
        self.create_scheduled_scaling(
            asg_name,
            f'{environment}-scale-down-weekend',
            '0 0 * * 6',  # 土曜日 12:00 AM
            1, 4, 1
        )
        
        # 5. 予測スケーリング（本番環境のみ）
        if environment == 'production':
            self.setup_predictive_scaling(asg_name)
        
        return {
            'cpu_policy_arn': cpu_policy_arn,
            'memory_policy_arn': memory_policy_arn['PolicyARN'],
            'network_policy_arn': network_policy_arn['PolicyARN']
        }

# 使用例
if __name__ == "__main__":
    manager = AutoScalingManager()
    
    # スケーリング設定の適用
    policy_arns = manager.configure_comprehensive_scaling(
        'production-web-asg',
        'production'
    )
    
    print(f"Scaling policies created: {policy_arns}")
```

#### 7. 廃止・削除フェーズ

**安全な廃止プロセス**

```python
# instance_decommission.py
import boto3
import json
import time
from datetime import datetime, timedelta

class InstanceDecommissionManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.autoscaling = boto3.client('autoscaling', region_name=region)
        self.elb = boto3.client('elbv2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        
    def safe_decommission(self, instance_id, reason='planned_retirement'):
        """
        安全なインスタンス廃止プロセス
        """
        try:
            # 1. インスタンス情報の取得
            instance_info = self.get_instance_info(instance_id)
            
            # 2. 事前チェック
            self.pre_decommission_checks(instance_id, instance_info)
            
            # 3. トラフィック排出
            self.drain_traffic(instance_id, instance_info)
            
            # 4. データバックアップ
            self.backup_instance_data(instance_id, instance_info)
            
            # 5. 監視・アラートの無効化
            self.disable_monitoring(instance_id)
            
            # 6. インスタンスの停止
            self.stop_instance(instance_id)
            
            # 7. 最終確認後の削除
            self.terminate_instance(instance_id, instance_info)
            
            # 8. 後処理
            self.post_decommission_cleanup(instance_id, instance_info)
            
            return True
            
        except Exception as e:
            self.send_notification(
                'Decommission Failed',
                f'Failed to decommission instance {instance_id}: {str(e)}'
            )
            return False
    
    def get_instance_info(self, instance_id):
        """
        インスタンス情報を取得
        """
        response = self.ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        # Auto Scaling Group の確認
        asg_name = None
        for tag in instance.get('Tags', []):
            if tag['Key'] == 'aws:autoscaling:groupName':
                asg_name = tag['Value']
                break
        
        # Load Balancer の確認
        target_groups = self.find_target_groups(instance_id)
        
        return {
            'instance': instance,
            'asg_name': asg_name,
            'target_groups': target_groups,
            'state': instance['State']['Name'],
            'instance_type': instance['InstanceType'],
            'launch_time': instance['LaunchTime']
        }
    
    def pre_decommission_checks(self, instance_id, instance_info):
        """
        廃止前チェック
        """
        # インスタンスの状態確認
        if instance_info['state'] not in ['running', 'stopped']:
            raise Exception(f"Instance {instance_id} is in {instance_info['state']} state")
        
        # 重要なサービスの確認
        if self.is_critical_instance(instance_id, instance_info):
            raise Exception(f"Instance {instance_id} is marked as critical")
        
        # 最後のバックアップ確認
        last_backup = self.get_last_backup_time(instance_id)
        if last_backup < datetime.now() - timedelta(days=1):
            raise Exception(f"Last backup for {instance_id} is older than 24 hours")
    
    def drain_traffic(self, instance_id, instance_info):
        """
        トラフィックの排出
        """
        # Auto Scaling Group からの除外
        if instance_info['asg_name']:
            self.autoscaling.detach_instances(
                InstanceIds=[instance_id],
                AutoScalingGroupName=instance_info['asg_name'],
                ShouldDecrementDesiredCapacity=True
            )
        
        # Target Group からの除外
        for tg_arn in instance_info['target_groups']:
            self.elb.deregister_targets(
                TargetGroupArn=tg_arn,
                Targets=[{'Id': instance_id}]
            )
            
            # ドレイン完了待機
            self.wait_for_draining(tg_arn, instance_id)
    
    def wait_for_draining(self, target_group_arn, instance_id, timeout=300):
        """
        ドレイン完了まで待機
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            response = self.elb.describe_target_health(
                TargetGroupArn=target_group_arn,
                Targets=[{'Id': instance_id}]
            )
            
            if response['TargetHealthDescriptions']:
                state = response['TargetHealthDescriptions'][0]['TargetHealth']['State']
                if state == 'draining':
                    print(f"Instance {instance_id} is draining...")
                    time.sleep(10)
                    continue
                elif state == 'unused':
                    print(f"Instance {instance_id} drain completed")
                    return
            
            time.sleep(10)
        
        raise Exception(f"Timeout waiting for instance {instance_id} to drain")
    
    def backup_instance_data(self, instance_id, instance_info):
        """
        インスタンスデータのバックアップ
        """
        # EBS スナップショットの作成
        volumes = []
        for bdm in instance_info['instance'].get('BlockDeviceMappings', []):
            if 'Ebs' in bdm:
                volumes.append(bdm['Ebs']['VolumeId'])
        
        snapshot_ids = []
        for volume_id in volumes:
            response = self.ec2.create_snapshot(
                VolumeId=volume_id,
                Description=f"Decommission backup for {instance_id}"
            )
            snapshot_ids.append(response['SnapshotId'])
        
        # タグ付け
        if snapshot_ids:
            self.ec2.create_tags(
                Resources=snapshot_ids,
                Tags=[
                    {'Key': 'Name', 'Value': f'{instance_id}-decommission-backup'},
                    {'Key': 'InstanceId', 'Value': instance_id},
                    {'Key': 'DecommissionDate', 'Value': datetime.now().isoformat()},
                    {'Key': 'RetentionDays', 'Value': '30'}
                ]
            )
        
        return snapshot_ids
    
    def disable_monitoring(self, instance_id):
        """
        監視とアラートの無効化
        """
        # CloudWatch アラームの無効化
        alarms = self.cloudwatch.describe_alarms()
        
        for alarm in alarms['MetricAlarms']:
            for dimension in alarm.get('Dimensions', []):
                if dimension['Name'] == 'InstanceId' and dimension['Value'] == instance_id:
                    self.cloudwatch.disable_alarm_actions(
                        AlarmNames=[alarm['AlarmName']]
                    )
                    print(f"Disabled alarm: {alarm['AlarmName']}")
    
    def stop_instance(self, instance_id):
        """
        インスタンスの停止
        """
        self.ec2.stop_instances(InstanceIds=[instance_id])
        
        # 停止完了待機
        waiter = self.ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        print(f"Instance {instance_id} stopped successfully")
    
    def terminate_instance(self, instance_id, instance_info):
        """
        インスタンスの削除
        """
        # 最終確認
        confirmation = input(f"Are you sure you want to terminate instance {instance_id}? (yes/no): ")
        if confirmation.lower() != 'yes':
            print("Termination cancelled")
            return
        
        self.ec2.terminate_instances(InstanceIds=[instance_id])
        
        # 削除完了待機
        waiter = self.ec2.get_waiter('instance_terminated')
        waiter.wait(InstanceIds=[instance_id])
        
        print(f"Instance {instance_id} terminated successfully")
    
    def post_decommission_cleanup(self, instance_id, instance_info):
        """
        廃止後の後処理
        """
        # セキュリティグループの未使用確認
        self.check_unused_security_groups(instance_info)
        
        # EIP の解放確認
        self.check_unused_elastic_ips(instance_info)
        
        # 通知送信
        self.send_notification(
            'Instance Decommissioned',
            f'Instance {instance_id} has been successfully decommissioned'
        )
    
    def send_notification(self, subject, message):
        """
        通知の送信
        """
        try:
            self.sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:decommission-notifications',
                Message=message,
                Subject=subject
            )
        except Exception as e:
            print(f"Failed to send notification: {e}")

# 使用例
if __name__ == "__main__":
    manager = InstanceDecommissionManager()
    
    # インスタンスの安全な廃止
    instance_id = "i-1234567890abcdef0"
    success = manager.safe_decommission(instance_id, reason="planned_retirement")
    
    if success:
        print(f"Instance {instance_id} decommissioned successfully")
    else:
        print(f"Failed to decommission instance {instance_id}")
```

---

[第4章：クラウドストレージの設計と利用](../chapter-chapter04/index.md)へ進む
