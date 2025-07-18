---
title: "第8章：バックアップ・災害復旧戦略"
chapter: chapter08
layout: book
---

# 第8章：バックアップ・災害復旧戦略

## 8.1 クラウドにおけるバックアップ・災害復旧の重要性

### 災害復旧の基本概念

クラウド環境における災害復旧は、従来のオンプレミス環境と比較して、より複雑で多層的なアプローチが必要です。クラウドの分散性と仮想化の特性は、新しい機会と課題の両方を提供します。

**RPO（Recovery Point Objective）とRTO（Recovery Time Objective）の定義**

災害復旧計画の基盤となる2つの重要な指標：

```yaml
RPO (Recovery Point Objective):
  定義: 許容可能なデータ損失の時間
  例:
    - RPO = 1時間: 最大1時間分のデータ損失を許容
    - RPO = 0分: データ損失を一切許容しない
    
RTO (Recovery Time Objective):
  定義: 許容可能な復旧時間
  例:
    - RTO = 4時間: 災害発生から4時間以内に復旧完了
    - RTO = 15分: 15分以内にサービス復旧
```

**災害の分類と影響度**

```yaml
災害レベル分類:
  Level 1 - 軽微な障害:
    - 影響: 一部機能の停止
    - 復旧時間: 数分～数時間
    - 対応: 自動復旧、監視チーム対応
    
  Level 2 - 重大な障害:
    - 影響: サービス全停止
    - 復旧時間: 数時間～1日
    - 対応: 緊急対応チーム召集
    
  Level 3 - 大規模災害:
    - 影響: データセンター全体の停止
    - 復旧時間: 1日～数週間
    - 対応: 事業継続計画（BCP）発動
```

### クラウド災害復旧の利点

**従来のDRとの比較**

```yaml
従来のDR vs クラウドDR:
  初期投資:
    従来: 数億円（DR専用センター構築）
    クラウド: 数万円（設定とテスト）
    
  維持費用:
    従来: 月額数千万円（人件費、設備費）
    クラウド: 月額数十万円～（使用量に応じて）
    
  テスト頻度:
    従来: 年1-2回（高コストのため）
    クラウド: 月1回以上（低コストで実施可能）
    
  地理的分散:
    従来: 限定的（物理的制約）
    クラウド: グローバル（複数リージョン活用）
```

## 8.2 バックアップ戦略の設計

### 3-2-1バックアップルールの現代化

従来の3-2-1ルールをクラウド環境に適応させた戦略：

```yaml
拡張3-2-1-1ルール:
  3つのデータコピー:
    - 本番データ（プライマリ）
    - ローカルバックアップ（同一リージョン）
    - リモートバックアップ（異なるリージョン）
    
  2つの異なるメディア:
    - ディスクベース（高速アクセス）
    - テープ/オブジェクトストレージ（長期保存）
    
  1つのオフサイトバックアップ:
    - 地理的に分散した場所
    - 異なるクラウドプロバイダー（マルチクラウド）
    
  +1つのイミュータブルバックアップ:
    - 変更・削除不可能なバックアップ
    - ランサムウェア対策
```

### データ分類によるバックアップ戦略

```python
class DataClassification:
    def __init__(self):
        self.tiers = {
            'mission_critical': {
                'rpo': 15,  # 15分
                'rto': 30,  # 30分
                'backup_frequency': 'continuous',
                'retention_period': 2555,  # 7年
                'geographic_distribution': 3,  # 3つの地域
                'backup_method': 'synchronous_replication'
            },
            'business_critical': {
                'rpo': 60,  # 1時間
                'rto': 240,  # 4時間
                'backup_frequency': 'hourly',
                'retention_period': 1095,  # 3年
                'geographic_distribution': 2,  # 2つの地域
                'backup_method': 'asynchronous_replication'
            },
            'operational': {
                'rpo': 1440,  # 24時間
                'rto': 1440,  # 24時間
                'backup_frequency': 'daily',
                'retention_period': 365,  # 1年
                'geographic_distribution': 1,  # 1つの地域
                'backup_method': 'scheduled_snapshot'
            },
            'archival': {
                'rpo': 10080,  # 7日
                'rto': 10080,  # 7日
                'backup_frequency': 'weekly',
                'retention_period': 3650,  # 10年
                'geographic_distribution': 1,
                'backup_method': 'cold_storage'
            }
        }
    
    def get_backup_strategy(self, data_type: str) -> dict:
        return self.tiers.get(data_type, self.tiers['operational'])
    
    def calculate_backup_cost(self, data_size_gb: int, data_type: str) -> dict:
        strategy = self.get_backup_strategy(data_type)
        
        # AWS料金を例とした計算
        costs = {
            'primary_storage': data_size_gb * 0.023,  # S3 Standard
            'backup_storage': data_size_gb * 0.0125,  # S3 IA
            'archive_storage': data_size_gb * 0.004,  # S3 Glacier
            'replication_cost': data_size_gb * 0.02,  # Cross-region replication
            'retrieval_cost': data_size_gb * 0.01 * (strategy['retention_period'] / 365)
        }
        
        return costs

# 使用例
classifier = DataClassification()
strategy = classifier.get_backup_strategy('mission_critical')
costs = classifier.calculate_backup_cost(1000, 'mission_critical')

print(f"Mission Critical Data Strategy: {strategy}")
print(f"Annual Backup Cost for 1TB: ${sum(costs.values()):.2f}")
```

## 8.3 クラウドバックアップサービスの実装

### AWS Backup の実装

```python
import boto3
import json
from datetime import datetime, timedelta

class AWSBackupManager:
    def __init__(self, region='us-east-1'):
        self.backup_client = boto3.client('backup', region_name=region)
        self.iam_client = boto3.client('iam', region_name=region)
        
    def create_backup_vault(self, vault_name: str, kms_key_id: str = None):
        """バックアップボルトの作成"""
        try:
            response = self.backup_client.create_backup_vault(
                BackupVaultName=vault_name,
                EncryptionKeyArn=kms_key_id
            )
            return response
        except Exception as e:
            print(f"Error creating backup vault: {e}")
            return None
    
    def create_backup_plan(self, plan_name: str, rules: list):
        """バックアップ計画の作成"""
        backup_plan = {
            'BackupPlanName': plan_name,
            'Rules': rules
        }
        
        try:
            response = self.backup_client.create_backup_plan(
                BackupPlan=backup_plan
            )
            return response
        except Exception as e:
            print(f"Error creating backup plan: {e}")
            return None
    
    def create_backup_selection(self, plan_id: str, selection_name: str, 
                              iam_role_arn: str, resources: list):
        """バックアップ選択の作成"""
        backup_selection = {
            'SelectionName': selection_name,
            'IamRoleArn': iam_role_arn,
            'Resources': resources
        }
        
        try:
            response = self.backup_client.create_backup_selection(
                BackupPlanId=plan_id,
                BackupSelection=backup_selection
            )
            return response
        except Exception as e:
            print(f"Error creating backup selection: {e}")
            return None

# 使用例
backup_manager = AWSBackupManager()

# バックアップボルトの作成
backup_manager.create_backup_vault('production-backup-vault')

# バックアップルールの定義
daily_backup_rule = {
    'RuleName': 'DailyBackup',
    'TargetBackupVault': 'production-backup-vault',
    'ScheduleExpression': 'cron(0 2 ? * * *)',  # 毎日午前2時
    'StartWindowMinutes': 60,
    'CompletionWindowMinutes': 120,
    'Lifecycle': {
        'DeleteAfterDays': 30,
        'MoveToColdStorageAfterDays': 7
    }
}

weekly_backup_rule = {
    'RuleName': 'WeeklyBackup',
    'TargetBackupVault': 'production-backup-vault',
    'ScheduleExpression': 'cron(0 3 ? * SUN *)',  # 毎週日曜日午前3時
    'StartWindowMinutes': 60,
    'CompletionWindowMinutes': 240,
    'Lifecycle': {
        'DeleteAfterDays': 365,
        'MoveToColdStorageAfterDays': 30
    }
}

# バックアップ計画の作成
backup_plan_response = backup_manager.create_backup_plan(
    'production-backup-plan',
    [daily_backup_rule, weekly_backup_rule]
)
```

### Azure Backup の実装

```python
from azure.mgmt.recoveryservices import RecoveryServicesClient
from azure.mgmt.recoveryservicesbackup import RecoveryServicesBackupClient
from azure.identity import DefaultAzureCredential

class AzureBackupManager:
    def __init__(self, subscription_id: str):
        self.credential = DefaultAzureCredential()
        self.recovery_client = RecoveryServicesClient(
            self.credential, subscription_id
        )
        self.backup_client = RecoveryServicesBackupClient(
            self.credential, subscription_id
        )
        
    def create_recovery_vault(self, resource_group: str, vault_name: str, 
                             location: str):
        """Recovery Servicesボルトの作成"""
        vault_parameters = {
            'location': location,
            'sku': {
                'name': 'Standard'
            },
            'properties': {}
        }
        
        try:
            vault = self.recovery_client.vaults.create_or_update(
                resource_group, vault_name, vault_parameters
            )
            return vault
        except Exception as e:
            print(f"Error creating recovery vault: {e}")
            return None
    
    def create_backup_policy(self, vault_name: str, resource_group: str, 
                           policy_name: str, policy_config: dict):
        """バックアップポリシーの作成"""
        policy_parameters = {
            'properties': {
                'backup_management_type': 'AzureIaasVM',
                'schedule_policy': {
                    'schedule_policy_type': 'SimpleSchedulePolicy',
                    'schedule_run_frequency': policy_config['frequency'],
                    'schedule_run_times': policy_config['times'],
                    'schedule_run_days': policy_config.get('days', [])
                },
                'retention_policy': {
                    'retention_policy_type': 'LongTermRetentionPolicy',
                    'daily_schedule': {
                        'retention_duration': {
                            'count': policy_config['daily_retention'],
                            'duration_type': 'Days'
                        }
                    }
                }
            }
        }
        
        try:
            policy = self.backup_client.protection_policies.create_or_update(
                vault_name, resource_group, policy_name, policy_parameters
            )
            return policy
        except Exception as e:
            print(f"Error creating backup policy: {e}")
            return None

# 使用例
azure_backup = AzureBackupManager('your-subscription-id')

# Recovery Servicesボルトの作成
vault = azure_backup.create_recovery_vault(
    'production-rg', 'production-vault', 'japaneast'
)

# バックアップポリシーの作成
policy_config = {
    'frequency': 'Daily',
    'times': ['02:00'],
    'daily_retention': 30
}

policy = azure_backup.create_backup_policy(
    'production-vault', 'production-rg', 'daily-backup-policy', policy_config
)
```

## 8.4 災害復旧計画の策定

### 災害復旧戦略の選択

```yaml
DR戦略の種類:
  1. Backup and Restore (安価):
     - RPO: 時間～日
     - RTO: 時間～日
     - コスト: 低
     - 適用: 非クリティカルシステム
     
  2. Pilot Light (最小限):
     - RPO: 分～時間
     - RTO: 数時間
     - コスト: 中
     - 適用: 重要だが短時間停止許容
     
  3. Warm Standby (準備状態):
     - RPO: 秒～分
     - RTO: 分～時間
     - コスト: 高
     - 適用: ビジネスクリティカル
     
  4. Multi-Site Active/Active (常時稼働):
     - RPO: 0～秒
     - RTO: 0～分
     - コスト: 最高
     - 適用: ミッションクリティカル
```

### 災害復旧テストの自動化

```python
import boto3
import time
from typing import Dict, List

class DisasterRecoveryTester:
    def __init__(self):
        self.ec2 = boto3.client('ec2')
        self.rds = boto3.client('rds')
        self.s3 = boto3.client('s3')
        
    def test_backup_restore(self, resources: Dict) -> Dict:
        """バックアップからの復旧テスト"""
        test_results = {
            'start_time': time.time(),
            'tests': [],
            'success_count': 0,
            'failure_count': 0
        }
        
        for resource_type, resource_configs in resources.items():
            if resource_type == 'ec2':
                result = self._test_ec2_recovery(resource_configs)
            elif resource_type == 'rds':
                result = self._test_rds_recovery(resource_configs)
            elif resource_type == 's3':
                result = self._test_s3_recovery(resource_configs)
            else:
                result = {'status': 'skipped', 'reason': 'unknown resource type'}
            
            test_results['tests'].append({
                'resource_type': resource_type,
                'resource_id': resource_configs.get('id'),
                'result': result
            })
            
            if result['status'] == 'success':
                test_results['success_count'] += 1
            else:
                test_results['failure_count'] += 1
        
        test_results['end_time'] = time.time()
        test_results['duration'] = test_results['end_time'] - test_results['start_time']
        
        return test_results
    
    def _test_ec2_recovery(self, config: Dict) -> Dict:
        """EC2インスタンスの復旧テスト"""
        try:
            # スナップショットからのAMI作成
            snapshot_id = config['snapshot_id']
            ami_response = self.ec2.create_image(
                InstanceId=config['instance_id'],
                Name=f"dr-test-{int(time.time())}",
                NoReboot=True
            )
            
            # AMIの準備完了を待機
            ami_id = ami_response['ImageId']
            waiter = self.ec2.get_waiter('image_available')
            waiter.wait(ImageIds=[ami_id])
            
            # テストインスタンスの起動
            instance_response = self.ec2.run_instances(
                ImageId=ami_id,
                MinCount=1,
                MaxCount=1,
                InstanceType=config['instance_type'],
                KeyName=config.get('key_name'),
                SecurityGroupIds=config.get('security_groups', []),
                SubnetId=config.get('subnet_id'),
                TagSpecifications=[{
                    'ResourceType': 'instance',
                    'Tags': [{'Key': 'Name', 'Value': 'DR-Test-Instance'}]
                }]
            )
            
            instance_id = instance_response['Instances'][0]['InstanceId']
            
            # インスタンスの起動完了を待機
            waiter = self.ec2.get_waiter('instance_running')
            waiter.wait(InstanceIds=[instance_id])
            
            # 健全性チェック
            health_check = self._perform_health_check(instance_id)
            
            # クリーンアップ
            self.ec2.terminate_instances(InstanceIds=[instance_id])
            
            return {
                'status': 'success',
                'instance_id': instance_id,
                'health_check': health_check,
                'message': 'EC2 recovery test completed successfully'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'EC2 recovery test failed'
            }
    
    def _test_rds_recovery(self, config: Dict) -> Dict:
        """RDSの復旧テスト"""
        try:
            # スナップショットからのDB復元
            snapshot_id = config['snapshot_id']
            test_db_identifier = f"dr-test-{int(time.time())}"
            
            restore_response = self.rds.restore_db_instance_from_db_snapshot(
                DBInstanceIdentifier=test_db_identifier,
                DBSnapshotIdentifier=snapshot_id,
                DBInstanceClass=config['instance_class'],
                MultiAZ=False,  # テスト用なのでSingle-AZ
                PubliclyAccessible=False,
                AutoMinorVersionUpgrade=False,
                Tags=[{'Key': 'Purpose', 'Value': 'DR-Test'}]
            )
            
            # DB復元完了を待機
            waiter = self.rds.get_waiter('db_instance_available')
            waiter.wait(DBInstanceIdentifier=test_db_identifier)
            
            # 接続テスト
            connection_test = self._test_db_connection(test_db_identifier)
            
            # クリーンアップ
            self.rds.delete_db_instance(
                DBInstanceIdentifier=test_db_identifier,
                SkipFinalSnapshot=True
            )
            
            return {
                'status': 'success',
                'db_identifier': test_db_identifier,
                'connection_test': connection_test,
                'message': 'RDS recovery test completed successfully'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'RDS recovery test failed'
            }
    
    def _test_s3_recovery(self, config: Dict) -> Dict:
        """S3の復旧テスト"""
        try:
            source_bucket = config['source_bucket']
            test_bucket = config['test_bucket']
            
            # バックアップバケットからのデータ復元
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=source_bucket)
            
            objects_restored = 0
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        copy_source = {'Bucket': source_bucket, 'Key': obj['Key']}
                        self.s3.copy_object(
                            CopySource=copy_source,
                            Bucket=test_bucket,
                            Key=obj['Key']
                        )
                        objects_restored += 1
            
            # 整合性チェック
            integrity_check = self._verify_s3_integrity(source_bucket, test_bucket)
            
            return {
                'status': 'success',
                'objects_restored': objects_restored,
                'integrity_check': integrity_check,
                'message': 'S3 recovery test completed successfully'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'S3 recovery test failed'
            }
    
    def _perform_health_check(self, instance_id: str) -> Dict:
        """インスタンスの健全性チェック"""
        try:
            response = self.ec2.describe_instance_status(InstanceIds=[instance_id])
            if response['InstanceStatuses']:
                status = response['InstanceStatuses'][0]
                return {
                    'instance_status': status['InstanceStatus']['Status'],
                    'system_status': status['SystemStatus']['Status'],
                    'healthy': status['InstanceStatus']['Status'] == 'ok'
                }
            return {'healthy': False, 'reason': 'No status information available'}
        except Exception as e:
            return {'healthy': False, 'error': str(e)}
    
    def _test_db_connection(self, db_identifier: str) -> Dict:
        """データベース接続テスト"""
        try:
            response = self.rds.describe_db_instances(DBInstanceIdentifier=db_identifier)
            db_instance = response['DBInstances'][0]
            
            return {
                'status': db_instance['DBInstanceStatus'],
                'engine': db_instance['Engine'],
                'connectable': db_instance['DBInstanceStatus'] == 'available'
            }
        except Exception as e:
            return {'connectable': False, 'error': str(e)}
    
    def _verify_s3_integrity(self, source_bucket: str, test_bucket: str) -> Dict:
        """S3データの整合性チェック"""
        try:
            source_objects = self._list_s3_objects(source_bucket)
            test_objects = self._list_s3_objects(test_bucket)
            
            return {
                'source_count': len(source_objects),
                'test_count': len(test_objects),
                'match': len(source_objects) == len(test_objects)
            }
        except Exception as e:
            return {'match': False, 'error': str(e)}
    
    def _list_s3_objects(self, bucket_name: str) -> List[str]:
        """S3バケット内のオブジェクト一覧を取得"""
        objects = []
        paginator = self.s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name)
        
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects.append(obj['Key'])
        
        return objects

# 使用例
dr_tester = DisasterRecoveryTester()

test_resources = {
    'ec2': {
        'instance_id': 'i-1234567890abcdef0',
        'snapshot_id': 'snap-1234567890abcdef0',
        'instance_type': 't3.micro',
        'key_name': 'my-key-pair',
        'security_groups': ['sg-1234567890abcdef0'],
        'subnet_id': 'subnet-1234567890abcdef0'
    },
    'rds': {
        'snapshot_id': 'rds:production-db-2023-07-18-06-00',
        'instance_class': 'db.t3.micro'
    },
    's3': {
        'source_bucket': 'production-backup-bucket',
        'test_bucket': 'dr-test-bucket'
    }
}

test_results = dr_tester.test_backup_restore(test_resources)
print(f"DR Test Results: {test_results}")
```

## 8.5 事業継続計画（BCP）の策定

### 包括的なBCP戦略

```yaml
BCP構成要素:
  1. 事業影響度分析 (BIA):
     - クリティカルプロセスの特定
     - 復旧時間目標の設定
     - 復旧優先度の決定
     
  2. リスクアセスメント:
     - 脅威の識別と分析
     - 脆弱性の評価
     - 影響度の算出
     
  3. 継続戦略:
     - 代替手段の確保
     - 代替拠点の準備
     - 代替人員の確保
     
  4. 対応計画:
     - 初期対応手順
     - 復旧手順
     - 通信計画
     
  5. 訓練と維持:
     - 定期的な訓練
     - 計画の更新
     - 有効性の検証
```

### 通信計画の自動化

```python
import boto3
import json
from datetime import datetime
from typing import List, Dict

class CommunicationManager:
    def __init__(self):
        self.sns = boto3.client('sns')
        self.ses = boto3.client('ses')
        self.slack_webhook = None  # Slack Webhook URL
        
    def send_disaster_notification(self, severity: str, message: str, 
                                 recipients: List[str]) -> Dict:
        """災害通知の送信"""
        
        notification_channels = {
            'critical': ['sms', 'email', 'slack', 'phone'],
            'high': ['email', 'slack'],
            'medium': ['email'],
            'low': ['slack']
        }
        
        channels = notification_channels.get(severity, ['email'])
        results = {}
        
        for channel in channels:
            if channel == 'sms':
                results['sms'] = self._send_sms(message, recipients)
            elif channel == 'email':
                results['email'] = self._send_email(message, recipients)
            elif channel == 'slack':
                results['slack'] = self._send_slack(message)
            elif channel == 'phone':
                results['phone'] = self._initiate_phone_calls(message, recipients)
        
        return results
    
    def _send_sms(self, message: str, recipients: List[str]) -> Dict:
        """SMS通知の送信"""
        results = {'success': [], 'failures': []}
        
        for recipient in recipients:
            try:
                response = self.sns.publish(
                    PhoneNumber=recipient,
                    Message=message,
                    Subject='Disaster Recovery Alert'
                )
                results['success'].append(recipient)
            except Exception as e:
                results['failures'].append({'recipient': recipient, 'error': str(e)})
        
        return results
    
    def _send_email(self, message: str, recipients: List[str]) -> Dict:
        """Email通知の送信"""
        results = {'success': [], 'failures': []}
        
        for recipient in recipients:
            try:
                response = self.ses.send_email(
                    Source='noreply@company.com',
                    Destination={'ToAddresses': [recipient]},
                    Message={
                        'Subject': {'Data': 'Disaster Recovery Alert'},
                        'Body': {'Text': {'Data': message}}
                    }
                )
                results['success'].append(recipient)
            except Exception as e:
                results['failures'].append({'recipient': recipient, 'error': str(e)})
        
        return results
    
    def _send_slack(self, message: str) -> Dict:
        """Slack通知の送信"""
        if not self.slack_webhook:
            return {'status': 'skipped', 'reason': 'webhook not configured'}
        
        try:
            import requests
            payload = {
                'text': f"🚨 DISASTER RECOVERY ALERT 🚨\n{message}",
                'channel': '#incident-response',
                'username': 'DR-Bot'
            }
            
            response = requests.post(self.slack_webhook, json=payload)
            return {'status': 'success', 'response': response.status_code}
        except Exception as e:
            return {'status': 'failure', 'error': str(e)}
    
    def _initiate_phone_calls(self, message: str, recipients: List[str]) -> Dict:
        """自動音声通話の開始"""
        results = {'success': [], 'failures': []}
        
        # Amazon Connect または他のVoIPサービスを使用
        # この例では、SNSを使用した簡単な実装
        
        for recipient in recipients:
            try:
                # 音声メッセージの作成
                voice_message = f"This is an automated disaster recovery alert. {message}"
                
                # 音声通話の開始（実際の実装では、Connect APIを使用）
                response = self.sns.publish(
                    PhoneNumber=recipient,
                    Message=voice_message,
                    MessageAttributes={
                        'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
                    }
                )
                results['success'].append(recipient)
            except Exception as e:
                results['failures'].append({'recipient': recipient, 'error': str(e)})
        
        return results

# 使用例
comm_manager = CommunicationManager()

# 災害通知の送信
notification_result = comm_manager.send_disaster_notification(
    severity='critical',
    message='Primary data center is down. Initiating DR procedures.',
    recipients=['+1234567890', 'admin@company.com']
)
```

## 8.6 ランサムウェア対策

### イミュータブルバックアップの実装

```python
import boto3
import json
from datetime import datetime, timedelta

class ImmutableBackupManager:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.iam = boto3.client('iam')
        
    def create_immutable_backup_bucket(self, bucket_name: str, 
                                     retention_days: int = 2555) -> Dict:
        """イミュータブルバックアップ用のS3バケットを作成"""
        try:
            # バケットの作成
            self.s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': 'ap-northeast-1'}
            )
            
            # バージョニングの有効化
            self.s3.put_bucket_versioning(
                Bucket=bucket_name,
                VersioningConfiguration={'Status': 'Enabled'}
            )
            
            # Object Lockの設定
            self.s3.put_object_lock_configuration(
                Bucket=bucket_name,
                ObjectLockConfiguration={
                    'ObjectLockEnabled': 'Enabled',
                    'Rule': {
                        'DefaultRetention': {
                            'Mode': 'GOVERNANCE',
                            'Days': retention_days
                        }
                    }
                }
            )
            
            # パブリックアクセスのブロック
            self.s3.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': True,
                    'IgnorePublicAcls': True,
                    'BlockPublicPolicy': True,
                    'RestrictPublicBuckets': True
                }
            )
            
            # バケットポリシーの設定
            bucket_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "DenyDeleteObject",
                        "Effect": "Deny",
                        "Principal": "*",
                        "Action": [
                            "s3:DeleteObject",
                            "s3:DeleteObjectVersion"
                        ],
                        "Resource": f"arn:aws:s3:::{bucket_name}/*",
                        "Condition": {
                            "StringNotEquals": {
                                "aws:PrincipalServiceName": "backup.amazonaws.com"
                            }
                        }
                    }
                ]
            }
            
            self.s3.put_bucket_policy(
                Bucket=bucket_name,
                Policy=json.dumps(bucket_policy)
            )
            
            return {
                'status': 'success',
                'bucket_name': bucket_name,
                'retention_days': retention_days,
                'message': 'Immutable backup bucket created successfully'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'Failed to create immutable backup bucket'
            }
    
    def create_backup_with_legal_hold(self, bucket_name: str, 
                                    source_data: str, key: str) -> Dict:
        """Legal Holdを設定したバックアップの作成"""
        try:
            # オブジェクトのアップロード
            self.s3.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=source_data,
                ObjectLockMode='GOVERNANCE',
                ObjectLockRetainUntilDate=datetime.now() + timedelta(days=365),
                ObjectLockLegalHoldStatus='ON'
            )
            
            # メタデータの追加
            self.s3.put_object_tagging(
                Bucket=bucket_name,
                Key=key,
                Tagging={
                    'TagSet': [
                        {'Key': 'BackupType', 'Value': 'Immutable'},
                        {'Key': 'CreatedDate', 'Value': datetime.now().isoformat()},
                        {'Key': 'LegalHold', 'Value': 'Active'}
                    ]
                }
            )
            
            return {
                'status': 'success',
                'bucket_name': bucket_name,
                'key': key,
                'message': 'Backup created with legal hold'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'Failed to create backup with legal hold'
            }
    
    def verify_backup_integrity(self, bucket_name: str, key: str) -> Dict:
        """バックアップの整合性チェック"""
        try:
            # オブジェクトのメタデータ取得
            response = self.s3.head_object(Bucket=bucket_name, Key=key)
            
            # Object Lock設定の確認
            lock_response = self.s3.get_object_legal_hold(Bucket=bucket_name, Key=key)
            
            # 整合性チェック
            integrity_check = {
                'object_exists': True,
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'etag': response['ETag'],
                'legal_hold': lock_response['LegalHold']['Status'],
                'retention_mode': response.get('ObjectLockMode'),
                'retention_until': response.get('ObjectLockRetainUntilDate')
            }
            
            return {
                'status': 'success',
                'integrity_check': integrity_check,
                'message': 'Backup integrity verified'
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'message': 'Failed to verify backup integrity'
            }

# 使用例
immutable_backup = ImmutableBackupManager()

# イミュータブルバックアップバケットの作成
bucket_result = immutable_backup.create_immutable_backup_bucket(
    'production-immutable-backups',
    retention_days=2555  # 7年保持
)

# Legal Holdを設定したバックアップの作成
backup_result = immutable_backup.create_backup_with_legal_hold(
    'production-immutable-backups',
    'important_data_content',
    'database_backup_2023_07_18.sql'
)

# バックアップの整合性チェック
integrity_result = immutable_backup.verify_backup_integrity(
    'production-immutable-backups',
    'database_backup_2023_07_18.sql'
)
```

## まとめ：持続可能な災害復旧戦略

効果的なバックアップ・災害復旧戦略の実装には、以下の要素が重要です：

### 重要な実装ポイント

1. **段階的なアプローチ**
   - 基本的なバックアップから開始
   - 徐々にDR機能を強化
   - 定期的なテストと改善

2. **コストと効果のバランス**
   - ビジネス要件に応じた戦略選択
   - 適切なRPO/RTOの設定
   - クラウドの経済性を活用

3. **自動化の推進**
   - 手動プロセスの最小化
   - 継続的なテスト実行
   - 迅速な復旧対応

4. **セキュリティの確保**
   - イミュータブルバックアップ
   - 暗号化の実装
   - アクセス制御の強化

5. **組織的な準備**
   - 明確な役割分担
   - 定期的な訓練
   - 通信計画の整備

クラウド環境の特性を活かした災害復旧戦略により、従来よりも低コストで高い復旧能力を実現できます。重要なのは、組織のリスク許容度とビジネス要件に応じた適切な戦略を選択し、継続的に改善することです。

---

[第09章](../chapter-chapter09/index.md)へ進む