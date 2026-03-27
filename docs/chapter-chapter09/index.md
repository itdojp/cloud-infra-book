---
title: "第9章：サーバーレスとコンテナサービス"
chapter: chapter09
---

# 第9章：サーバーレスとコンテナサービス

## 9.1 サーバーレスコンピューティングの概念とメリット

### サーバーレスという革命的パラダイム

サーバーレスコンピューティングは、その名前が示すような「サーバーがない」状態ではありません。サーバーの存在を開発者から完全に抽象化し、ビジネスロジックの実装に集中できる環境を提供する、インフラストラクチャ管理の革命的なアプローチです。

### 従来のアプローチからの解放

**インフラストラクチャ管理の負担**

従来のアプリケーション開発では、開発者は以下のような運用タスクに多大な時間を費やしていました。

```yaml
従来の責任範囲:
  インフラ層:
    - サーバーのプロビジョニング
    - OSのパッチ適用
    - セキュリティアップデート
    - キャパシティプランニング

  スケーリング層:
    - 負荷分散の設計
    - オートスケーリングの設定
    - 可用性の確保
    - 障害時のフェイルオーバー

  運用層:
    - 監視システムの構築
    - ログ収集と分析
    - バックアップとリカバリ
    - コスト管理
```

サーバーレスは、これらすべての責任をクラウドプロバイダーに委譲し、開発者を運用の複雑性から解放します。

### イベント駆動アーキテクチャの本質

**リアクティブシステムの実現**

サーバーレスの真の価値は、イベント駆動型の設計思想にあります。システムは外部イベントに反応し、必要な時にのみ処理を実行します。

```python
# Lambda関数の例：S3イベントに反応する画像処理
import json
import boto3
from PIL import Image
import io

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    """
    S3にアップロードされた画像を自動的にリサイズ
    """
    # イベントからバケット名とオブジェクトキーを取得
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # 元画像をダウンロード
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_content = response['Body'].read()

        # 画像処理
        with Image.open(io.BytesIO(image_content)) as img:
            # サムネイル作成（150x150）
            thumbnail = img.copy()
            thumbnail.thumbnail((150, 150))

            # WebP形式で保存（高圧縮）
            output_buffer = io.BytesIO()
            thumbnail.save(output_buffer, format='WEBP', quality=85)
            output_buffer.seek(0)

            # 処理済み画像をS3に保存
            thumbnail_key = f"thumbnails/{key}"
            s3_client.put_object(
                Bucket=bucket,
                Key=thumbnail_key,
                Body=output_buffer,
                ContentType='image/webp'
            )

    return {
        'statusCode': 200,
        'body': json.dumps('Image processing completed')
    }
```

Verify: S3 イベント通知の prefix / suffix に `thumbnails/` の出力先が含まれていないことを確認してください。変換後オブジェクトが同じ通知条件に一致すると、`put_object` が再帰トリガーされ、不要な同時実行と課金につながります。

Risk: 検証用の `thumbnails/` prefix や bucket notification を本番 bucket と共用すると、誤検知や不要課金の切り分けが難しくなります。少なくとも検証用 prefix を分離し、不要になった notification 設定は手元の runbook で戻せるようにしてください。

Cleanup: ハンズオン後は `thumbnails/` 配下の生成物を削除し、継続利用しない bucket notification は `put-bucket-notification-configuration` で無効化します。検証専用 bucket を使った場合は、lifecycle ルールや expiration が意図どおり残っているかまで確認してください。

**多様なイベントソース**

```yaml
イベントソースの分類:
  HTTPリクエスト:
    - API Gateway（REST/GraphQL）
    - Application Load Balancer
    - CloudFront（Lambda@Edge）

  メッセージングサービス:
    - SQS（Simple Queue Service）
    - SNS（Simple Notification Service）
    - EventBridge（カスタムイベント）
    - Kinesis（ストリーミングデータ）

  ストレージイベント:
    - S3（オブジェクト作成/削除）
    - DynamoDB Streams（データ変更）
    - EFS（ファイルシステムイベント）

  スケジュールイベント:
    - CloudWatch Events（cron式）
    - EventBridge Scheduler

  その他:
    - IoT Core（デバイスメッセージ）
    - Cognito（認証イベント）
    - Step Functions（ワークフロー）
```

### Function as a Service (FaaS) の実行モデル

**コールドスタートの理解と最適化**

コールドスタートは、サーバーレスの特性上避けられない課題ですが、適切な対策により影響を最小化できます。

```python
# コールドスタート最適化のテクニック

# 1. グローバル変数で接続を再利用
import os
import pymongo

# コールドスタート時のみ実行される
mongodb_client = None

def get_db_connection():
    global mongodb_client
    if mongodb_client is None:
        mongodb_client = pymongo.MongoClient(
            os.environ['MONGODB_URI'],
            maxPoolSize=1  # Lambda環境では接続プールを最小に
        )
    return mongodb_client

def lambda_handler(event, context):
    # ウォームスタート時は既存の接続を再利用
    db = get_db_connection()

    # ビジネスロジック
    result = db.mydb.mycollection.find_one({"_id": event['id']})

    return {
        'statusCode': 200,
        'body': json.dumps(result, default=str)
    }

# 2. 最小限の依存関係
# requirements.txt を最適化し、必要最小限のライブラリのみインストール

# 3. レイヤーの活用
# 共通ライブラリをLambda Layerとして分離
```

**実行時間とメモリの最適化**

```yaml
Lambda設定の最適化戦略:
  メモリ割り当て:
    - 128MB〜10,240MB（10GB）の範囲
    - メモリに比例してCPU性能も向上
    - コスト vs パフォーマンスのバランス

  タイムアウト設定:
    - 最大15分（900秒）
    - 適切なタイムアウトで無駄なコストを防止
    - 非同期処理への分割を検討

  同時実行数:
    - デフォルト: 1,000
    - 予約同時実行数の設定
    - スロットリング対策
```

### 経済モデルの革新

**真の従量課金の実現**

```python
# コスト計算の例
def calculate_lambda_cost(memory_mb, duration_ms, requests):
    """
    Lambda実行コストの計算（東京リージョン）
    """
    # 料金設定
    price_per_gb_second = 0.0000166667
    price_per_request = 0.0000002
    free_tier_gb_seconds = 400000
    free_tier_requests = 1000000

    # GB-秒の計算
    gb_seconds = (memory_mb / 1024) * (duration_ms / 1000) * requests
    billable_gb_seconds = max(0, gb_seconds - free_tier_gb_seconds)

    # リクエスト数の計算
    billable_requests = max(0, requests - free_tier_requests)

    # 総コスト
    compute_cost = billable_gb_seconds * price_per_gb_second
    request_cost = billable_requests * price_per_request
    total_cost = compute_cost + request_cost

    return {
        'compute_cost': compute_cost,
        'request_cost': request_cost,
        'total_cost': total_cost,
        'cost_per_request': total_cost / requests if requests > 0 else 0
    }

# 使用例：月間100万リクエスト、512MBメモリ、平均200ms
monthly_cost = calculate_lambda_cost(
    memory_mb=512,
    duration_ms=200,
    requests=1000000
)
print(f"月間コスト: ${monthly_cost['total_cost']:.2f}")
```

### サーバーレスの適用パターン

**理想的なユースケース**

```yaml
1. イベント処理パターン:
   画像/動画処理:
     trigger: S3アップロード
     process: リサイズ、フォーマット変換、メタデータ抽出
     output: 処理済みファイルをS3に保存

   データ変換ETL:
     trigger: 新規ファイル到着
     process: 検証、変換、集計
     output: データウェアハウスへロード

   通知システム:
     trigger: アプリケーションイベント
     process: 通知内容の生成
     output: Email/SMS/Push通知の送信

2. APIバックエンドパターン:
   RESTful API:
     - CRUD操作
     - 認証・認可
     - レート制限

   GraphQL:
     - スキーマ駆動開発
     - リゾルバーの実装
     - サブスクリプション

3. 定期処理パターン:
   バックアップ:
     schedule: "0 2 * * *"  # 毎日AM2:00
     process: DBスナップショット作成

   レポート生成:
     schedule: "0 9 * * MON"  # 毎週月曜AM9:00
     process: 週次レポート作成・配信
```

**アンチパターンの認識**

```yaml
サーバーレスに適さないケース:
  長時間実行:
    - 15分を超える処理
    - 解決策: Step Functions、Batch、ECS

  高頻度・常時実行:
    - 秒間数千リクエスト以上
    - 解決策: コンテナ、EC2

  ステートフル処理:
    - WebSocketの長時間接続
    - 解決策: ECS、App Runner

  超低レイテンシ要求:
    - 10ms以下の応答時間
    - 解決策: EC2、Lambda@Edge
```

### サーバーレスアーキテクチャの設計パターン

**マイクロサービス分解**

```yaml
# API Gatewayと複数Lambda関数による構成
# serverless.yml (Serverless Framework)
service: ecommerce-api

provider:
  name: aws
  runtime: python3.12
  region: ap-northeast-1

  environment:
    DYNAMODB_TABLE: ${self:service}-${opt:stage, self:provider.stage}

  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource: "arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.DYNAMODB_TABLE}"

functions:
  # 商品管理API
  createProduct:
    handler: products.create
    events:
      - http:
          path: products
          method: post
          cors: true
          authorizer: aws_iam

  getProduct:
    handler: products.get
    events:
      - http:
          path: products/{id}
          method: get
          cors: true

  listProducts:
    handler: products.list
    events:
      - http:
          path: products
          method: get
          cors: true

  # 注文管理API
  createOrder:
    handler: orders.create
    events:
      - http:
          path: orders
          method: post
          cors: true
          authorizer: aws_iam

  processPayment:
    handler: payments.process
    events:
      - sqs:
          arn:
            Fn::GetAtt:
              - PaymentQueue
              - Arn
          batchSize: 10

resources:
  Resources:
    ProductsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.DYNAMODB_TABLE}
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        ProvisionedThroughput:
          ReadCapacityUnits: 5
          WriteCapacityUnits: 5

    PaymentQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-payment-queue
        VisibilityTimeout: 60
```

## 9.2 コンテナ技術の基礎とDocker

### コンテナ化がもたらす本質的価値

コンテナ技術は、「開発環境では動くのに本番では動かない」という長年の課題を根本的に解決しました。アプリケーションとその依存関係を一つのポータブルなユニットにパッケージ化することで、環境間の一貫性を保証します。

### 仮想化技術の進化と比較

**ハードウェア仮想化からOS仮想化へ**

```text
仮想マシン（VM）のアーキテクチャ:
┌─────────────┬─────────────┬─────────────┐
│   App A     │   App B     │   App C     │
├─────────────┼─────────────┼─────────────┤
│  Guest OS   │  Guest OS   │  Guest OS   │
├─────────────┴─────────────┴─────────────┤
│            Hypervisor                    │
├─────────────────────────────────────────┤
│            Host OS                       │
├─────────────────────────────────────────┤
│            Hardware                      │
└─────────────────────────────────────────┘

コンテナのアーキテクチャ:
┌─────────────┬─────────────┬─────────────┐
│   App A     │   App B     │   App C     │
├─────────────┼─────────────┼─────────────┤
│ Container A │ Container B │ Container C │
├─────────────┴─────────────┴─────────────┤
│         Container Runtime                │
├─────────────────────────────────────────┤
│            Host OS                       │
├─────────────────────────────────────────┤
│            Hardware                      │
└─────────────────────────────────────────┘
```

**性能とリソース効率の比較**

```python
# リソース使用量の比較
comparison = {
    "仮想マシン": {
        "起動時間": "30〜60秒",
        "メモリオーバーヘッド": "~1GB/インスタンス",
        "ディスク容量": "~10GB/インスタンス",
        "CPU効率": "80〜90%",
        "同時実行可能数": "10-20（標準的なホスト）"
    },
    "コンテナ": {
        "起動時間": "1〜2秒",
        "メモリオーバーヘッド": "~10MB/インスタンス",
        "ディスク容量": "~100MB/インスタンス",
        "CPU効率": "95〜98%",
        "同時実行可能数": "100-1000（標準的なホスト）"
    }
}
```

### Dockerの基本概念と実装

**レイヤー構造の深い理解**

Dockerイメージのレイヤー構造は、効率的なストレージとネットワーク転送を実現します。

```dockerfile
# 最適化されたDockerfile
# Stage 1: ビルド環境
FROM node:20-alpine AS builder

# 依存関係のキャッシュ効率を上げる
WORKDIR /app
COPY package*.json ./
RUN npm ci

# アプリケーションコードをコピー
COPY . .
RUN npm run build

# 本番に不要なdevDependenciesを除去（最終イメージに含めない）
RUN npm prune --omit=dev

# Stage 2: 実行環境（マルチステージビルド）
FROM node:20-alpine

# PID 1問題を回避するためtiniを使用（rootでインストール）
RUN apk add --no-cache tini

# セキュリティ: 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 必要最小限のファイルのみコピー
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# セキュリティ設定
USER nodejs

# node_modules は builder ステージ側で `npm prune --omit=dev` 済みのものをコピーする
EXPOSE 3000

# ヘルスチェックの定義
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/server.js"]
```

**ビルドキャッシュの最適化**

```dockerfile
# キャッシュを効果的に活用する順序
# 変更頻度: 低 → 高

# 1. ベースイメージ（めったに変更されない）
FROM python:3.11-slim

# 2. システムパッケージ（たまに変更）
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. Pythonパッケージ（時々変更）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. アプリケーションコード（頻繁に変更）
COPY . /app
WORKDIR /app

CMD ["python", "app.py"]
```

注記: `requirements.txt` は少なくとも version pin を行い、再現性を厳密に求める環境では hash 固定も検討してください。`COPY . /app` を使う場合は `.dockerignore` で `.git`、`.env`、ローカル credential、不要なテストデータを除外しないと、秘匿情報や不要ファイルが image に混入する場合があります。
注記: ベースイメージは tag だけでなく digest まで固定すると、日付による差分をさらに減らせます。`apt-get update` で入る OS package も mirror の更新で変わるため、再現性を厳密に求める環境では package version pin や snapshot repository を併用してください。

### コンテナネットワーキングの詳細

**ネットワークドライバーの選択と設計**

```yaml
# docker-compose.yml でのネットワーク設計
version: '3.8'

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24

  backend:
    driver: bridge
    internal: true  # 外部アクセス不可
    ipam:
      config:
        - subnet: 172.21.0.0/24

  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/24

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app

  app:
    build: ./app
    networks:
      - frontend
      - backend
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    deploy:
      replicas: 3

注記: `deploy.replicas` は Docker Swarm や対応プラットフォーム向けの設定です。ローカルの `docker compose up` では、そのままでは replica 数に反映されない場合があるため、手元で確認する際は `docker compose up --scale app=3` のように実行条件を明示してください。

注記: `depends_on` は起動順序を揃えるだけで、依存先の readiness までは保証しません。ローカル検証で PostgreSQL や Redis の起動待ちに失敗する場合は、`healthcheck` と `condition: service_healthy`、または接続確認スクリプトを併用してください。

  postgres:
    image: postgres:13
    networks:
      - backend
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password

  redis:
    image: redis:6-alpine
    networks:
      - backend
    command: redis-server --requirepass ${REDIS_PASSWORD}

注記: この Redis 例は最小構成です。本番相当では `REDIS_PASSWORD` を平文 environment variable で渡すのではなく、Compose の `secrets:` や外部 secret store を使って注入してください。Verify として、`docker inspect` の `Config.Env` に secret 値が露出していないことも確認します。

  prometheus:
    image: prom/prometheus
    networks:
      - monitoring
      - frontend  # アプリケーションメトリクス収集用
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  postgres_data:
    driver: local

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

Risk: `./secrets/db_password.txt` のような local secret file は、`.gitignore` 対象にした上で `chmod 600` など最小権限に寄せてください。検証用の secret を repository 配下へ平文のまま残すと、誤 commit や共有端末での漏えいを招きます。

Cleanup: ハンズオン後に local secret file が不要になったら削除し、継続運用では external secret store や Compose `secrets:` の配布元を CI/CD 側で管理する形へ移してください。

### 本番環境でのコンテナ運用

**ログ管理戦略**

```python
# Fluentdを使用した統合ログ管理
# fluent.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Dockerコンテナログの収集
<source>
  @type tail
  path /var/lib/docker/containers/*/*-json.log
  pos_file /var/log/fluentd-docker.pos
  tag docker.*
  format json
  time_key time
  time_format %Y-%m-%dT%H:%M:%S.%NZ
</source>

# ログの構造化と濃縮
<filter docker.**>
  @type parser
  key_name log
  <parse>
    @type json
  </parse>
</filter>

# メタデータの追加
<filter docker.**>
  @type record_transformer
  <record>
    hostname ${hostname}
    environment ${ENV['ENVIRONMENT']}
    service ${tag_parts[1]}
  </record>
</filter>

# 出力先の設定
<match docker.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix docker
  <buffer>
    @type file
    path /var/log/fluentd-buffers/docker.buffer
    flush_mode interval
    flush_interval 10s
  </buffer>
</match>
```

**セキュリティスキャンの自動化**

```yaml
# CI/CDパイプラインでのセキュリティチェック
# .gitlab-ci.yml
stages:
  - build
  - scan
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  TRIVY_IMAGE: aquasec/trivy:<固定タグまたはdigest>
  HADOLINT_IMAGE: hadolint/hadolint:<固定タグまたはdigest>
  TRUFFLEHOG_IMAGE: trufflesecurity/trufflehog:<固定タグまたはdigest>

build:
  stage: build
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG

security_scan:
  stage: scan
  image: $TRIVY_IMAGE
  script:
    # 脆弱性スキャン
    - trivy image --severity HIGH,CRITICAL --exit-code 1 $IMAGE_TAG
    # ライセンススキャン
    - trivy image --license-scan --exit-code 1 $IMAGE_TAG
  allow_failure: false

dockerfile_lint:
  stage: scan
  image: $HADOLINT_IMAGE
  script:
    - hadolint Dockerfile

secrets_scan:
  stage: scan
  image: $TRUFFLEHOG_IMAGE
  script:
    - trufflehog docker --image=$IMAGE_TAG
```

> 注意
> `latest` のような可変タグは、日付によって診断結果や挙動が変わります。実務では固定タグまたは digest を使い、更新時は脆弱性スキャン結果の差分も確認してください。

## 9.3 コンテナオーケストレーション（ECS, EKS, GKE, AKS）

### オーケストレーションの必然性

単一のコンテナ管理は簡単ですが、数百、数千のコンテナを本番環境で運用するには、高度な管理システムが必要です。

**オーケストレーターが解決する課題**

```yaml
コンテナ管理の複雑性:
  配置とスケジューリング:
    - 適切なホストの選択
    - リソース制約の考慮
    - アフィニティ/アンチアフィニティ

  可用性の確保:
    - 自動的な再起動
    - ヘルスチェック
    - ローリングアップデート
    - ロールバック

  スケーリング:
    - 水平スケーリング
    - 垂直スケーリング
    - オートスケーリング

  ネットワーキング:
    - サービスディスカバリ
    - ロードバランシング
    - サービスメッシュ

  状態管理:
    - 永続ボリューム
    - ConfigMap/Secrets
    - StatefulSets
```

### Kubernetes：デファクトスタンダード

**Kubernetesのアーキテクチャ**

```yaml
# Kubernetes デプロイメント例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web-app
    version: v1.0.0
spec:
  replicas: 3
  revisionHistoryLimit: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web-app
            topologyKey: kubernetes.io/hostname
      containers:
      - name: web-app
        image: myregistry/web-app:v1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: log.level
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
        volumeMounts:
        - name: app-config
          mountPath: /etc/config
          readOnly: true
        - name: temp-storage
          mountPath: /tmp
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
      volumes:
      - name: app-config
        configMap:
          name: app-config
      - name: temp-storage
        emptyDir: {}
      serviceAccountName: web-app-sa
      securityContext:
        fsGroup: 2000
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

### マネージドKubernetesサービスの比較

**Amazon EKS（Elastic Kubernetes Service）**

注記: ここで示す名称や連携方法は時点依存です。現行の EKS では AWS Load Balancer Controller、EKS Auto Mode、EKS Pod Identity などの選択肢もあるため、実装時は一次情報で現行構成を確認してください。確認先として、[EKS Auto Mode](https://docs.aws.amazon.com/eks/latest/userguide/automode.html) と [EKS Pod Identity](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-how-it-works.html) を参照してください。少なくとも、Kubernetes の minor version、採用する Ingress/Load Balancer 統合方式、サービスアカウントの認証方式（IRSA と Pod Identity のどちらを使うか）を環境ごとに固定してから manifest を作成してください。

```yaml
# EKS特有の機能活用
# ALB Ingress Controller
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: web-app-service
            port:
              number: 80

---
# IRSA (IAM Roles for Service Accounts)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/WebAppRole
```

Verify / Rollback:

- `kubectl rollout status deployment/web-app -n production --timeout=300s` で rollout 完了を確認し、`kubectl get deploy,rs,pods,hpa -n production` で desired / available replica と autoscaling 状態を確認します。
- Ingress を変更した場合は `kubectl describe ingress web-app-ingress -n production` と `kubectl get events -n production --sort-by=.lastTimestamp | tail -20` で ALB / controller 側の反映失敗がないか確認してください。`/health` や `/ready` が 200 を返していても、annotation や certificate の不整合で公開経路だけ失敗することがあります。
- manifest 更新直後に障害が出た場合は、`kubectl rollout undo deployment/web-app -n production` と `kubectl rollout status deployment/web-app -n production --timeout=300s` を使い、戻し後も service / ingress の到達性を再確認してください。

**Google GKE（Google Kubernetes Engine）**

```yaml
# GKE Autopilot モード設定
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "1000"
    requests.memory: 1000Gi
    persistentvolumeclaims: "10"

---
# Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: web-app@project-id.iam.gserviceaccount.com

---
# GKE Ingress with Cloud Load Balancer
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "web-app-ip"
    networking.gke.io/managed-certificates: "web-app-cert"
    kubernetes.io/ingress.class: "gce"
spec:
  defaultBackend:
    service:
      name: web-app-service
      port:
        number: 80
```

### Amazon ECS：シンプルさを追求

**タスク定義によるコンテナ管理**

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::123456789012:role/WebAppTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "web-app",
      "image": "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/web-app:approved-release-tag",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:db-url-xxxxx"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

注記: `deploy.replicas` は Docker Swarm や対応プラットフォーム向けの設定です。ローカルの `docker compose up` では、そのままでは replica 数に反映されない場合があるため、手元で確認する際は `docker compose up --scale app=3` のように実行条件を明示してください。

**ECSサービスの設定**

```python
# CDKによるECSサービス定義
from aws_cdk import (
    aws_ecs as ecs,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_logs as logs,
    aws_autoscaling as autoscaling,
    core
)

class EcsServiceStack(core.Stack):
    def __init__(self, scope: core.Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # VPCの作成
        vpc = ec2.Vpc(
            self, "ServiceVpc",
            max_azs=2,
            nat_gateways=2
        )

        # ECSクラスター
        cluster = ecs.Cluster(
            self, "Cluster",
            vpc=vpc,
            container_insights=True
        )

        # Fargateサービス
        task_definition = ecs.FargateTaskDefinition(
            self, "TaskDef",
            memory_limit_mib=1024,
            cpu=512
        )

        container = task_definition.add_container(
            "WebContainer",
            image=ecs.ContainerImage.from_registry(
                "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/web-app:approved-release-tag"
            ),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="ecs",
                log_retention=logs.RetentionDays.ONE_WEEK
            ),
            environment={
                "ENVIRONMENT": "production"
            }
        )

        container.add_port_mappings(
            ecs.PortMapping(
                container_port=8080,
                protocol=ecs.Protocol.TCP
            )
        )

        # ALB
        lb = elbv2.ApplicationLoadBalancer(
            self, "ALB",
            vpc=vpc,
            internet_facing=True
        )

        # Fargateサービス
        service = ecs.FargateService(
            self, "Service",
            cluster=cluster,
            task_definition=task_definition,
            desired_count=3,
            assign_public_ip=False,
            service_name="web-app"
        )

        # オートスケーリング
        scaling = service.auto_scale_task_count(
            min_capacity=3,
            max_capacity=10
        )

        scaling.scale_on_cpu_utilization(
            "CpuScaling",
            target_utilization_percent=70
        )

        scaling.scale_on_request_count(
            "RequestScaling",
            requests_per_target=1000,
            target_group=target_group
        )
```

## 9.4 コンテナレジストリとCI/CD連携

### コンテナレジストリの戦略的活用

コンテナレジストリは、コンテナイメージのライフサイクル管理において中心的な役割を果たします。

**マルチステージレジストリ戦略**

```yaml
# レジストリ構成
registries:
  development:
    url: dev-registry.company.com
    retention: 7days
    scan: on-push

  staging:
    url: staging-registry.company.com
    retention: 30days
    scan: daily
    approval: automated

  production:
    url: prod-registry.company.com
    retention: 1year
    scan: continuous
    approval: manual
    signing: required
```

### Amazon ECR（Elastic Container Registry）

**ライフサイクルポリシーによる自動管理**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 production images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Expire untagged images after 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 3,
      "description": "Keep only 3 dev images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-"],
        "countType": "imageCountMoreThan",
        "countNumber": 3
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

Verify:

- `aws ecr describe-images --repository-name ... --image-ids imageTag=prod-...` などで、現在 ECS task definition や Kubernetes manifest が参照している digest を先に把握し、lifecycle policy の対象と衝突しないことを確認します。

Risk:

- untagged を 1 日で削除すると、rollback 用 image や再スキャンの根拠が早く消える場合があります。rollback SLA と retention は同じ表で管理し、`prod` / `dev` / `untagged` を別々に評価する方が安全です。

Cleanup:

- lifecycle policy を変更した後は、`describe-images` で残すべき世代数が期待どおりかを確認し、rollback に不要な tag だけを手動削除する runbook を残してください。

**脆弱性スキャンの自動化**

```python
# ECRスキャン結果の監視
import boto3
import json
from datetime import datetime

ecr = boto3.client('ecr')

def lambda_handler(event, context):
    """
    ECRスキャン完了時に呼び出され、脆弱性を評価
    """
    detail = event['detail']
    repository_name = detail['repository-name']
    image_digest = detail['image-digest']

    # スキャン結果を取得
    response = ecr.describe_image_scan_findings(
        repositoryName=repository_name,
        imageId={'imageDigest': image_digest}
    )

    findings = response['imageScanFindings']
    severity_counts = findings.get('findingSeverityCounts', {})

    # 重大度別の脆弱性数
    critical = severity_counts.get('CRITICAL', 0)
    high = severity_counts.get('HIGH', 0)
    medium = severity_counts.get('MEDIUM', 0)
    low = severity_counts.get('LOW', 0)

    # ポリシーチェック
    if critical > 0:
        # 本番環境へのデプロイをブロック
        send_alert(
            f"CRITICAL: {repository_name} has {critical} critical vulnerabilities",
            severity="critical"
        )
        tag_image_as_unsafe(repository_name, image_digest)

    elif high > 5:
        # 警告を発行
        send_alert(
            f"WARNING: {repository_name} has {high} high vulnerabilities",
            severity="warning"
        )

    # 詳細レポートの生成
    generate_vulnerability_report(repository_name, findings)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'repository': repository_name,
            'critical': critical,
            'high': high,
            'medium': medium,
            'low': low
        })
    }
```

### 包括的なCI/CDパイプライン

**GitHub Actions による完全自動化**

> **Verify**
> この例のように build ジョブで作成したコンテナイメージを後続ジョブで利用する場合、GitHub Actions ではジョブ間でローカルファイルが共有されません。実運用では、イメージを artifact として受け渡すか、先に ECR へ commit SHA / digest 付きで push してから deploy ジョブで参照してください。deploy 側は可変 tag ではなく、digest または commit SHA を固定して確認するのが安全です。

```yaml
# .github/workflows/container-pipeline.yml
name: Container CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com
  REPOSITORY: web-app

jobs:
  # コード品質チェック
  code-quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@v7
        env:
          GITHUB_TOKEN: {% raw %}`${{ secrets.GITHUB_TOKEN }}`{% endraw %}
          SONAR_TOKEN: {% raw %}`${{ secrets.SONAR_TOKEN }}`{% endraw %}

      - name: Check Quality Gate
        uses: sonarsource/sonarqube-quality-gate-action@v1
        timeout-minutes: 5
        env:
          SONAR_TOKEN: {% raw %}`${{ secrets.SONAR_TOKEN }}`{% endraw %}

  # コンテナビルドとスキャン
  build-and-scan:
    needs: code-quality
    runs-on: ubuntu-24.04
    permissions:
      id-token: write
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}`${{ secrets.AWS_ROLE_ARN }}`{% endraw %}
          aws-region: ap-northeast-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}:${{ github.sha }}`{% endraw %}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          outputs: type=docker,dest=/tmp/image.tar

      - name: Upload Image Artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-app-image-{% raw %}${{ github.sha }}{% endraw %}
          path: /tmp/image.tar
          if-no-files-found: error

      - name: Run Trivy Scanner
        uses: aquasecurity/trivy-action@0.33.1
        with:
          input: /tmp/image.tar
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy Results
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Snyk Container Test
        run: |
          docker load -i /tmp/image.tar
          snyk container test {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}:${{ github.sha }}`{% endraw %} \
            --severity-threshold=high \
            --file=Dockerfile

  # パフォーマンステスト
  performance-test:
    needs: build-and-scan
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: Run Load Tests
        uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/load-test.js

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json

  # プロダクション展開
  deploy-production:
    needs: [build-and-scan, performance-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    environment: production
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: {% raw %}`${{ secrets.AWS_PROD_ROLE_ARN }}`{% endraw %}
          aws-region: ap-northeast-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Download Image Artifact
        uses: actions/download-artifact@v4
        with:
          name: web-app-image-{% raw %}${{ github.sha }}{% endraw %}
          path: /tmp

      - name: Push to ECR
        run: |
          docker load -i /tmp/image.tar
          docker push {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}:${{ github.sha }}`{% endraw %}
          docker tag {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}:${{ github.sha }}`{% endraw %} \
                     {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}`{% endraw %}:production
          docker push {% raw %}`${{ env.REGISTRY }}/${{ env.REPOSITORY }}`{% endraw %}:production

      - name: Prepare Task Definition Revision
        run: |
          IMAGE="{% raw %}${{ env.REGISTRY }}/${{ env.REPOSITORY }}:${{ github.sha }}{% endraw %}"
          PREVIOUS_TASK_DEF=$(aws ecs describe-services \
            --cluster production \
            --services web-app \
            --query 'services[0].taskDefinition' \
            --output text)
          echo "PREVIOUS_TASK_DEF=$PREVIOUS_TASK_DEF" >> "$GITHUB_ENV"
          aws ecs describe-task-definition \
            --task-definition "$PREVIOUS_TASK_DEF" \
            --query 'taskDefinition' > task-definition.json
          jq --arg IMAGE "$IMAGE" '
            del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
                .compatibilities, .registeredAt, .registeredBy)
            | .containerDefinitions |= map(
                if .name == "web-app" then .image = $IMAGE else . end
              )
          ' task-definition.json > task-definition-rendered.json
          NEW_TASK_DEF=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-rendered.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
          echo "NEW_TASK_DEF=$NEW_TASK_DEF" >> "$GITHUB_ENV"

      - name: Update ECS Service
        run: |
          aws ecs update-service \
            --cluster production \
            --service web-app \
            --task-definition "$NEW_TASK_DEF"

      - name: Wait for Deployment
        run: |
          aws ecs wait services-stable \
            --cluster production \
            --services web-app

      - name: Run Smoke Tests
        run: |
          npm ci
          npm run test:smoke -- --env=production
```

注記: `npm ci` は lockfile 前提です。サンプル用 test プロジェクトに lockfile がない場合は、依存関係を固定した上で `npm install` を使うか、先に lockfile を作成してから CI へ載せてください。

> Verify
> `aws ecs wait services-stable` は ECS サービスの安定化確認であり、ALB / NLB の target health やアプリケーションの readiness までは保証しません。スモークテストの前に、ロードバランサ側の target health が `healthy` であること、または `/health` などのエンドポイントが 200 を返すことを retry 付きで確認してください。

注記: このサンプルは、現在の service が参照している task definition を取得し、`web-app` コンテナだけを commit SHA 付きイメージへ差し替えた新 revision を登録してから、`aws ecs update-service --task-definition ...` で明示的に切り替えます。mutable tag と `--force-new-deployment` の組み合わせだけに依存しない方が、review 対象と実デプロイ対象を一致させやすくなります。

注記: `image.tar` を artifact として受け渡す方法は、ジョブ分離を避けるための最小例です。大きなイメージや複数アーキテクチャを扱う実運用では、build job で ECR へ push し、deploy job は commit SHA や digest で同じイメージを参照する方が扱いやすくなります。可変な `production` tag は人間向けの別名として残してもよいですが、ECS task definition は SHA tag または digest を参照する方が再現しやすくなります。

> Verify
> build job で push した後に `aws ecr describe-images --repository-name ... --image-ids imageTag=${GITHUB_SHA}` などで `imageDigest` を取得し、deploy 時に登録する task definition が同じ SHA tag または `@sha256:` 参照を使っていることを確認してください。ECS は tag 解決時に digest を内部利用できますが、レビュー対象と実際の deploy 対象が一致したことを監査ログから追える形にしておく方が安全です。
> あわせて、`aws ecs describe-services --cluster production --services web-app --query 'services[0].taskDefinition' --output text` で現在の task definition ARN を取得し、`aws ecs describe-task-definition --task-definition ... --query 'taskDefinition.containerDefinitions[*].image'` で期待する SHA tag / digest が実際に参照されていることまで確認してください。

> Rollback
> スモークテストや target health の確認に失敗した場合は、`aws ecs update-service --cluster production --service web-app --task-definition "$PREVIOUS_TASK_DEF"` を実行し、`aws ecs wait services-stable --cluster production --services web-app` と target health の再確認を行ってください。このサンプルでは `PREVIOUS_TASK_DEF` を `GITHUB_ENV` に保存しているため、後続 step から直前 revision へ戻せます。

### イメージ管理のベストプラクティス

**セマンティックバージョニングとタグ戦略**

注記: デプロイ設定で参照するイメージは、`latest` ではなく承認済みの固定タグまたは digest を使ってください。`latest` は人間向けの移動ラベルとして残してもよいですが、ECS / Kubernetes / CDK などの実運用設定では不変参照を優先します。

```python
# 自動タグ生成スクリプト
import re
import subprocess
from datetime import datetime

def generate_tags(branch, commit_sha, existing_tags):
    """
    ブランチとコミット情報から適切なタグを生成
    """
    tags = []

    # 基本タグ
    tags.append(commit_sha[:8])
    tags.append(f"{branch}-{commit_sha[:8]}")

    # ブランチ別タグ戦略
    if branch == "main":
        # セマンティックバージョン
        version = get_next_version(existing_tags)
        tags.extend([
            version,
            # `latest` は人間向けの移動ラベルとしてだけ付ける。
            # ECS / Kubernetes / IaC では version tag や digest を参照する。
            "latest",
            f"v{version}"
        ])
    elif branch == "develop":
        # 開発版タグ
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        tags.extend([
            "develop",
            f"develop-{timestamp}"
        ])
    elif branch.startswith("release/"):
        # リリース候補
        version = branch.split("/")[1]
        tags.extend([
            f"rc-{version}",
            f"rc-{version}-{commit_sha[:8]}"
        ])

    return tags

def get_next_version(existing_tags):
    """
    既存のタグから次のバージョンを決定
    """
    versions = []
    for tag in existing_tags:
        match = re.match(r'^v?(\d+)\.(\d+)\.(\d+)$', tag)
        if match:
            versions.append((
                int(match.group(1)),
                int(match.group(2)),
                int(match.group(3))
            ))

    if not versions:
        return "1.0.0"

    # 最新バージョンを取得
    latest = max(versions)

    # パッチバージョンをインクリメント
    return f"{latest[0]}.{latest[1]}.{latest[2] + 1}"
```

### コンテナのサプライチェーンセキュリティ

**イメージ署名とポリシー**

```yaml
# Notary/DCTによるイメージ署名
# docker-compose.yml
version: '3.8'

services:
  notary-server:
    image: notary:server
    environment:
      - NOTARY_SERVER_DB_URL=mysql://notary@mysql:3306/notaryserver
    depends_on:
      - mysql

  notary-signer:
    image: notary:signer
    environment:
      - NOTARY_SIGNER_DB_URL=mysql://notary@mysql:3306/notarysigner

  mysql:
    image: mysql:5.7
    environment:
      - MYSQL_ALLOW_EMPTY_PASSWORD=yes
    volumes:
      - notary-data:/var/lib/mysql

# 署名ポリシー
admission-policy:
  rules:
    - name: require-signature
      match:
        namespaces: ["production"]
      require:
        - signature:
            keys:
              - keyless:
                  issuer: https://token.actions.githubusercontent.com
                  subject: repo:myorg/myrepo:ref:refs/heads/main
```

Verify:

- `DOCKER_CONTENT_TRUST=1 docker trust inspect --pretty registry.example.com/myapp:signed-tag` のように署名済み tag の signer と digest を確認し、unsigned tag では失敗することも合わせて検証します。
- admission policy を使う場合は、検証 namespace で unsigned image が拒否され、署名済み image だけが許可されることを先に確認します。

Risk:

- この compose 例は `MYSQL_ALLOW_EMPTY_PASSWORD=yes` を含むため、学習用の隔離環境を前提にした最小例です。本番では DB 認証、TLS、署名鍵のバックアップ方針、利用する署名方式の現行サポート状況を別途確認してください。

Cleanup:

- 検証後は `docker compose down -v` で `notary-data` を含む lab 用 volume を削除し、検証用に作成した Content Trust key は `~/.docker/trust/private` から安全に退避または廃棄します。既存の署名運用と共有している鍵は誤って削除しないよう、検証専用ディレクトリで分離する方が安全です。

サーバーレスとコンテナは、それぞれ異なる強みを持つクラウドネイティブ技術です。サーバーレスはイベント駆動で断続的なワークロードに最適であり、コンテナは複雑なアプリケーションや継続的な処理に適しています。重要なのは、それぞれの特性を理解し、適切なワークロードに適切な技術を選択することです。両者を組み合わせることで、スケーラブルで効率的、かつ管理しやすいクラウドネイティブアーキテクチャを実現できます。
---

[第10章](../chapter-chapter10/index.md)へ進む
