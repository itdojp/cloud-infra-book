---
title: "第10章：Infrastructure as Code (IaC) と自動化"
chapter: chapter10
---

# 第10章：Infrastructure as Code (IaC) と自動化

## 10.1 IaCの概念とメリット

### Infrastructure as Codeという思想の革新性

Infrastructure as Code（IaC）は、インフラストラクチャ管理における最も重要なパラダイムシフトの一つです。手動でサーバーを設定し、GUIでクリックを繰り返していた時代から、プログラマブルで再現可能な方法への移行は、単なる効率化を超えて、インフラストラクチャの品質、信頼性、そして開発速度を根本的に向上させました。

### 宣言的アプローチと命令的アプローチの本質

IaCツールを理解する上で最も重要な概念は、宣言的（Declarative）アプローチと命令的（Imperative）アプローチの違いです。

**宣言的アプローチ：望ましい状態の記述**

宣言的アプローチでは、「どのような状態であるべきか」を記述します。

```hcl
# Terraform - 宣言的アプローチの例
resource "aws_instance" "web_servers" {
  count         = 3  # 3台のインスタンスが存在すべき
  instance_type = "t3.medium"
  ami           = data.aws_ami.amazon_linux_2.id

  subnet_id              = aws_subnet.public[count.index % length(aws_subnet.public)].id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "web-server-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # 現在2台しかない場合、Terraformは自動的に1台追加
  # 現在4台ある場合、Terraformは自動的に1台削除
  # 設定が異なる場合、Terraformは差分を適用
}
```

**命令的アプローチ：手順の記述**

命令的アプローチでは、「何をすべきか」の手順を記述します。

```python
# Python/Boto3 - 命令的アプローチの例
import boto3

ec2 = boto3.resource('ec2')

# 現在のインスタンス数を確認
current_instances = list(ec2.instances.filter(
    Filters=[
        {'Name': 'tag:Name', 'Values': ['web-server-*']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
))

desired_count = 3
current_count = len(current_instances)

# 不足分を追加
if current_count < desired_count:
    for i in range(current_count, desired_count):
        instance = ec2.create_instances(
            ImageId=get_approved_ami_id(environment),
            InstanceType='t3.medium',
            MinCount=1,
            MaxCount=1,
            SubnetId=get_next_subnet(),
            SecurityGroupIds=['sg-1234567890abcdef0'],
            TagSpecifications=[{
                'ResourceType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': f'web-server-{i+1}'},
                    {'Key': 'Environment', 'Value': environment},
                    {'Key': 'ManagedBy', 'Value': 'Python Script'}
                ]
            }]
        )[0]
        print(f"Created instance: {instance.id}")
# 過剰分を削除
elif current_count > desired_count:
    for instance in current_instances[desired_count:]:
        if environment != 'sandbox':
            raise RuntimeError('本例は検証環境専用。実運用では ASG / rolling update を使う')
        instance.terminate()
        print(f"Terminated sandbox instance: {instance.id}")
```

注記: `get_approved_ami_id(environment)` と `get_next_subnet()` は、承認済み AMI と配置先サブネットを返す説明用のプレースホルダです。実装では SSM Parameter Store や allowlist、タグ検索などの仕組みに置き換えてください。

注記: この例は API の振る舞いを説明するための最小例です。本番環境では、承認済み AMI の解決、変更差分の確認、Auto Scaling Group や rolling update を前提にしてください。
### IaCがもたらす本質的価値

**1. 冪等性（Idempotency）の保証**

冪等性とは、同じ操作を何度実行しても同じ結果が得られる性質です。宣言的IaCツールは、この冪等性を自動的に保証します。

```yaml
# 冪等性の実例
初期状態: インスタンス0台
1回目実行: 3台作成 → 結果: 3台
2回目実行: 変更なし → 結果: 3台（変わらず）
3回目実行: 変更なし → 結果: 3台（変わらず）

# 設定変更時
設定変更: instance_type を t3.large に変更
4回目実行: 3台を更新 → 結果: 3台（t3.large）
```

**2. バージョン管理による変更追跡**

インフラストラクチャをコードとして管理することで、ソフトウェア開発で培われたベストプラクティスを適用できます。

```bash
# Git でのインフラ変更管理
git log --oneline terraform/
# 出力例：
# a5f3c21 feat: Add auto-scaling for web servers
# 82b9e44 fix: Correct security group ingress rules
# 3d7a891 refactor: Extract RDS configuration to module
# f2c6b55 chore: Update instance types for cost optimization

# 特定の変更の詳細確認
git show a5f3c21
# 変更内容、理由、影響範囲が明確に記録される
```

**3. コラボレーションの促進**

```yaml
# プルリクエストでのインフラ変更レビュー
レビュープロセス:
  1. 変更案の作成:
     - ブランチで変更を実装
     - terraform plan の結果を確認

  2. プルリクエスト:
     - 変更の意図を説明
     - 影響範囲を明記
     - コスト影響を記載

  3. レビュー:
     - セキュリティチェック
     - ベストプラクティス確認
     - コスト最適化の検討

  4. 承認と適用:
     - 複数人による承認
     - 自動テストの通過
     - 本番環境への適用
```

### IaCの成熟度モデル

組織のIaC採用レベルを評価し、段階的な改善を図るための指標です。

```yaml
レベル1 - 手動運用:
  特徴:
    - GUI/CLIでの手動設定
    - ドキュメント化されていない
    - 再現性なし
  リスク:
    - ヒューマンエラー
    - 環境間の不整合
    - 障害復旧の遅延

レベル2 - スクリプト化:
  特徴:
    - シェルスクリプトでの部分自動化
    - 基本的なバージョン管理
    - 限定的な再現性
  改善点:
    - 手動作業の削減
    - 基本的な標準化

レベル3 - IaCツール導入:
  特徴:
    - Terraform/CloudFormation使用
    - コードレビュー実施
    - 環境別管理
  利点:
    - 宣言的管理
    - 状態管理
    - ドリフト検出

レベル4 - 完全自動化:
  特徴:
    - CI/CDパイプライン統合
    - 自動テスト実装
    - Policy as Code
  成果:
    - 継続的デリバリー
    - コンプライアンス自動化
    - セルフサービス化

レベル5 - GitOps:
  特徴:
    - Git as Single Source of Truth
    - Pull型デプロイメント
    - 継続的な同期
  最終形:
    - 完全な監査証跡
    - 自動ロールバック
    - 宣言的運用
```

### IaCのアンチパターンと対策

**1. 手動変更との混在（Configuration Drift）**

最も一般的で危険なアンチパターンは、IaCで管理されているリソースを手動で変更することです。

```hcl
# ドリフト検出と防止策
# 1. 定期的なドリフト検出
resource "null_resource" "drift_check" {
  provisioner "local-exec" {
    command = <<-EOT
      terraform plan -detailed-exitcode > /dev/null
      if [ $? -eq 2 ]; then
        echo "ALERT: Configuration drift detected!"
        # Slackやメールでアラート送信
      fi
    EOT
  }

  triggers = {
    # 1時間ごとに実行
    time = timestamp()
  }
}

# 2. AWS Config Rules による監視
resource "aws_config_config_rule" "terraform_managed" {
  name = "terraform-managed-resources"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "ManagedBy"
    tag1Value = "Terraform"
  })

  # タグがない（手動作成された）リソースを検出
}

# 3. IAMポリシーによる手動変更の防止
data "aws_iam_policy_document" "prevent_manual_changes" {
  statement {
    effect = "Deny"
    actions = [
      "ec2:RunInstances",
      "ec2:TerminateInstances",
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "ec2:ModifyInstanceAttribute",
      "rds:CreateDBInstance",
      "rds:DeleteDBInstance",
      "rds:ModifyDBInstance",
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:PutBucketPolicy"
    ]
    resources = ["*"]

    condition {
      test     = "StringNotLike"
      variable = "aws:PrincipalArn"
      values   = ["arn:aws:iam::*:role/terraform-executor"]
    }

    # Terraform実行ユーザー以外の変更を拒否
  }
}

注記: 実運用では、対象リソースの ARN / タグ条件 / 例外ロールを組み合わせ、拒否対象を「手動変更で問題になる操作」に限定して設計する。`aws:PrincipalArn` のような安定した識別子を使うと、Assumed Role のセッション差分に影響されにくい。
```

**2. 状態ファイルの不適切な管理**

Terraformの状態ファイルは、実際のインフラストラクチャとコードをマッピングする重要な情報です。

```hcl
# リモートバックエンドの適切な設定
terraform {
  backend "s3" {
    # 状態ファイルの保存先
    bucket = "terraform-state-bucket"
    key    = "prod/infrastructure/terraform.tfstate"
    region = "ap-northeast-1"

    # 暗号化
    encrypt = true
    kms_key_id = "arn:aws:kms:ap-northeast-1:123456789012:key/abcd1234"

    # 状態ロック
    dynamodb_table = "terraform-state-lock"

    # アクセス制御
    acl = "bucket-owner-full-control"
  }
}

# DynamoDBテーブル（状態ロック用）
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Environment = "shared"
  }
}
```

注記: S3 backend ブロックに `versioning = true` を書いても、バケット自体の versioning 設定にはなりません。履歴保持を有効にする場合は、S3 バケット側で versioning を設定し、その状態を別リソースまたは事前設定で管理してください。

Verify: shared backend を使う前に、`aws s3api get-bucket-versioning --bucket terraform-state-bucket`、`aws s3api get-bucket-encryption --bucket terraform-state-bucket`、`aws dynamodb describe-table --table-name terraform-state-lock` などで、versioning・暗号化・lock table が期待どおり有効かを確認してください。

Risk: backend bucket の versioning / encryption や lock table が未設定のまま shared state を使うと、rollback と同時実行制御の前提が崩れます。backend 側の安全設定は `terraform init` が通るだけでは満たしたことになりません。

Risk: この `null_resource` は `terraform apply` 時にのみ評価されます。1時間ごとの定期チェックを意図する場合は、GitHub Actions の `schedule` や EventBridge など、外部 scheduler から `plan` / `apply` を起動する前提を明示してください。

注記: この `null_resource` は drift 検出の概念例です。実運用では同じ state に `timestamp()` で差分を生むより、CI や定期ジョブから `terraform plan -refresh-only -detailed-exitcode` を実行して state だけを最新化し、コードへ戻す変更は通常の `plan` / `apply` でレビューして適用する方が安全です。

**3. モノリシックな構成**

すべてのインフラストラクチャを単一の巨大な構成で管理すると、様々な問題が発生します。

```hcl
# 適切なモジュール分割
# ディレクトリ構造
terraform/
├── modules/
│   ├── networking/
│   │   ├── variables.tf
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── compute/
│   │   └── ...
│   ├── database/
│   │   └── ...
│   └── security/
│       └── ...
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   └── ...
│   └── prod/
│       └── ...
└── global/
    ├── iam/
    └── route53/

# モジュールの使用例
module "network" {
  source = "../../modules/networking"

  environment         = var.environment
  cidr_block         = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names

  enable_nat_gateway = var.environment == "prod" ? true : false
  single_nat_gateway = var.environment != "prod" ? true : false
}

module "compute" {
  source = "../../modules/compute"

  environment    = var.environment
  subnet_ids     = module.network.private_subnet_ids
  instance_type  = var.instance_types[var.environment]
  instance_count = var.instance_counts[var.environment]

  depends_on = [module.network]
}
```

## 10.2 Terraformによるインフラ構築の実践

### Terraformの設計哲学と内部動作

Terraformは、HashiCorpが開発した最も人気のあるIaCツールです。その設計哲学を深く理解することで、より効果的な利用が可能になります。

**リソースグラフとプランニング**

Terraformは内部的に、すべてのリソースとその依存関係を有向非巡回グラフ（DAG）として管理します。

```hcl
# 依存関係の自動解決
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id  # 暗黙的な依存関係

  tags = {
    Name = "${var.project}-igw"
  }
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${var.availability_zones[count.index]}"
    Type = "Public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id

  # Terraformは自動的に以下の順序で作成：
  # 1. VPC
  # 2. Internet Gateway, Subnets (並列実行可能)
  # 3. Route Table
  # 4. Route Table Associations
}
```

### 実践的なモジュール設計

再利用可能で保守性の高いモジュールの設計は、大規模インフラストラクチャ管理の鍵です。

**完全なVPCモジュールの実装**

```hcl
# modules/vpc/variables.tf
variable "project_name" {
  description = "プロジェクト名"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "環境名"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_cidr" {
  description = "VPCのCIDRブロック"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "使用するAZ"
  type        = list(string)
  default     = []
}

variable "enable_nat_gateway" {
  description = "NAT Gatewayを有効にするか"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "NAT Gatewayを1つだけ作成するか"
  type        = bool
  default     = false
}

variable "enable_vpn_gateway" {
  description = "VPN Gatewayを有効にするか"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "VPC Flow Logsを有効にするか"
  type        = bool
  default     = true
}

# modules/vpc/main.tf
locals {
  azs = length(var.availability_zones) > 0 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, 3)

  # サブネット計算
  # パブリック: /24 × AZ数
  # プライベート: /24 × AZ数
  # データベース: /24 × AZ数
  public_cidrs   = [for i in range(length(local.azs)) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_cidrs  = [for i in range(length(local.azs)) : cidrsubnet(var.vpc_cidr, 8, i + 10)]
  database_cidrs = [for i in range(length(local.azs)) : cidrsubnet(var.vpc_cidr, 8, i + 20)]

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(local.azs)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-${local.azs[count.index]}"
    Type = "Public"
    "kubernetes.io/role/elb" = "1"  # EKS用タグ
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-${local.azs[count.index]}"
    Type = "Private"
    "kubernetes.io/role/internal-elb" = "1"  # EKS用タグ
  })
}

# Database Subnets
resource "aws_subnet" "database" {
  count = length(local.azs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.database_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-database-${local.azs[count.index]}"
    Type = "Database"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(local.azs)) : 0

  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.this]
}

# NAT Gateways
resource "aws_nat_gateway" "this" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(local.azs)) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.this]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
    Type = "Public"
  })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(local.azs)) : 0

  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
    Type = "Private"
  })
}

resource "aws_route_table" "isolated" {
  count = var.enable_nat_gateway ? 0 : 1

  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-isolated-rt"
    Type = "Isolated"
  })
}

resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(local.azs)) : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = var.single_nat_gateway ? aws_nat_gateway.this[0].id : aws_nat_gateway.this[count.index].id
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.enable_nat_gateway ? (var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id) : aws_route_table.isolated[0].id
}

resource "aws_route_table_association" "database" {
  count = length(aws_subnet.database)

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = var.enable_nat_gateway ? (var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id) : aws_route_table.isolated[0].id
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# VPC Flow Logs
resource "aws_flow_log" "this" {
  count = var.enable_flow_logs ? 1 : 0

  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-flow-logs"
  })
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name              = "/aws/vpc/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.project_name}-${var.environment}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:ec2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:vpc-flow-log/*"
        }
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.project_name}-${var.environment}-flow-logs-policy"
  role = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Effect = "Allow"
      Resource = "*"
    }]
  })
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "VPCのID"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPCのCIDRブロック"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "パブリックサブネットのIDリスト"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "プライベートサブネットのIDリスト"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "データベースサブネットのIDリスト"
  value       = aws_subnet.database[*].id
}

output "nat_gateway_ids" {
  description = "NAT GatewayのIDリスト"
  value       = aws_nat_gateway.this[*].id
}

output "availability_zones" {
  description = "使用されているAZのリスト"
  value       = local.azs
}
```

### 環境別構成管理のベストプラクティス

**Terraformワークスペース vs ディレクトリ構造**

```hcl
# ワークスペースを使った環境管理
# 利点：単一の設定ファイルで複数環境を管理
# 欠点：環境間の差異が大きい場合に複雑化

locals {
  # ワークスペース名から環境を判定
  environment = terraform.workspace

  # 環境別設定
  instance_types = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }

  instance_counts = {
    dev     = 1
    staging = 2
    prod    = 4
  }

  enable_monitoring = {
    dev     = false
    staging = true
    prod    = true
  }
}

# ディレクトリベースの環境管理（推奨）
# environments/prod/main.tf
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = "prod"
  vpc_cidr          = "10.0.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = false  # 高可用性のため各AZにNAT Gateway
  enable_flow_logs   = true
}

module "compute" {
  source = "../../modules/compute"

  project_name    = var.project_name
  environment     = "prod"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  instance_type   = "t3.large"
  instance_count  = 4

  # 本番環境固有の設定
  enable_monitoring          = true
  enable_detailed_monitoring = true
  enable_auto_recovery      = true
}

# environments/dev/main.tf
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = "dev"
  vpc_cidr          = "10.100.0.0/16"  # 本番と異なるCIDR
  enable_nat_gateway = true
  single_nat_gateway = true   # コスト削減のため1つのみ
  enable_flow_logs   = false  # 開発環境では不要
}
```

### 高度なTerraform機能の活用

**Dynamic Blocksによる柔軟な設定**

```hcl
# セキュリティグループの動的ルール生成
variable "security_group_rules" {
  description = "セキュリティグループルール"
  type = list(object({
    type        = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

resource "aws_security_group" "this" {
  name        = "${var.project_name}-${var.environment}-sg"
  description = "Security group for ${var.project_name}"
  vpc_id      = var.vpc_id

  # 動的なインバウンドルール
  dynamic "ingress" {
    for_each = [for rule in var.security_group_rules : rule if rule.type == "ingress"]

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  # 動的なアウトバウンドルール
  dynamic "egress" {
    for_each = [for rule in var.security_group_rules : rule if rule.type == "egress"]

    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  # デフォルトのアウトバウンドルール
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  # 注記: ここでは分かりやすさを優先して全 outbound を許可しています。
  # 実運用では VPC Endpoint、社内プロキシ、SaaS allowlist など実際に必要な宛先へ絞る方が監査しやすくなります。

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-sg"
  })
}
```

**条件式とfor式の組み合わせ**

```hcl
# 複雑な条件に基づくリソース作成
locals {
  # 本番環境のみマルチAZ、それ以外はシングルAZ
  db_azs = var.environment == "prod" ? var.availability_zones : [var.availability_zones[0]]

  # インスタンスタグの生成
  instance_tags = merge(
    var.common_tags,
    {
      for i in range(var.instance_count) :
      "Instance${i}" => "web-${var.environment}-${i + 1}"
    }
  )

  # 環境別のバックアップスケジュール
  backup_schedules = {
    prod = {
      frequency = "daily"
      retention = 30
      time      = "03:00"
    }
    staging = {
      frequency = "weekly"
      retention = 7
      time      = "03:00"
    }
    dev = null  # 開発環境はバックアップなし
  }
}

# RDSクラスターの条件付き作成
resource "aws_rds_cluster" "this" {
  count = var.create_database ? 1 : 0

  cluster_identifier = "${var.project_name}-${var.environment}-cluster"
  engine             = "aurora-mysql"
  engine_version     = var.engine_version

  # 環境によって異なる設定
  availability_zones = local.db_azs

  # バックアップ設定
  backup_retention_period         = try(local.backup_schedules[var.environment].retention, 1)
  preferred_backup_window        = try(local.backup_schedules[var.environment].time, "03:00-04:00")
  enabled_cloudwatch_logs_exports = var.environment == "prod" ? ["error", "general", "slowquery"] : []

  # 全環境で暗号化し、本番はカスタム KMS を使う
  storage_encrypted = true
  kms_key_id       = var.environment == "prod" ? aws_kms_key.rds[0].arn : null

  # 本番環境のみ削除保護
  deletion_protection = var.environment == "prod"

  dynamic "scaling_configuration" {
    for_each = var.serverless ? [1] : []

    content {
      auto_pause               = var.environment != "prod"
      min_capacity            = var.environment == "prod" ? 2 : 1
      max_capacity            = var.environment == "prod" ? 16 : 4
      seconds_until_auto_pause = 300
    }
  }

  tags = var.common_tags
}
```

### Terraformの状態管理上級テクニック

**状態の分割とリモート参照**

```hcl
# ネットワーク層の状態を参照
data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "terraform-state-bucket"
    key    = "env/${var.environment}/network/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

# 共有リソースの状態を参照
data "terraform_remote_state" "shared" {
  backend = "s3"

  config = {
    bucket = "terraform-state-bucket"
    key    = "global/shared/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

# 参照した状態からの値の使用
resource "aws_instance" "app" {
  subnet_id              = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [data.terraform_remote_state.network.outputs.app_security_group_id]
  iam_instance_profile   = data.terraform_remote_state.shared.outputs.ec2_instance_profile_name

  # ...
}
```

注記: `terraform_remote_state` は参照先 state 全体の読取権限に近い扱いになることがあります。共有する output は非機密値に限定し、機密情報の受け渡しには SSM Parameter Store、Secrets Manager、DNS、S3 object など用途を分けた公開先を使う方が権限分離しやすくなります。

Verify: `terraform_remote_state` を使う前に、producer 側の `output` 定義を見直し、共有対象が本当に非機密値だけかを確認してください。あわせて、consumer 側ロールが backend bucket 全体ではなく必要な state object path だけを読める設計になっているかも確認する方が安全です。

**状態の移行とリファクタリング**

> **Risk**
> `terraform import` / `terraform state mv` / `terraform state rm` は state を直接変更するため、実行前に `terraform state pull` などでバックアップを取得し、lock を保持した状態で検証環境から先に試してください。各操作の直後には `terraform plan` を実行し、差分が意図どおりであることを確認してから本番 state に適用します。
>
> `terraform state pull > backup-$(date +%Y%m%d%H%M%S)-${USER}-$(git rev-parse --short HEAD).tfstate` のように時刻・実行者・commit を含めた退避を残しておくと、rollback と監査がしやすくなります。`terraform force-unlock` は、別の `plan` / `apply` が走っていないことを確認できた場合に限定してください。`state mv/rm/import` 後は `terraform state list` と `terraform state show <resource>` で対象だけが意図どおり移動したことも確認します。

```bash
# 既存リソースのインポート
terraform import aws_instance.legacy i-1234567890abcdef0

# リソースの移動（リファクタリング）
terraform state mv aws_instance.old aws_instance.new
terraform state mv aws_instance.web module.compute.aws_instance.web

# モジュール間の移動
terraform state mv module.old.aws_vpc.main module.network.aws_vpc.main

# 状態からの削除（実リソースは削除されない）
terraform state rm aws_instance.temp

# 状態の一覧表示
terraform state list

# 特定リソースの詳細表示
terraform state show aws_instance.web
```

## 10.3 Ansibleによる構成管理の基礎

### 構成管理の本質と必要性

Infrastructure as Codeがインフラストラクチャをプロビジョニングするのに対し、構成管理ツールはそのインフラストラクチャ上でアプリケーションを動作させるための設定を行います。

```yaml
# IaCと構成管理の責任分担
Infrastructure as Code (Terraform):
  - ネットワークの作成
  - サーバーのプロビジョニング
  - ロードバランサーの設定
  - データベースの作成
  - セキュリティグループの定義

Configuration Management (Ansible):
  - OSの設定とハードニング
  - ミドルウェアのインストール
  - アプリケーションのデプロイ
  - 設定ファイルの管理
  - ユーザーと権限の管理
```

### Ansibleのアーキテクチャと特徴

Ansibleは、エージェントレスで動作し、SSHを通じて管理対象ノードを制御します。この設計により、追加のソフトウェアインストールが不要で、既存環境への導入が容易です。

**Playbookの構造と設計**

```yaml
---
# site.yml - マスターPlaybook
- name: Common configuration for all servers
  hosts: all
  become: yes
  roles:
    - common
    - security

- name: Configure web servers
  hosts: webservers
  become: yes
  roles:
    - nginx
    - app-deploy
  vars:
    app_version: "{% raw %}{{ lookup('env', 'APP_VERSION') | default('approved-release-tag', true) }}{% endraw %}"

- name: Configure database servers
  hosts: databases
  become: yes
  roles:
    - postgresql
    - backup

# group_vars/all.yml - 全ホスト共通変数
---
ntp_servers:
  - ntp.nict.jp
  - ntp.jst.mfeed.ad.jp

timezone: Asia/Tokyo

security_ssh_port: 22
security_ssh_password_authentication: "no"
security_ssh_permit_root_login: "no"

# group_vars/webservers.yml - Webサーバー用変数
---
nginx_worker_processes: "{% raw %}{{ ansible_processor_vcpus }}{% endraw %}"
nginx_worker_connections: 2048

app_user: webapp
app_group: webapp
app_home: /var/www/app
app_port: 3000

# group_vars/production.yml - 本番環境用変数
---
nginx_server_tokens: "off"
nginx_ssl_protocols: "TLSv1.2 TLSv1.3"
nginx_ssl_ciphers: "HIGH:!aNULL:!MD5"

enable_monitoring: true
enable_log_shipping: true
```

**高度なRole設計**

```yaml
# roles/nginx/tasks/main.yml
---
- name: Include OS-specific variables
  include_vars: "{% raw %}{{ ansible_os_family }}{% endraw %}.yml"

- name: Install Nginx
  package:
    name: "{% raw %}{{ nginx_package_name }}{% endraw %}"
    state: present
  notify: restart nginx

- name: Create Nginx directories
  file:
    path: "{% raw %}{{ item }}{% endraw %}"
    state: directory
    owner: root
    group: root
    mode: '0755'
  loop:
    - /etc/nginx/sites-available
    - /etc/nginx/sites-enabled
    - /etc/nginx/ssl
    - /var/log/nginx

- name: Generate DH parameters
  openssl_dhparam:
    path: /etc/nginx/ssl/dhparams.pem
    size: 2048
  when: nginx_use_ssl | default(false)

- name: Configure Nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
    validate: 'nginx -t -c %s'
  notify: reload nginx

- name: Configure virtual hosts
  template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{% raw %}{{ item.name }}{% endraw %}"
    owner: root
    group: root
    mode: '0644'
  loop: "{% raw %}{{ nginx_vhosts }}{% endraw %}"
  when: nginx_vhosts is defined
  notify: reload nginx

- name: Enable virtual hosts
  file:
    src: "/etc/nginx/sites-available/{% raw %}{{ item.name }}{% endraw %}"
    dest: "/etc/nginx/sites-enabled/{% raw %}{{ item.name }}{% endraw %}"
    state: link
  loop: "{% raw %}{{ nginx_vhosts }}{% endraw %}"
  when: nginx_vhosts is defined
  notify: reload nginx

- name: Remove default site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Ensure Nginx is running
  systemd:
    name: nginx
    state: started
    enabled: yes
    daemon_reload: yes

# roles/nginx/templates/nginx.conf.j2
user {% raw %}{{ nginx_user }}{% endraw %};
worker_processes {% raw %}{{ nginx_worker_processes }}{% endraw %};
pid /run/nginx.pid;

events {
    worker_connections {% raw %}{{ nginx_worker_connections }}{% endraw %};
    multi_accept on;
    use epoll;
}

http {
    # 基本設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens {% raw %}{{ nginx_server_tokens | default('on') }}{% endraw %};

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL設定
    {% raw %}{% if nginx_use_ssl | default(false) %}
    ssl_protocols {{ nginx_ssl_protocols }};
    ssl_ciphers {{ nginx_ssl_ciphers }};
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    {% endif %}{% endraw %}

    # ログ設定
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;

    # バーチャルホスト設定
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}

# roles/nginx/handlers/main.yml
---
- name: restart nginx
  systemd:
    name: nginx
    state: restarted
  when: nginx_restart_on_change | default(true)

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
  when: nginx_reload_on_change | default(true)

- name: validate nginx configuration
  command: nginx -t
  changed_when: false
```

### 動的インベントリとクラウド統合

クラウド環境では、インスタンスが動的に作成・削除されるため、静的なインベントリファイルでは管理が困難です。

```python
#!/usr/bin/env python3
# dynamic_inventory_aws.py

import json
import boto3
from collections import defaultdict

class AWSInventory:
    def __init__(self):
        self.inventory = defaultdict(lambda: {'hosts': [], 'vars': {}})
        self.inventory['_meta'] = {'hostvars': {}}

    def get_instances(self):
        """EC2インスタンスを取得してインベントリを構築"""
        ec2 = boto3.client('ec2', region_name='ap-northeast-1')

        # 実行中のインスタンスを取得
        response = ec2.describe_instances(
            Filters=[
                {'Name': 'instance-state-name', 'Values': ['running']}
            ]
        )

        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                self._add_instance(instance)

    def _add_instance(self, instance):
        """インスタンスをインベントリに追加"""
        instance_id = instance['InstanceId']

        # プライベートIPアドレスを使用（VPC内通信）
        private_ip = instance.get('PrivateIpAddress')
        if not private_ip:
            return

        # タグからグループを決定
        tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}

        # 環境グループ
        environment = tags.get('Environment', 'unknown')
        self.inventory[environment]['hosts'].append(private_ip)

        # 役割グループ
        role = tags.get('Role', 'unknown')
        self.inventory[role]['hosts'].append(private_ip)

        # 組み合わせグループ
        combined_group = f"{environment}_{role}"
        self.inventory[combined_group]['hosts'].append(private_ip)

        # ホスト変数
        self.inventory['_meta']['hostvars'][private_ip] = {
            'instance_id': instance_id,
            'instance_type': instance['InstanceType'],
            'availability_zone': instance['Placement']['AvailabilityZone'],
            'private_dns_name': instance.get('PrivateDnsName', ''),
            'tags': tags,
            'ansible_host': private_ip,
            'ansible_ssh_private_key_file': f"~/.ssh/{environment}.pem"
        }

        # 特別な設定
        if role == 'bastion':
            self.inventory['_meta']['hostvars'][private_ip]['ansible_ssh_common_args'] = '-o ProxyCommand="none"'
        else:
            # 踏み台経由の接続
            bastion_ip = self._get_bastion_ip(environment)
            if bastion_ip:
                self.inventory['_meta']['hostvars'][private_ip]['ansible_ssh_common_args'] = \
                    f'-o ProxyCommand="ssh -W %h:%p -q ubuntu@{bastion_ip}"'

    def _get_bastion_ip(self, environment):
        """踏み台サーバーのIPを取得"""
        bastion_group = f"{environment}_bastion"
        if bastion_group in self.inventory and self.inventory[bastion_group]['hosts']:
            return self.inventory[bastion_group]['hosts'][0]
        return None

    def get_inventory(self):
        """インベントリをJSON形式で返す"""
        self.get_instances()
        return json.dumps(self.inventory, indent=2)

if __name__ == '__main__':
    inventory = AWSInventory()
    print(inventory.get_inventory())
```

### 冪等性の確保とベストプラクティス

冪等性は構成管理において最も重要な概念です。同じPlaybookを何度実行しても、システムの状態が同じになることを保証します。

```yaml
# 冪等性を保証する書き方の例
---
- name: 冪等性のあるタスク例
  hosts: all
  become: yes

  tasks:
    # GOOD: 冪等性あり - ファイルが既に存在すれば変更なし
    - name: Create application directory
      file:
        path: /opt/myapp
        state: directory
        owner: myapp
        group: myapp
        mode: '0755'

    # GOOD: 冪等性あり - 行が既に存在すれば追加しない
    - name: Add configuration line
      lineinfile:
        path: /etc/sysctl.conf
        line: 'vm.swappiness=10'
        state: present

    # GOOD: 冪等性あり - パッケージが既にインストール済みなら何もしない
    - name: Install required packages
      package:
        name:
          - git
          - python3-pip
          - nginx
        state: present

    # BAD: 冪等性なし - 実行するたびにファイルに追記される
    - name: Append to log file (非推奨)
      shell: echo "Deployment at $(date)" >> /var/log/deploy.log

    # GOOD: 上記の冪等性のある代替案
    - name: Record deployment
      copy:
        content: "Last deployment: `{{ ansible_date_time.iso8601 }}`\n"
        dest: /var/log/last_deploy.log
        owner: root
        group: root
        mode: '0644'

    # 条件付き実行で冪等性を確保
    - name: Initialize database
      command: /opt/myapp/bin/init_db.sh
      args:
        creates: /opt/myapp/db/.initialized
      # .initializedファイルが存在する場合は実行しない

    # チェックモードでの動作確認
    - name: Configure service
      template:
        src: myapp.service.j2
        dest: /etc/systemd/system/myapp.service
      register: service_config
      check_mode: yes

    - name: Reload systemd if needed
      systemd:
        daemon_reload: yes
      when: service_config.changed
```

### セキュアな変数管理

機密情報を安全に管理するため、Ansible Vaultを活用します。

```yaml
# Vault暗号化されたファイルの作成
# ansible-vault create vars/secrets.yml

# 平文の secrets.yml
---
database_password: "super-secret-password"
api_keys:
  stripe: "sk_live_..."
  aws_access_key: "AKIA..."
  aws_secret_key: "..."

# 暗号化後
$ANSIBLE_VAULT;1.1;AES256
39613836386435386...（暗号化されたデータ）

# Playbookでの使用
---
- name: Deploy application with secrets
  hosts: webservers
  vars_files:
    - vars/common.yml
    - vars/secrets.yml  # Vault暗号化されたファイル

  tasks:
    - name: Create database configuration
      template:
        src: database.yml.j2
        dest: "{% raw %}{{ app_home }}{% endraw %}/config/database.yml"
        owner: "{% raw %}{{ app_user }}{% endraw %}"
        group: "{% raw %}{{ app_group }}{% endraw %}"
        mode: '0600'  # 機密情報のため厳格な権限
      no_log: true    # ログに機密情報を出力しない

# templates/database.yml.j2
production:
  adapter: postgresql
  encoding: unicode
  database: {% raw %}{{ database_name }}{% endraw %}
  pool: {% raw %}{{ database_pool | default(5) }}{% endraw %}
  username: {% raw %}{{ database_user }}{% endraw %}
  password: {% raw %}{{ database_password }}{% endraw %}  # Vaultから取得
  host: {% raw %}{{ database_host }}{% endraw %}
  port: {% raw %}{{ database_port | default(5432) }}{% endraw %}

# 実行時
# ansible-playbook -i inventory site.yml --ask-vault-pass
# または
# ansible-playbook -i inventory site.yml --vault-password-file ~/.vault_pass
```

Risk: `~/.vault_pass` のような長寿命ファイルを使う場合は、repository 配下や共有ホームディレクトリに平文で置かないでください。少なくとも `chmod 600` を適用し、CI/CD や共用端末では一時ファイル方式へ寄せる方が安全です。

Cleanup: 学習用に作成した `~/.vault_pass` や平文 `secrets.yml` が残っていないかを確認し、不要になったら削除または安全な保管先へ移してください。誤って VCS 管理下へ入っていないかも合わせて確認してください。

## 10.4 CI/CDパイプラインとデプロイ自動化

### CI/CDの本質と価値

継続的インテグレーション（CI）と継続的デリバリー（CD）は、ソフトウェア開発のスピードと品質を両立させるための方法論です。インフラストラクチャのコード化により、これらの実践をインフラ管理にも適用できるようになりました。

**CI/CDパイプラインの設計原則**

```yaml
パイプライン設計の原則:
  高速フィードバック:
    - 問題の早期発見
    - 10分以内の基本的なフィードバック
    - 段階的な詳細検証

  自動化の徹底:
    - 手動プロセスの排除
    - 一貫性の確保
    - ヒューマンエラーの防止

  段階的なリスク管理:
    - 環境を段階的に昇格
    - 各段階での検証強化
    - ロールバック可能性の確保

  監査証跡:
    - すべての変更の記録
    - 承認プロセスの可視化
    - コンプライアンス対応
```

### 包括的なCI/CDパイプラインの実装

**GitHub Actionsによる完全自動化**

注記: ここでは PR ごとの使い捨て検証環境を前提にしています。`terraform apply -auto-approve` や `terraform destroy -auto-approve` を共有環境や本番相当環境へそのまま適用せず、隔離 backend / workspace、TTL タグ、承認フローを組み合わせてください。

最低限の確認項目:

- `terraform plan` の差分を artifact として保存し、レビュー対象に含める
- PR ごとに backend / workspace / state lock が分離されていることを確認する
- `destroy` が失敗したときに備えて、TTL タグと手動 cleanup 手順を runbook に残す

```yaml
# .github/workflows/infrastructure-pipeline.yml
name: Infrastructure CI/CD Pipeline

on:
  pull_request:
    branches: [main]
    paths:
      - 'terraform/**'
      - 'ansible/**'
  push:
    branches: [main]
    paths:
      - 'terraform/**'
      - 'ansible/**'

env:
  TF_VERSION: '1.5.0'
  ANSIBLE_VERSION: '2.15.0'
  TFLINT_VERSION: {% raw %}${{ vars.TFLINT_VERSION }}{% endraw %}
  TERRASCAN_VERSION: {% raw %}${{ vars.TERRASCAN_VERSION }}{% endraw %}
  TERRASCAN_SHA256: {% raw %}${{ vars.TERRASCAN_SHA256 }}{% endraw %}
  AWS_REGION: 'ap-northeast-1'

permissions:
  contents: read

jobs:
  # 1. 静的解析とlint
  static-analysis:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: {% raw %}${{ env.TF_VERSION }}{% endraw %}

      - name: Terraform Format Check
        run: |
          cd terraform
          terraform fmt -check -recursive

      - name: Terraform Validate
        run: |
          cd terraform
          for dir in $(find . -type f -name "*.tf" -exec dirname {} \; | sort -u); do
            echo "Validating $dir"
            (cd "$dir" && terraform init -backend=false -input=false && terraform validate)
          done

      - name: TFLint
        uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: {% raw %}${{ env.TFLINT_VERSION }}{% endraw %}

      - name: Run TFLint
        run: |
          cd terraform
          tflint --init
          tflint --recursive

      - name: Setup Python
        uses: actions/setup-python@v6
        with:
          python-version: '3.11'

      - name: Install Ansible and ansible-lint
        run: |
          pip install ansible=={% raw %}${{ env.ANSIBLE_VERSION }}{% endraw %} ansible-lint

      - name: Ansible Lint
        run: |
          cd ansible
          ansible-lint

  # 2. セキュリティスキャン
  security-scan:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Checkov Security Scan
        id: checkov
        uses: bridgecrewio/checkov-action@v12.3080.0
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: reports/checkov.sarif

      - name: Upload Checkov results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: reports/checkov.sarif

      - name: Terrascan
        run: |
          wget https://github.com/tenable/terrascan/releases/download/{% raw %}${{ env.TERRASCAN_VERSION }}{% endraw %}/terrascan_Linux_x86_64.tar.gz
          echo "{% raw %}${{ env.TERRASCAN_SHA256 }}{% endraw %}  terrascan_Linux_x86_64.tar.gz" | sha256sum -c -
          tar -xf terrascan_Linux_x86_64.tar.gz
          ./terrascan scan -i terraform -d terraform/

      - name: Secrets Scan
        uses: trufflesecurity/trufflehog@<固定タグまたはcommit SHA>
        with:
          path: ./
          base: {% raw %}${{ github.event.repository.default_branch }}{% endraw %}
          head: HEAD

> 注意
> `latest` / `main` / `releases/latest` のような可変参照は、lint や scan の結果を時点依存にします。実務では固定版を repository variables か workflow `env` で管理し、`uses:` の action 参照も固定タグまたは commit SHA へ寄せてください。配布物を直接ダウンロードする場合は checksum もあわせて検証し、更新時は差分レビューと scan 結果の再確認を必ず行います。

注記: Ansible や Terraform へ渡す `APP_VERSION` も同じ考え方で扱います。サンプルの `approved-release-tag` は説明用のプレースホルダであり、実環境では承認済みの固定タグまたは digest を CI/CD から注入してください。

  # 3. コスト見積もり
  cost-estimation:
    runs-on: ubuntu-24.04
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Infracost
        uses: infracost/setup-infracost@v2
        with:
          api-key: {% raw %}${{ secrets.INFRACOST_API_KEY }}{% endraw %}

      - name: Generate Infracost JSON
        run: |
          cd terraform/environments/prod
          infracost breakdown --path . \
            --format json \
            --out-file /tmp/infracost.json

      - name: Post Infracost comment
        uses: infracost/infracost-comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update

  # 4. Terraformプラン（PR時）
  terraform-plan:
    needs: [static-analysis, security-scan]
    runs-on: ubuntu-24.04
    if: github.event_name == 'pull_request'
    strategy:
      matrix:
        environment: [dev, staging, prod]
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    env:
      TF_INPUT: 0

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}{% endraw %}
          aws-region: {% raw %}${{ env.AWS_REGION }}{% endraw %}

注記: OIDC で AWS ロールを引き受ける job では、workflow または job に `permissions: id-token: write` が必要です。AWS 側の trust policy も `token.actions.githubusercontent.com:aud = sts.amazonaws.com` と、`sub = repo:<org>/<repo>:ref:refs/heads/<branch>`、`repo:<org>/<repo>:environment:<env>`、`repo:<org>/<repo>:pull_request` のどれを許可するのかを trigger ごとに固定してください。GitHub Environment を使う場合は保護ルールも合わせて設定し、PR / branch / Environment で role を分けるか、少なくとも claim を実測してから条件を確定させます。
注記: `terraform plan` と `terraform apply` を同じ OIDC role へ集約せず、少なくとも read-only に近い plan 用 role と、承認後だけ使う apply 用 role を分離する方が安全です。`iam:PassRole` や state backend 更新を伴う権限は apply 側へ寄せ、PR job へは不要な変更権限を渡さないようにします。

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: {% raw %}${{ env.TF_VERSION }}{% endraw %}

      - name: Terraform Init
        run: |
          cd terraform/environments/{% raw %}${{ matrix.environment }}{% endraw %}
          terraform init -input=false -lockfile=readonly

      - name: Terraform Plan
        id: plan
        run: |
          cd terraform/environments/{% raw %}${{ matrix.environment }}{% endraw %}
          terraform plan -input=false -out=tfplan

注記: `tfplan` はジョブ内ローカルファイルです。承認後に別ジョブで `apply` する構成では、`actions/upload-artifact` などで plan artifact を受け渡すか、同じ commit / provider lock / backend を前提に再計画してください。レビューした差分と実際に適用する差分がずれないことを確認する運用が必要です。

注記: plan と apply を別ジョブへ分ける場合、`tfplan` 単体では実行環境差を吸収できません。working directory の相対パス、OS/CPU arch、`.terraform.lock.hcl`、必要なら `.terraform/` を含む provider/plugin 状態を揃えるか、apply 側で再度 `terraform plan -input=false -out=tfplan` して承認し直す前提を明示してください。CI 全体で `-input=false` または `TF_INPUT=0` を統一して、対話入力待ちによる drift も避けます。

注記: provider の解決結果も再現性に影響します。`.terraform.lock.hcl` を repository に含め、通常の CI では `terraform init -input=false -lockfile=readonly` を使うと、意図しない provider 更新を検出しやすくなります。provider 更新は lockfile diff をレビューしてから別 PR で行う方が安全です。

      - name: Create Plan Summary
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        env:
          ENVIRONMENT: {% raw %}${{ matrix.environment }}{% endraw %}
        with:
          script: |
            const envName = process.env.ENVIRONMENT;
            const plan = require('child_process').execSync(
              'terraform show -no-color tfplan',
              { cwd: 'terraform/environments/' + envName, encoding: 'utf8' }
            );
            const summaryLine = plan.split('\\n').find(line => line.startsWith('Plan:')) || 'Plan summary not found';
            const resourceLines = plan
              .split('\\n')
              .filter(line => line.startsWith('# '))
              .slice(0, 10)
              .map(line => '- ' + line.replace(/^#\\s+/, ''));

            const output = [
              '#### Terraform Plan - ' + envName + ' 📋',
              '',
              '- Summary: ' + summaryLine,
              ...(resourceLines.length ? ['', '主要な変更候補:', ...resourceLines] : []),
              '',
              '*Pushed by: @' + process.env.GITHUB_ACTOR + ', Action: ' + process.env.GITHUB_EVENT_NAME + '*',
            ].join('\\n');

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

注記: PR コメントへ `terraform show -no-color tfplan` を全文転載すると、IAM、ネットワーク、命名規則、内部トポロジまで恒久的に残りやすくなります。レビュー面には追加 / 変更 / 削除件数と主な resource 一覧だけを載せ、全文は短期保持 artifact か限定閲覧の check 結果へ分離する方が安全です。

  # 5. 統合テスト環境の構築
  integration-test:
    needs: terraform-plan
    runs-on: ubuntu-24.04
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      id-token: write
    env:
      TF_INPUT: 0
    concurrency:
      group: preview-pr-{% raw %}${{ github.event.pull_request.number }}{% endraw %}
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}${{ secrets.AWS_TEST_ROLE }}{% endraw %}
          aws-region: {% raw %}${{ env.AWS_REGION }}{% endraw %}

      - name: Create Test Environment
        id: test-env
        run: |
          cd terraform/environments/test
          terraform init -input=false -lockfile=readonly
          terraform plan -input=false -out=pr.tfplan \
            -var="pr_number={% raw %}${{ github.event.pull_request.number }}{% endraw %}"
          terraform apply -input=false pr.tfplan

          # 出力値を環境変数に設定
          echo "test_url=$(terraform output -raw test_environment_url)" >> $GITHUB_OUTPUT

      - name: Run Integration Tests
        run: |
          cd tests/integration
          npm ci
          npm run test:integration -- \
            --url "{% raw %}${{ steps.test-env.outputs.test_url }}{% endraw %}"

注記: `npm ci` は lockfile 前提です。テスト用 package を別ディレクトリに分ける場合も、`package-lock.json` を repository に含め、CI と手元で同じ依存版を再現できるようにしてください。
注記: `terraform output -raw test_environment_url` を受け取った直後は ALB / DNS / アプリ初期化がまだ完了していないことがあります。`curl -fsS "$test_url/health"` のような readiness check を retry 付きで通してから E2E を始める方が、起動遅延と回帰を切り分けやすくなります。

      - name: Run E2E Tests
        uses: cypress-io/github-action@v5
        with:
          config: baseUrl={% raw %}${{ steps.test-env.outputs.test_url }}{% endraw %}
          spec: tests/e2e/**/*.cy.js

注記: `cypress-io/github-action` を使う場合も、`package-lock.json` と Node の major version を固定し、必要なら browser を含む実行イメージや runner 条件を明示してください。ローカル実行と CI 実行で browser / OS 差分があると、E2E テストだけ再現しない事象が起きやすくなります。

      - name: Cleanup Test Environment
        if: always()
        run: |
          cd terraform/environments/test
          terraform plan -destroy -input=false -out=destroy.tfplan \
            -var="pr_number={% raw %}${{ github.event.pull_request.number }}{% endraw %}"
          terraform apply -input=false destroy.tfplan

> Verify
> `terraform destroy` の直後は、remote backend の state に対象リソースが残っていないこと、`terraform state list` が空になっていること、または主要リソースが `aws ... describe-*` で消えていることを確認してください。特に ENI、NAT Gateway、ALB、EBS は削除完了まで時間差があるため、TTL cleanup や定期的な残存確認ジョブも用意すると取りこぼしを減らせます。

> Cleanup
> `terraform destroy` が失敗した場合は、`terraform state list`、PR 番号、TTL タグ、`Name` タグを突き合わせて残存資産を列挙し、手動 cleanup 対象を記録してください。shared VPC / shared subnet 上の資産を削除する前に、対象 backend state とタグの両方でその PR 環境に属することを確認します。

注記: preview 環境を同じ `pr_number` で再利用する場合は、`concurrency.group: preview-pr-<PR番号>` のように同一 PR の apply / destroy を直列化し、先行 job の cleanup が終わる前に次の apply が走らないようにしてください。

  # 6. プロダクションデプロイ
  deploy-infrastructure:
    needs: [static-analysis, security-scan, cost-estimation]
    runs-on: ubuntu-24.04
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        environment: [dev, staging, prod]
      max-parallel: 1  # 環境を順番にデプロイ
    environment: {% raw %}${{ matrix.environment }}{% endraw %}
    concurrency:
      group: infra-{% raw %}${{ matrix.environment }}{% endraw %}
      cancel-in-progress: false
    permissions:
      contents: read
      id-token: write
    env:
      TF_INPUT: 0

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}{% endraw %}
          aws-region: {% raw %}${{ env.AWS_REGION }}{% endraw %}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: {% raw %}${{ env.TF_VERSION }}{% endraw %}

      - name: Terraform Plan
        run: |
          cd terraform/environments/{% raw %}${{ matrix.environment }}{% endraw %}
          terraform init -input=false -lockfile=readonly
          terraform plan -input=false -out=tfplan

注記: この job は `tfplan` の生成と smoke test 前提の apply に絞り、raw plan 全文は別ファイルへ残して公開フローへ流さない方が安全です。全文確認が必要な場合も、承認後 job の限定 artifact や内部ログへ分離してください。

      - name: Terraform Apply
        run: |
          cd terraform/environments/{% raw %}${{ matrix.environment }}{% endraw %}
          terraform apply -input=false tfplan

      - name: Run Smoke Tests
        run: |
          cd tests/smoke
          ./run_smoke_tests.sh {% raw %}${{ matrix.environment }}{% endraw %}

      - name: Update Documentation
        if: matrix.environment == 'prod'
        run: |
          cd terraform/environments/{% raw %}${{ matrix.environment }}{% endraw %}
          terraform output -json | jq 'with_entries(select(.value.sensitive != true))' > ../../../docs/infrastructure-outputs.json
          terraform graph | dot -Tpng > ../../../docs/infrastructure-diagram.png

注記: `environment` だけでは、同じ環境に対する複数 workflow の並列実行を自動的に直列化できない場合があります。`concurrency` を environment ごとに設定し、required reviewers や wait timer を持つ GitHub Environments と併用すると、plan/apply が競合しにくくなります。

注記: `terraform show -json` の出力には、state や output から復元できる機微情報が含まれる場合があります。公開ドキュメントへそのまま配置するのではなく、reader-facing に必要な図や非機密 output だけを整形して出力し、raw state 相当の JSON は内部 artifact または制限付き保存先で扱う方が安全です。

  # 7. 構成管理の適用
  configure-servers:
    needs: deploy-infrastructure
    runs-on: ubuntu-24.04
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        environment: [dev, staging, prod]
      max-parallel: 1
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v6
        with:
          python-version: '3.11'

      - name: Install Ansible
        run: |
          pip install ansible=={% raw %}${{ env.ANSIBLE_VERSION }}{% endraw %}
          pip install boto3  # AWS動的インベントリ用

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}{% endraw %}
          aws-region: {% raw %}${{ env.AWS_REGION }}{% endraw %}

      - name: Run Ansible Playbook
        env:
          ANSIBLE_HOST_KEY_CHECKING: True  # ホスト鍵は known_hosts で管理する
          ANSIBLE_VAULT_PASSWORD: {% raw %}${{ secrets.ANSIBLE_VAULT_PASSWORD }}{% endraw %}
        run: |
          cd ansible

          # Vault パスワードファイルの作成
          umask 077
          VAULT_PASS_FILE=$(mktemp)
          trap 'rm -f "$VAULT_PASS_FILE"' EXIT
          printf '%s' "$ANSIBLE_VAULT_PASSWORD" > "$VAULT_PASS_FILE"

          # 動的インベントリを使用してPlaybook実行
          ansible-playbook -i inventory/aws_ec2.yml \
            site.yml \
            --limit "{% raw %}${{ matrix.environment }}{% endraw %}" \
            --vault-password-file "$VAULT_PASS_FILE"

注記: Vault パスワードを平文ファイルへ書く場合は、`umask 077`、`mktemp`、`trap ... EXIT` で最小寿命に留めてください。より厳密に扱う場合は、パスワードファイルを残さない渡し方や GitHub Environments / OIDC と組み合わせた secret 注入を検討します。

  # 8. 監視とアラートの設定
  setup-monitoring:
    needs: configure-servers
    runs-on: ubuntu-24.04
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Configure Datadog
        env:
          DD_API_KEY: {% raw %}${{ secrets.DATADOG_API_KEY }}{% endraw %}
          DD_APP_KEY: {% raw %}${{ secrets.DATADOG_APP_KEY }}{% endraw %}
        run: |
          cd monitoring/datadog
          ./setup_monitors.sh

      - name: Configure PagerDuty
        env:
          PAGERDUTY_TOKEN: {% raw %}${{ secrets.PAGERDUTY_TOKEN }}{% endraw %}
        run: |
          cd monitoring/pagerduty
          ./setup_escalation_policies.sh
```

### デプロイメント戦略の実装

**Blue-Green デプロイメント**

```hcl
# terraform/modules/blue-green/main.tf
variable "active_environment" {
  description = "現在アクティブな環境 (blue/green)"
  type        = string
  default     = "blue"
}

locals {
  environments = toset(["blue", "green"])
  inactive_environment = var.active_environment == "blue" ? "green" : "blue"
}

# 両環境のASG
resource "aws_autoscaling_group" "app" {
  for_each = local.environments

  name                = "${var.project_name}-${each.key}"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = each.key == var.active_environment ? [aws_lb_target_group.app.arn] : []
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = each.key == var.active_environment ? var.min_size : 0
  max_size         = var.max_size
  desired_capacity = each.key == var.active_environment ? var.desired_capacity : 0

  launch_template {
    id      = aws_launch_template.app[each.key].id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${each.key}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = each.key
    propagate_at_launch = true
  }
}
# 切り替えスクリプト
resource "local_file" "switch_environment" {
  filename = "${path.module}/switch_environment.sh"
  content  = <<-EOF
    #!/bin/bash
    set -e

    CURRENT="${var.active_environment}"
    TARGET="${local.inactive_environment}"

    echo "Switching from $CURRENT to $TARGET environment..."

    # 1. 新環境を起動
    aws autoscaling set-desired-capacity \
      --auto-scaling-group-name ${var.project_name}-$TARGET \
      --desired-capacity ${var.desired_capacity}

    # 2. ヘルスチェックを待つ
    aws autoscaling wait \
      --auto-scaling-group-name ${var.project_name}-$TARGET \
      --query "length(AutoScalingGroups[0].Instances[?HealthStatus=='Healthy'])" \
      --desired-value ${var.desired_capacity}

    # 3. トラフィックを切り替え
    terraform plan -input=false -var="active_environment=$TARGET" -out=switch.tfplan
    terraform apply -input=false switch.tfplan

    # 4. 旧環境を停止
    aws autoscaling set-desired-capacity \
      --auto-scaling-group-name ${var.project_name}-$CURRENT \
      --desired-capacity 0

    echo "Environment switch completed!"
  EOF

  file_permission = "0755"
}
```

> Verify
> Blue-Green の切替前に、新環境の target group が `healthy` であること、`/health` などのアプリケーション確認用エンドポイントが retry 付きで成功することを確認してください。`aws elbv2 describe-target-health --target-group-arn ...` で旧 target が `draining` / `unused` へ遷移したことを確認してから旧環境を 0 台へ落とす方が安全です。旧環境をすぐに 0 台へ落とすと、deregistration delay 中の接続やキャッシュ warm-up が失敗する場合があります。
> Rollback の最小例として、`terraform plan -input=false -var="active_environment=$CURRENT" -out=rollback.tfplan` → `terraform apply -input=false rollback.tfplan` をすぐ再実行できる状態を保ち、旧環境の desired capacity を 0 にする前に現在の台数を記録してください。

注記: `launch_template.version = "$Latest"` は、テンプレート更新のたびに参照先が変わる可変指定です。Blue-Green の切り替えを再現したい場合は、レビュー済みの Launch Template version を固定し、切り替え時にその version を明示してください。

**カナリアデプロイメント**

```yaml
# kubernetes/canary-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
---
# 安定版（90%のトラフィック）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: myapp
      version: stable
  template:
    metadata:
      labels:
        app: myapp
        version: stable
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080
---
# カナリア版（10%のトラフィック）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
      version: canary
  template:
    metadata:
      labels:
        app: myapp
        version: canary
    spec:
      containers:
      - name: myapp
        image: myapp:v2.0.0
        ports:
        - containerPort: 8080

---
# 自動化されたカナリア分析
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 10
    maxWeight: 50
    stepWeight: 5
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://loadtester/
      metadata:
        cmd: "hey -z 1m -c 10 -q 20 http://myapp/"
```

### GitOpsによる宣言的デプロイメント

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: infrastructure
  namespace: argocd
spec:
  project: production-platform

  source:
    repoURL: https://github.com/myorg/infrastructure
    targetRevision: v1.2.3  # 例: 承認済みの release tag
    path: kubernetes/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: false
      selfHeal: false
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

注記: Argo CD の `Application` では hook や `initContainers` を `spec` 直下へ直接書きません。`PostSync` や smoke test は、annotation 付きの別 `Job` manifest として管理する方が schema に沿っており、copy-paste しても壊れにくくなります。
注記: `project: production-platform` は dedicated `AppProject` を使う safer default の例です。`default` project のまま本番へ流用せず、`sourceRepos`、`destinations`、許可 resource を専用 project 側で制限してください。

```yaml
# argocd/hooks/post-sync-smoke-test.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: smoke-tests
        image: postman/newman:6.1.0
        command: ["newman", "run", "smoke-tests.json"]
```

Verify:

- まずは manual sync か `prune: false` / `selfHeal: false` の safer default で non-prod 検証と runbook を整備し、`argocd app diff` や dry-run 相当で削除対象と self-heal 対象を把握してから段階的に自動同期へ移行してください。
- sync 後は `argocd app wait <app> --sync --health --timeout 600` のように `Synced` だけでなく `Healthy` まで確認し、hook や dependent resource が完了する前に成功扱いしないようにします。
- 本番では `project: default` のまま使わず、専用 `AppProject` で `sourceRepos`、`destinations`、`clusterResourceWhitelist`、必要なら `syncWindows` を明示的に制限してください。
- 本番 AppProject では GnuPG signature verification を有効にし、許可する公開鍵だけを登録してください。`targetRevision` を annotated tag で固定する場合も、tag 自体の署名検証まで含めて「誰が承認済み revision を作ったか」を追える形にしておく方が安全です。
- GitOps repository 側でも protected branch / protected tag、`CODEOWNERS`、required status checks を併用し、署名検証だけで二者承認や review gate を代替しないでください。承認済み revision を作れる経路自体を絞らないと、source of truth の改ざん耐性は十分になりません。
- `notify-slack` のような hook で使う Webhook URL は manifest へ直書きせず、Kubernetes Secret や外部 secret store から注入してください。`curlimages/curl` などの実行 image も固定タグまたは digest へ寄せ、`kubectl describe pod` や controller の event で hook がどの image と環境変数を使ったか確認できるようにしておくと追跡しやすくなります。
- `ignoreDifferences` を使う場合は、HPA が管理する `spec.replicas` や admission webhook の `caBundle` など controller が上書きする field に限定し、owner と expiry を runbook に残してください。アプリ設定や securityContext まで広く無視すると、drift や意図しない権限変更を見逃します。

Risk:

- hook の部分失敗や overlay 誤差分があると、意図しない prune が走ることがあります。`allowEmpty: false` だけでは orphaned resource や finalizer 残骸を防げないため、本番では自動 sync の対象範囲を狭くし、削除系の変更だけは別承認に分ける方が安全です。
- `retry` を有効にした hook は再実行される前提で設計しないと、外部通知、DB migration、seed 処理が重複実行されることがあります。non-prod で再実行挙動を確認し、hook 処理は idempotent に保ってください。
- `project: default` や広すぎる controller RBAC のまま運用すると、別 repository や cluster-scope resource への変更が意図せず混入し、GitOps の責任分界が崩れます。
- `CreateNamespace=true` は namespace の存在を保証するだけで、Pod Security ラベルや owner annotation などの baseline metadata までは揃えません。shared namespace を Argo CD 管理下へ置く場合は、`Namespace` manifest か `managedNamespaceMetadata` で必要 metadata を明示しないと、意図しない reconcile / delete が起こりやすくなります。

Cleanup:

- sync 後は orphaned resource と finalizer が残っていないかを確認し、必要なら `argocd app diff` / `argocd app get` と `kubectl get ... -o yaml` で削除漏れを洗い出します。prune 後の失敗時に備えて、直前 revision へ戻す手順も runbook 化してください。
- 失敗した hook Job / Pod は定期的に棚卸しし、retry で再実行される前に不要な残骸を整理してください。hook delete policy と TTL を決めておくと、event 調査と cleanup の両立がしやすくなります。
- 不要になった repo credential、stale な Application、古い allowlist / sync window を定期的に棚卸しし、default project からの移行後に残った例外設定を整理します。

注記: `targetRevision` を固定しないまま cluster 内の sync hook で `terraform apply` まで行うと、どの Git revision と plan が適用されたか追跡しにくくなります。本番では Git revision、image digest、Terraform plan を固定し、cluster 内では `validate` や read-only の確認までにとどめ、`terraform apply` は承認付きパイプラインで実行する方が監査しやすくなります。

Infrastructure as Code と自動化は、現代のクラウド運用の基盤です。宣言的な管理、バージョン管理、自動化を組み合わせることで、信頼性が高く、監査可能で、効率的なインフラストラクチャ運用が実現できます。

重要なのは、これらのツールと手法を段階的に導入し、組織の成熟度に合わせて進化させていくことです。完璧を求めるのではなく、継続的な改善を通じて、より良いインフラストラクチャ管理を実現していくことが成功への鍵となります。

---

[第11章](../chapter-chapter11/index.md)へ進む
