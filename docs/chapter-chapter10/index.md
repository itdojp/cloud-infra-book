---
title: "第10章：Infrastructure as Code (IaC) と自動化"
chapter: chapter10
layout: book
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
            ImageId='ami-0123456789abcdef0',
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
        instance.terminate()
        print(f"Terminated instance: {instance.id}")
```

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
      "ec2:*",
      "rds:*",
      "s3:*"
    ]
    resources = ["*"]
    
    condition {
      test     = "StringNotEquals"
      variable = "aws:userid"
      values   = [data.aws_caller_identity.terraform.user_id]
    }
    
    # Terraform実行ユーザー以外の変更を拒否
  }
}
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
    
    # バージョニング（履歴保持）
    versioning = true
    
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
  route_table_id = var.enable_nat_gateway ? (var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id) : aws_route_table.public.id
}

resource "aws_route_table_association" "database" {
  count = length(aws_subnet.database)
  
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = var.enable_nat_gateway ? (var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id) : aws_route_table.public.id
}

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
  
  # 本番環境のみ暗号化
  storage_encrypted = var.environment == "prod"
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

**状態の移行とリファクタリング**

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
    app_version: "{% raw %}{{ lookup('env', 'APP_VERSION') | default('latest', true) }}{% endraw %}"

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
user `{{ nginx_user }}`;
worker_processes `{{ nginx_worker_processes }}`;
pid /run/nginx.pid;

events {
    worker_connections `{{ nginx_worker_connections }}`;
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
    server_tokens `{{ nginx_server_tokens | default('on') }}`;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL設定
    {% if nginx_use_ssl | default(false) %}
    ssl_protocols `{{ nginx_ssl_protocols }}`;
    ssl_ciphers `{{ nginx_ssl_ciphers }}`;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    {% endif %}
    
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
        dest: "`{{ app_home }}`/config/database.yml"
        owner: "`{{ app_user }}`"
        group: "`{{ app_group }}`"
        mode: '0600'  # 機密情報のため厳格な権限
      no_log: true    # ログに機密情報を出力しない

# templates/database.yml.j2
production:
  adapter: postgresql
  encoding: unicode
  database: `{{ database_name }}`
  pool: `{{ database_pool | default(5) }}`
  username: `{{ database_user }}`
  password: `{{ database_password }}`  # Vaultから取得
  host: `{{ database_host }}`
  port: `{{ database_port | default(5432) }}`

# 実行時
# ansible-playbook -i inventory site.yml --ask-vault-pass
# または
# ansible-playbook -i inventory site.yml --vault-password-file ~/.vault_pass
```

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
  AWS_REGION: 'ap-northeast-1'

jobs:
  # 1. 静的解析とlint
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: `${{ env.TF_VERSION }}`
          
      - name: Terraform Format Check
        run: |
          cd terraform
          terraform fmt -check -recursive
          
      - name: Terraform Validate
        run: |
          cd terraform
          for dir in $(find . -type f -name "*.tf" -exec dirname {} \; | sort -u); do
            echo "Validating $dir"
            (cd "$dir" && terraform init -backend=false && terraform validate)
          done
          
      - name: TFLint
        uses: terraform-linters/setup-tflint@v3
        with:
          tflint_version: latest
          
      - name: Run TFLint
        run: |
          cd terraform
          tflint --init
          tflint --recursive
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install Ansible and ansible-lint
        run: |
          pip install ansible=`${{ env.ANSIBLE_VERSION }}` ansible-lint
          
      - name: Ansible Lint
        run: |
          cd ansible
          ansible-lint

  # 2. セキュリティスキャン
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Checkov Security Scan
        id: checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: reports/checkov.sarif
          
      - name: Upload Checkov results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: reports/checkov.sarif
          
      - name: Terrascan
        run: |
          wget https://github.com/tenable/terrascan/releases/latest/download/terrascan_Linux_x86_64.tar.gz
          tar -xf terrascan_Linux_x86_64.tar.gz
          ./terrascan scan -i terraform -d terraform/
          
      - name: Secrets Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: `${{ github.event.repository.default_branch }}`
          head: HEAD

  # 3. コスト見積もり
  cost-estimation:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Infracost
        uses: infracost/setup-infracost@v2
        with:
          api-key: `${{ secrets.INFRACOST_API_KEY }}`
          
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
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    strategy:
      matrix:
        environment: [dev, staging, prod]
    permissions:
      contents: read
      pull-requests: write
      id-token: write
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: `${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}`
          aws-region: `${{ env.AWS_REGION }}`
          
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: `${{ env.TF_VERSION }}`
          
      - name: Terraform Init
        run: |
          cd terraform/environments/`${{ matrix.environment }}`
          terraform init
          
      - name: Terraform Plan
        id: plan
        run: |
          cd terraform/environments/`${{ matrix.environment }}`
          terraform plan -out=tfplan -no-color | tee plan_output.txt
          
      - name: Create Plan Summary
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const output = `#### Terraform Plan - `${{ matrix.environment }}` 📋
            
            <details><summary>Show Plan</summary>
            
            \`\`\`terraform
            ${require('fs').readFileSync('terraform/environments/`${{ matrix.environment }}`/plan_output.txt', 'utf8')}
            \`\`\`
            
            </details>
            
            *Pushed by: @`${{ github.actor }}{% endraw %}, Action: \`{% raw %}${{ github.event_name }}`\`*`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })

  # 5. 統合テスト環境の構築
  integration-test:
    needs: terraform-plan
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: `${{ secrets.AWS_TEST_ROLE }}`
          aws-region: `${{ env.AWS_REGION }}`
          
      - name: Create Test Environment
        id: test-env
        run: |
          cd terraform/environments/test
          terraform init
          terraform apply -auto-approve \
            -var="pr_number=`${{ github.event.pull_request.number }}`"
          
          # 出力値を環境変数に設定
          echo "test_url=$(terraform output -raw test_environment_url)" >> $GITHUB_OUTPUT
          
      - name: Run Integration Tests
        run: |
          cd tests/integration
          npm install
          npm run test:integration -- \
            --url "`${{ steps.test-env.outputs.test_url }}`"
            
      - name: Run E2E Tests
        uses: cypress-io/github-action@v5
        with:
          config: baseUrl=`${{ steps.test-env.outputs.test_url }}`
          spec: tests/e2e/**/*.cy.js
          
      - name: Cleanup Test Environment
        if: always()
        run: |
          cd terraform/environments/test
          terraform destroy -auto-approve \
            -var="pr_number=`${{ github.event.pull_request.number }}`"

  # 6. プロダクションデプロイ
  deploy-infrastructure:
    needs: [static-analysis, security-scan, cost-estimation]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        environment: [dev, staging, prod]
      max-parallel: 1  # 環境を順番にデプロイ
    environment: `${{ matrix.environment }}`
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: `${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}`
          aws-region: `${{ env.AWS_REGION }}`
          
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: `${{ env.TF_VERSION }}`
          
      - name: Terraform Apply
        run: |
          cd terraform/environments/`${{ matrix.environment }}`
          terraform init
          terraform apply -auto-approve
          
      - name: Run Smoke Tests
        run: |
          cd tests/smoke
          ./run_smoke_tests.sh `${{ matrix.environment }}`
          
      - name: Update Documentation
        if: matrix.environment == 'prod'
        run: |
          cd terraform/environments/`${{ matrix.environment }}`
          terraform show -json > ../../../docs/infrastructure-state.json
          terraform graph | dot -Tpng > ../../../docs/infrastructure-diagram.png

  # 7. 構成管理の適用
  configure-servers:
    needs: deploy-infrastructure
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        environment: [dev, staging, prod]
      max-parallel: 1
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install Ansible
        run: |
          pip install ansible=`${{ env.ANSIBLE_VERSION }}`
          pip install boto3  # AWS動的インベントリ用
          
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: `${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}`
          aws-region: `${{ env.AWS_REGION }}`
          
      - name: Run Ansible Playbook
        env:
          ANSIBLE_HOST_KEY_CHECKING: False
          ANSIBLE_VAULT_PASSWORD: `${{ secrets.ANSIBLE_VAULT_PASSWORD }}`
        run: |
          cd ansible
          
          # Vault パスワードファイルの作成
          echo "$ANSIBLE_VAULT_PASSWORD" > .vault_pass
          
          # 動的インベントリを使用してPlaybook実行
          ansible-playbook -i inventory/aws_ec2.yml \
            site.yml \
            --limit "`${{ matrix.environment }}`" \
            --vault-password-file .vault_pass
            
          # クリーンアップ
          rm -f .vault_pass

  # 8. 監視とアラートの設定
  setup-monitoring:
    needs: configure-servers
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure Datadog
        env:
          DD_API_KEY: `${{ secrets.DATADOG_API_KEY }}`
          DD_APP_KEY: `${{ secrets.DATADOG_APP_KEY }}`
        run: |
          cd monitoring/datadog
          ./setup_monitors.sh
          
      - name: Configure PagerDuty
        env:
          PAGERDUTY_TOKEN: `${{ secrets.PAGERDUTY_TOKEN }}`
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
    terraform apply -var="active_environment=$TARGET" -auto-approve
    
    # 4. 旧環境を停止
    aws autoscaling set-desired-capacity \
      --auto-scaling-group-name ${var.project_name}-$CURRENT \
      --desired-capacity 0
    
    echo "Environment switch completed!"
  EOF
  
  file_permission = "0755"
}
```

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
  project: default
  
  source:
    repoURL: https://github.com/myorg/infrastructure
    targetRevision: HEAD
    path: kubernetes/overlays/production
    
  destination:
    server: https://kubernetes.default.svc
    namespace: production
    
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
        
  # Terraform連携
  initContainers:
  - name: terraform-apply
    image: hashicorp/terraform:1.5.0
    command:
    - sh
    - -c
    - |
      cd /terraform
      terraform init
      terraform apply -auto-approve
    volumeMounts:
    - name: terraform-config
      mountPath: /terraform
      
  # Post-sync hooks
  postSync:
  - name: smoke-tests
    container:
      image: postman/newman
      command: ["newman", "run", "smoke-tests.json"]
  - name: notify-slack
    container:
      image: curlimages/curl
      command: 
      - sh
      - -c
      - |
        curl -X POST $SLACK_WEBHOOK \
          -H 'Content-type: application/json' \
          -d '{"text":"Deployment completed successfully"}'
```

Infrastructure as Code と自動化は、現代のクラウド運用の基盤です。宣言的な管理、バージョン管理、自動化を組み合わせることで、信頼性が高く、監査可能で、効率的なインフラストラクチャ運用が実現できます。

重要なのは、これらのツールと手法を段階的に導入し、組織の成熟度に合わせて進化させていくことです。完璧を求めるのではなく、継続的な改善を通じて、より良いインフラストラクチャ管理を実現していくことが成功への鍵となります。
---

[第11章](../chapter-chapter11/index.md)へ進む
