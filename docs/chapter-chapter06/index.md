---
layout: book
order: 8
title: "第6章：IAMとセキュリティ実践"
---

# 第6章：IAMとセキュリティ実践

## はじめに

クラウド環境におけるセキュリティは、従来のオンプレミス環境とは根本的に異なるアプローチを必要とします。物理的な境界が存在しない分散環境では、アイデンティティとアクセス管理（IAM）が新しいセキュリティの境界線となります。

本章では、ゼロトラストセキュリティモデルに基づいた実践的なセキュリティ実装を学びます。IAMの設計から始まり、多層防御、継続的な監視、そして脆弱性管理まで、クラウドセキュリティの全体像を体系的に理解し、実装できるようになることを目指します。

本章はおおよそ「概念 40% / 実装 60%」程度のバランスを想定しています。まずはゼロトラストやRBACといった考え方を押さえたうえで、必要に応じてコード例を設計のヒントとして参照する読み方を推奨します。コードの細部まで理解・改変できなくても、本章の学習を進めることは可能です。

## 6.1 ロールベースのアクセス制御（RBAC）

### アイデンティティが新しい境界線である理由

クラウド時代において、従来の城壁型セキュリティモデルは崩壊しました。物理的な境界線が存在しない分散環境では、「誰が何にアクセスできるか」を制御するアイデンティティとアクセス管理が、セキュリティの最前線となっています。

**ゼロトラストの具現化**

RBACは、ゼロトラストセキュリティモデルの中核を成す実装です。  
すべてのアクセスは明示的に許可されなければならず、役割（ロール）に基づいて必要最小限の権限だけが付与されます。この原則が徹底されているほど、誤操作や侵害発生時の被害範囲を小さく抑えやすくなり、内部脅威と外部脅威の両方から組織を保護しやすくなります。

以下のコード例は、ゼロトラスト原則を整理するための学習用サンプルです。本番環境のIAMポリシーを設計する際は、自組織のセキュリティポリシーやコンプライアンス要件に従い、ここで示す権限よりもさらに細かく絞り込むことを前提としてください。特に削除系アクションや権限変更に関する操作は、厳格なレビューと制約のもとでのみ許可する設計が望まれます。

```python
class ZeroTrustRBAC:
    """
    ゼロトラストに基づくRBACの実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        
    def implement_zero_trust_principles(self):
        """
        ゼロトラスト原則の実装
        """
        zero_trust_principles = {
            'never_trust_always_verify': {
                'description': '全てのアクセス要求を検証',
                'implementation': [
                    'MFA必須化',
                    'セッションの定期的な再認証',
                    'アクセスコンテキストの評価'
                ]
            },
            'least_privilege': {
                'description': '最小権限の原則',
                'implementation': [
                    '必要最小限の権限のみ付与',
                    '時限的な権限昇格',
                    '未使用権限の定期的な削除'
                ]
            },
            'assume_breach': {
                'description': '侵害を前提とした設計',
                'implementation': [
                    '権限の細分化',
                    '横展開の防止',
                    '監査ログの徹底'
                ]
            }
        }
        
        return zero_trust_principles
```

### 効果的なロール設計の原則

**職務分離（Separation of Duties）**

単一の個人やロールが、重要なプロセス全体を制御できないようにする設計原則です。
以下のコード例では、開発者、運用エンジニア、セキュリティ監査といった代表的なロール分割を示しています。実際の環境では、ここで挙げているアクション一覧をそのまま使用するのではなく、自組織のリスク許容度や役割分担に応じて、より細かく権限を絞り込む前提で読み進めてください。

```python
class RoleDesignPrinciples:
    """
    ロール設計の原則と実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def create_separation_of_duties(self):
        """
        職務分離の実装
        """
        # 開発者ロール
        developer_role = {
            'RoleName': 'DeveloperRole',
            'AssumeRolePolicyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:root'},
                    'Action': 'sts:AssumeRole',
                    'Condition': {
                        'Bool': {'aws:MultiFactorAuthPresent': 'true'}
                    }
                }]
            },
            'Policies': [{
                'PolicyName': 'DeveloperAccess',
                'PolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Effect': 'Allow',
                            'Action': [
                                'ec2:*',
                                'rds:*',
                                'lambda:*'
                            ],
                            'Resource': '*',
                            'Condition': {
                                'StringEquals': {
                                    'aws:RequestedRegion': ['us-east-1', 'us-west-2']
                                }
                            }
                        },
                        {
                            'Effect': 'Deny',
                            'Action': [
                                'iam:*',
                                'kms:Delete*',
                                'rds:DeleteDBInstance'
                            ],
                            'Resource': '*'
                        }
                    ]
                }
            }]
        }
        
        # 運用エンジニアロール
        operations_role = {
            'RoleName': 'OperationsEngineerRole',
            'AssumeRolePolicyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:root'},
                    'Action': 'sts:AssumeRole',
                    'Condition': {
                        'IpAddress': {'aws:SourceIp': ['10.0.0.0/8']},
                        'Bool': {'aws:MultiFactorAuthPresent': 'true'}
                    }
                }]
            },
            'Policies': [{
                'PolicyName': 'OperationsAccess',
                'PolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Effect': 'Allow',
                            'Action': [
                                'cloudwatch:*',
                                'logs:*',
                                'ec2:Describe*',
                                'ec2:StartInstances',
                                'ec2:StopInstances',
                                'autoscaling:*'
                            ],
                            'Resource': '*'
                        },
                        {
                            'Effect': 'Deny',
                            'Action': [
                                'ec2:TerminateInstances',
                                's3:DeleteBucket',
                                'rds:DeleteDBCluster'
                            ],
                            'Resource': '*'
                        }
                    ]
                }
            }]
        }
        
        # セキュリティ監査ロール
        security_auditor_role = {
            'RoleName': 'SecurityAuditorRole',
            'AssumeRolePolicyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:root'},
                    'Action': 'sts:AssumeRole'
                }]
            },
            'Policies': [{
                'PolicyName': 'AuditorReadOnly',
                'PolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Action': [
                            '*:Describe*',
                            '*:Get*',
                            '*:List*',
                            'cloudtrail:LookupEvents',
                            'config:SelectResourceConfig',
                            'trustedadvisor:Describe*'
                        ],
                        'Resource': '*'
                    }]
                }
            }]
        }
        
        return {
            'developer': developer_role,
            'operations': operations_role,
            'auditor': security_auditor_role
        }
```

**階層的ロール構造**

組織構造を反映した階層的なロール設計により、管理の複雑さを軽減：

```python
class HierarchicalRoleStructure:
    """
    階層的ロール構造の実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def create_role_hierarchy(self):
        """
        階層的なロール構造の作成
        """
        role_hierarchy = {
            'organization_admin': {
                'level': 1,
                'permissions': ['Full administrative access'],
                'max_session_duration': 3600,  # 1 hour
                'require_mfa': True,
                'ip_restriction': True
            },
            'department_admin': {
                'level': 2,
                'permissions': ['Department resources management'],
                'max_session_duration': 7200,  # 2 hours
                'require_mfa': True,
                'inherit_from': None
            },
            'project_manager': {
                'level': 3,
                'permissions': ['Project resources management'],
                'max_session_duration': 14400,  # 4 hours
                'require_mfa': True,
                'scope': 'Tagged resources only'
            },
            'developer': {
                'level': 4,
                'permissions': ['Development environment access'],
                'max_session_duration': 28800,  # 8 hours
                'require_mfa': False,
                'environment_restriction': ['dev', 'test']
            },
            'readonly_user': {
                'level': 5,
                'permissions': ['Read-only access'],
                'max_session_duration': 43200,  # 12 hours
                'require_mfa': False
            }
        }
        
        # 権限境界の実装
        permission_boundary = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Action': '*',
                'Resource': '*',
                'Condition': {
                    'StringEquals': {
                        'aws:RequestedRegion': ['us-east-1', 'us-west-2']
                    }
                }
            }, {
                'Effect': 'Deny',
                'Action': [
                    'iam:DeleteRole',
                    'iam:DeleteRolePolicy',
                    'iam:DeleteUser',
                    'iam:DeleteUserPolicy',
                    'iam:DeleteGroup',
                    'iam:DeleteGroupPolicy'
                ],
                'Resource': '*'
            }]
        }
        
        return {
            'hierarchy': role_hierarchy,
            'permission_boundary': permission_boundary
        }
    
    def implement_role_inheritance(self):
        """
        ロール継承の実装
        """
        inheritance_model = {
            'base_permissions': {
                'description': 'すべてのロールが継承する基本権限',
                'policies': [
                    'arn:aws:iam::aws:policy/ReadOnlyAccess',
                    'CustomBasePolicy'
                ]
            },
            'role_composition': {
                'full_stack_developer': [
                    'base_developer_role',
                    'frontend_permissions',
                    'backend_permissions',
                    'database_read_permissions'
                ],
                'devops_engineer': [
                    'base_developer_role',
                    'operations_permissions',
                    'ci_cd_permissions',
                    'monitoring_permissions'
                ],
                'data_scientist': [
                    'base_developer_role',
                    's3_data_lake_access',
                    'sagemaker_permissions',
                    'athena_permissions'
                ]
            }
        }
        
        return inheritance_model
```

### 動的な権限管理

**Just-In-Time（JIT）アクセス**

常時付与される権限を最小化し、必要な時にのみ一時的に昇格：

```python
class JustInTimeAccess:
    """
    Just-In-Timeアクセスの実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.sts = boto3.client('sts')
        self.lambda_client = boto3.client('lambda')
    
    def implement_jit_access(self):
        """
        JITアクセスシステムの実装
        """
        # Lambda関数によるJITアクセス承認
        jit_lambda_function = """
        import json
        import boto3
        from datetime import datetime, timedelta
        
        def lambda_handler(event, context):
            sts = boto3.client('sts')
            
            # リクエストの検証
            request = json.loads(event['body'])
            user_arn = request['user_arn']
            requested_role = request['requested_role']
            reason = request['reason']
            duration = request.get('duration', 3600)  # デフォルト1時間
            
            # 承認ロジック
            if not validate_request(user_arn, requested_role, reason):
                return {
                    'statusCode': 403,
                    'body': json.dumps({'error': 'Access denied'})
                }
            
            # 一時的なセッションの作成
            session_name = f"JIT-{user_arn.split('/')[-1]}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            assumed_role = sts.assume_role(
                RoleArn=requested_role,
                RoleSessionName=session_name,
                DurationSeconds=duration,
                Policy=json.dumps({
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Action': '*',
                        'Resource': '*',
                        'Condition': {
                            'DateLessThan': {
                                'aws:CurrentTime': (datetime.now() + timedelta(seconds=duration)).isoformat()
                            }
                        }
                    }]
                })
            )
            
            # 監査ログの記録
            log_access_request(user_arn, requested_role, reason, duration)
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'credentials': {
                        'access_key_id': assumed_role['Credentials']['AccessKeyId'],
                        'secret_access_key': assumed_role['Credentials']['SecretAccessKey'],
                        'session_token': assumed_role['Credentials']['SessionToken'],
                        'expiration': assumed_role['Credentials']['Expiration'].isoformat()
                    }
                })
            }
        
        def validate_request(user_arn, requested_role, reason):
            # ビジネスロジックに基づく検証
            # 例：ユーザーの所属部門、リクエストされたロールの種類、理由の妥当性
            return True
        
        def log_access_request(user_arn, requested_role, reason, duration):
            # CloudWatch Logsへの記録
            pass
        """
        
        # JITアクセスワークフロー
        jit_workflow = {
            'request_phase': {
                'user_action': 'Request elevated access',
                'required_info': ['Target role', 'Reason', 'Duration'],
                'validation': ['User eligibility', 'Role compatibility']
            },
            'approval_phase': {
                'automatic_approval': {
                    'conditions': [
                        'Pre-approved role list',
                        'Business hours',
                        'Low-risk operations'
                    ]
                },
                'manual_approval': {
                    'conditions': [
                        'High-privilege roles',
                        'Production access',
                        'After hours'
                    ],
                    'approvers': ['Manager', 'Security team']
                }
            },
            'access_phase': {
                'credential_delivery': 'Secure API',
                'session_monitoring': 'Real-time activity tracking',
                'auto_revocation': 'Time-based expiration'
            },
            'audit_phase': {
                'logging': 'All requests and activities',
                'reporting': 'Weekly access reports',
                'analysis': 'Anomaly detection'
            }
        }
        
        return {
            'implementation': jit_lambda_function,
            'workflow': jit_workflow
        }
```

**条件付きアクセス**

権限の付与に条件を設定することで、より細かい制御を実現：

```python
class ConditionalAccess:
    """
    条件付きアクセスの実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def create_conditional_policies(self):
        """
        条件付きアクセスポリシーの作成
        """
        # 時間ベースのアクセス制御
        time_based_policy = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Action': ['ec2:*', 'rds:*'],
                'Resource': '*',
                'Condition': {
                    'DateGreaterThan': {
                        'aws:CurrentTime': '08:00:00Z'
                    },
                    'DateLessThan': {
                        'aws:CurrentTime': '18:00:00Z'
                    },
                    'ForAllValues:StringEquals': {
                        'aws:RequestedRegion': ['us-east-1', 'us-west-2']
                    }
                }
            }]
        }
        
        # 場所ベースのアクセス制御
        location_based_policy = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Action': '*',
                'Resource': '*',
                'Condition': {
                    'IpAddress': {
                        'aws:SourceIp': [
                            '203.0.113.0/24',  # Office network
                            '198.51.100.0/24'  # VPN range
                        ]
                    }
                }
            }, {
                'Effect': 'Deny',
                'Action': [
                    's3:DeleteBucket',
                    'ec2:TerminateInstances',
                    'rds:DeleteDBInstance'
                ],
                'Resource': '*',
                'Condition': {
                    'Bool': {
                        'aws:SecureTransport': 'false'
                    }
                }
            }]
        }
        
        # デバイスベースのアクセス制御
        device_based_policy = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Action': '*',
                'Resource': '*',
                'Condition': {
                    'StringLike': {
                        'aws:userid': 'AIDAI*'  # 管理されたデバイスのパターン
                    },
                    'Bool': {
                        'aws:MultiFactorAuthPresent': 'true'
                    }
                }
            }]
        }
        
        # リスクベースのアクセス制御
        risk_based_policy = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Deny',
                'Action': [
                    'iam:CreateAccessKey',
                    'iam:DeleteAccessKey',
                    'sts:AssumeRole'
                ],
                'Resource': '*',
                'Condition': {
                    'NumericGreaterThan': {
                        'aws:MultiFactorAuthAge': '3600'  # MFA認証から1時間以上経過
                    }
                }
            }]
        }
        
        return {
            'time_based': time_based_policy,
            'location_based': location_based_policy,
            'device_based': device_based_policy,
            'risk_based': risk_based_policy
        }
```

### RBACの実装パターン

**グループベースの管理**

個々のユーザーではなく、グループに権限を付与：

```python
class GroupBasedManagement:
    """
    グループベースの権限管理
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.sso = boto3.client('sso-admin')
    
    def implement_group_management(self):
        """
        グループベースの管理実装
        """
        # グループ構造の設計
        group_structure = {
            'organizational_groups': {
                'Engineering': {
                    'subgroups': ['Backend', 'Frontend', 'DevOps', 'QA'],
                    'base_permissions': ['DeveloperAccess'],
                    'additional_permissions': {
                        'Backend': ['DatabaseAccess'],
                        'Frontend': ['CloudFrontAccess'],
                        'DevOps': ['FullStackAccess'],
                        'QA': ['TestEnvironmentAccess']
                    }
                },
                'Operations': {
                    'subgroups': ['SRE', 'Support', 'Monitoring'],
                    'base_permissions': ['OperationsReadOnly'],
                    'additional_permissions': {
                        'SRE': ['IncidentResponseAccess'],
                        'Support': ['CustomerDataReadOnly'],
                        'Monitoring': ['CloudWatchFullAccess']
                    }
                },
                'Security': {
                    'subgroups': ['Audit', 'Compliance', 'IR'],
                    'base_permissions': ['SecurityAuditAccess'],
                    'additional_permissions': {
                        'Audit': ['FullReadOnlyAccess'],
                        'Compliance': ['ConfigRulesAccess'],
                        'IR': ['ForensicsAccess']
                    }
                }
            }
        }
        
        # SSO統合によるグループマッピング
        sso_group_mapping = {
            'identity_provider': 'Active Directory',
            'attribute_mapping': {
                'department': 'aws:PrincipalTag/Department',
                'team': 'aws:PrincipalTag/Team',
                'role': 'aws:PrincipalTag/Role'
            },
            'permission_sets': {
                'DeveloperAccess': {
                    'session_duration': 'PT8H',
                    'managed_policies': [
                        'arn:aws:iam::aws:policy/PowerUserAccess'
                    ],
                    'inline_policy': {
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Deny',
                            'Action': ['iam:*', 'organizations:*'],
                            'Resource': '*'
                        }]
                    }
                }
            }
        }
        
        # 動的グループメンバーシップ
        dynamic_membership = """
        def assign_user_to_groups(user_attributes):
            groups = []
            
            # 部門に基づく基本グループ
            if user_attributes.get('department') == 'Engineering':
                groups.append('Engineering')
                
                # プロジェクトに基づくサブグループ
                if user_attributes.get('project') == 'ProductA':
                    groups.append('ProductA-Dev')
                    
                # スキルに基づく特殊グループ
                if 'kubernetes' in user_attributes.get('skills', []):
                    groups.append('K8s-Admins')
            
            # 臨時プロジェクトグループ
            if user_attributes.get('temp_project'):
                groups.append(f"Temp-{user_attributes['temp_project']}")
            
            return groups
        """
        
        return {
            'structure': group_structure,
            'sso_mapping': sso_group_mapping,
            'dynamic_membership': dynamic_membership
        }
```

**ロールの合成と継承**

複数の基本ロールを組み合わせて複雑な権限セットを構築：

```python
class RoleComposition:
    """
    ロールの合成と継承
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def implement_role_composition(self):
        """
        ロール合成の実装
        """
        # 基本ロールの定義
        base_roles = {
            'ReadOnlyBase': {
                'description': '読み取り専用の基本権限',
                'policies': ['arn:aws:iam::aws:policy/ReadOnlyAccess']
            },
            'DeveloperBase': {
                'description': '開発者の基本権限',
                'policies': [
                    'EC2InstanceConnect',
                    'CloudWatchLogsAccess',
                    'XRayAccess'
                ]
            },
            'OperationsBase': {
                'description': '運用の基本権限',
                'policies': [
                    'CloudWatchFullAccess',
                    'AutoScalingFullAccess',
                    'ElasticLoadBalancingFullAccess'
                ]
            }
        }
        
        # 合成ロールの作成
        composite_roles = {
            'FullStackDeveloper': {
                'base_roles': ['ReadOnlyBase', 'DeveloperBase'],
                'additional_policies': [{
                    'PolicyName': 'FullStackAdditions',
                    'PolicyDocument': {
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [
                                'lambda:*',
                                'apigateway:*',
                                'dynamodb:*',
                                'rds:Describe*',
                                's3:*'
                            ],
                            'Resource': '*',
                            'Condition': {
                                'StringEquals': {
                                    'aws:RequestTag/Environment': ['dev', 'test']
                                }
                            }
                        }]
                    }
                }]
            },
            'SeniorDevOps': {
                'base_roles': ['DeveloperBase', 'OperationsBase'],
                'additional_policies': [{
                    'PolicyName': 'DevOpsAdditions',
                    'PolicyDocument': {
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [
                                'iam:PassRole',
                                'iam:CreateServiceLinkedRole',
                                'codepipeline:*',
                                'codebuild:*',
                                'codedeploy:*',
                                'ecr:*'
                            ],
                            'Resource': '*'
                        }]
                    }
                }],
                'permission_boundary': 'arn:aws:iam::123456789012:policy/DevOpsBoundary'
            }
        }
        
        # ロール継承の実装
        role_inheritance = """
        class RoleInheritance:
            def __init__(self):
                self.role_hierarchy = {}
                
            def inherit_permissions(self, child_role, parent_roles):
                inherited_policies = []
                inherited_conditions = {}
                
                for parent in parent_roles:
                    # ポリシーの継承
                    inherited_policies.extend(
                        self.get_role_policies(parent)
                    )
                    
                    # 条件の継承（より制限的な条件を適用）
                    parent_conditions = self.get_role_conditions(parent)
                    for key, value in parent_conditions.items():
                        if key in inherited_conditions:
                            # より制限的な条件をマージ
                            inherited_conditions[key] = self.merge_restrictive_conditions(
                                inherited_conditions[key], value
                            )
                        else:
                            inherited_conditions[key] = value
                
                return {
                    'policies': inherited_policies,
                    'conditions': inherited_conditions
                }
        """
        
        return {
            'base_roles': base_roles,
            'composite_roles': composite_roles,
            'inheritance_logic': role_inheritance
        }
```

### クロスアカウント/サブスクリプションアクセス

**信頼関係の確立**

組織内の異なるアカウント間でセキュアなアクセスを実現：

```python
class CrossAccountAccess:
    """
    クロスアカウントアクセスの実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.sts = boto3.client('sts')
        self.organizations = boto3.client('organizations')
    
    def setup_cross_account_access(self):
        """
        クロスアカウントアクセスの設定
        """
        # 信頼されるアカウント（アクセスされる側）
        trusted_account_role = {
            'RoleName': 'CrossAccountAccessRole',
            'AssumeRolePolicyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Principal': {
                        'AWS': [
                            'arn:aws:iam::111111111111:root',  # 信頼するアカウント
                            'arn:aws:iam::222222222222:root'
                        ]
                    },
                    'Action': 'sts:AssumeRole',
                    'Condition': {
                        'StringEquals': {
                            'sts:ExternalId': 'unique-external-id-12345'  # 追加のセキュリティ
                        },
                        'Bool': {
                            'aws:MultiFactorAuthPresent': 'true'
                        }
                    }
                }]
            },
            'Policies': [{
                'PolicyName': 'CrossAccountAccess',
                'PolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Action': [
                            's3:ListBucket',
                            's3:GetObject',
                            'ec2:DescribeInstances',
                            'rds:DescribeDBInstances'
                        ],
                        'Resource': '*'
                    }]
                }
            }],
            'Tags': [
                {'Key': 'Purpose', 'Value': 'CrossAccountAccess'},
                {'Key': 'AccessType', 'Value': 'ReadOnly'}
            ]
        }
        
        # 信頼するアカウント（アクセスする側）
        assuming_account_policy = {
            'PolicyName': 'AssumeRemoteAccountRole',
            'PolicyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Action': 'sts:AssumeRole',
                    'Resource': 'arn:aws:iam::333333333333:role/CrossAccountAccessRole'
                }]
            }
        }
        
        # Organizations SCPによる制御
        scp_policy = {
            'Name': 'CrossAccountAccessControl',
            'Description': 'Control cross-account access patterns',
            'Content': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Allow',
                    'Action': '*',
                    'Resource': '*'
                }, {
                    'Effect': 'Deny',
                    'Action': 'sts:AssumeRole',
                    'Resource': '*',
                    'Condition': {
                        'StringNotEquals': {
                            'aws:PrincipalOrgID': 'o-1234567890'  # 組織外へのアクセスを拒否
                        }
                    }
                }]
            }
        }
        
        # クロスアカウントアクセスの実装例
        cross_account_implementation = """
        def assume_cross_account_role(target_account_id, role_name, external_id):
            sts = boto3.client('sts')
            
            # ロールを引き受ける
            assumed_role = sts.assume_role(
                RoleArn=f'arn:aws:iam::{target_account_id}:role/{role_name}',
                RoleSessionName=f'CrossAccountSession-{datetime.now().strftime("%Y%m%d%H%M%S")}',
                ExternalId=external_id,
                DurationSeconds=3600
            )
            
            # 一時的な認証情報を使用してクライアントを作成
            credentials = assumed_role['Credentials']
            
            session = boto3.Session(
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken']
            )
            
            return session
        """
        
        return {
            'trusted_account_role': trusted_account_role,
            'assuming_policy': assuming_account_policy,
            'scp_control': scp_policy,
            'implementation': cross_account_implementation
        }
```

**委任管理の実現**

中央のIDプロバイダーから複数のアカウントへのアクセス：

```python
class DelegatedAdministration:
    """
    委任管理の実装
    """
    
    def __init__(self):
        self.sso = boto3.client('sso-admin')
        self.organizations = boto3.client('organizations')
    
    def implement_delegated_administration(self):
        """
        委任管理の実装
        """
        # AWS SSOによる一元管理
        sso_configuration = {
            'identity_source': {
                'type': 'EXTERNAL',
                'provider': 'Azure AD',
                'sync_method': 'SCIM'
            },
            'permission_sets': {
                'ViewOnlyAccess': {
                    'description': 'Read-only access to all accounts',
                    'session_duration': 'PT12H',
                    'relay_state': 'https://console.aws.amazon.com/',
                    'managed_policies': ['arn:aws:iam::aws:policy/ViewOnlyAccess']
                },
                'DeveloperAccess': {
                    'description': 'Developer access with restrictions',
                    'session_duration': 'PT8H',
                    'managed_policies': ['arn:aws:iam::aws:policy/PowerUserAccess'],
                    'inline_policy': {
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Deny',
                            'Action': [
                                'iam:*',
                                'organizations:*',
                                'account:*'
                            ],
                            'Resource': '*'
                        }]
                    }
                },
                'AdminAccess': {
                    'description': 'Full administrative access',
                    'session_duration': 'PT1H',
                    'managed_policies': ['arn:aws:iam::aws:policy/AdministratorAccess'],
                    'conditions': {
                        'require_mfa': True,
                        'ip_restriction': ['10.0.0.0/8']
                    }
                }
            }
        }
        
        # アカウント割り当て戦略
        account_assignment_strategy = {
            'production_accounts': {
                'permission_sets': ['ViewOnlyAccess'],
                'additional_approval': True,
                'temporary_elevation': {
                    'max_duration': '4 hours',
                    'approval_required': 'Manager + Security'
                }
            },
            'development_accounts': {
                'permission_sets': ['DeveloperAccess'],
                'self_service': True,
                'automatic_assignment': 'Based on team membership'
            },
            'shared_services_accounts': {
                'permission_sets': ['ViewOnlyAccess', 'SpecificServiceAccess'],
                'assignment_based_on': 'Service ownership'
            }
        }
        
        # SAML/OIDCフェデレーション
        federation_config = {
            'saml_provider': {
                'metadata_document': 'https://login.example.com/metadata.xml',
                'attribute_mapping': {
                    'email': 'https://aws.amazon.com/SAML/Attributes/RoleSessionName',
                    'groups': 'https://aws.amazon.com/SAML/Attributes/Role',
                    'duration': 'https://aws.amazon.com/SAML/Attributes/SessionDuration'
                }
            },
            'oidc_provider': {
                'issuer_url': 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx',
                'client_ids': ['1234567890abcdef'],
                'thumbprints': ['1234567890abcdef1234567890abcdef12345678']
            }
        }
        
        return {
            'sso_config': sso_configuration,
            'assignment_strategy': account_assignment_strategy,
            'federation': federation_config
        }
```

## 6.2 多要素認証（MFA）とセキュリティ認証情報管理

### なぜパスワードだけでは不十分なのか

パスワードは、その簡便性にもかかわらず、現代のセキュリティ脅威に対して致命的な弱点を抱えています。フィッシング、総当たり攻撃、ソーシャルエンジニアリング、データ漏洩など、パスワードを突破する手法は日々巧妙化しています。

**MFAが提供する追加の保護層**

多要素認証は、「知っているもの」（パスワード）に加えて、「持っているもの」（デバイス）や「本人であること」（生体認証）を要求することで、セキュリティを劇的に向上させます。

```python
class MFAImplementation:
    """
    多要素認証の実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        
    def enforce_mfa_policy(self):
        """
        MFA強制ポリシーの実装
        """
        # MFAが有効でない場合、ほぼすべてのアクションを拒否
        mfa_enforcement_policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Sid': 'AllowViewAccountInfo',
                    'Effect': 'Allow',
                    'Action': [
                        'iam:GetAccountPasswordPolicy',
                        'iam:ListVirtualMFADevices',
                        'iam:ListUsers'
                    ],
                    'Resource': '*'
                },
                {
                    'Sid': 'AllowManageOwnPasswords',
                    'Effect': 'Allow',
                    'Action': [
                        'iam:ChangePassword',
                        'iam:GetUser'
                    ],
                    'Resource': 'arn:aws:iam::*:user/${aws:username}'
                },
                {
                    'Sid': 'AllowManageOwnAccessKeys',
                    'Effect': 'Allow',
                    'Action': [
                        'iam:CreateAccessKey',
                        'iam:DeleteAccessKey',
                        'iam:ListAccessKeys',
                        'iam:UpdateAccessKey'
                    ],
                    'Resource': 'arn:aws:iam::*:user/${aws:username}'
                },
                {
                    'Sid': 'AllowManageOwnMFA',
                    'Effect': 'Allow',
                    'Action': [
                        'iam:CreateVirtualMFADevice',
                        'iam:DeleteVirtualMFADevice',
                        'iam:EnableMFADevice',
                        'iam:ListMFADevices',
                        'iam:ResyncMFADevice'
                    ],
                    'Resource': [
                        'arn:aws:iam::*:user/${aws:username}',
                        'arn:aws:iam::*:mfa/${aws:username}'
                    ]
                },
                {
                    'Sid': 'DenyAllExceptListedIfNoMFA',
                    'Effect': 'Deny',
                    'NotAction': [
                        'iam:CreateVirtualMFADevice',
                        'iam:EnableMFADevice',
                        'iam:GetUser',
                        'iam:ListMFADevices',
                        'iam:ListVirtualMFADevices',
                        'iam:ResyncMFADevice',
                        'sts:GetSessionToken'
                    ],
                    'Resource': '*',
                    'Condition': {
                        'BoolIfExists': {
                            'aws:MultiFactorAuthPresent': 'false'
                        }
                    }
                }
            ]
        }
        
        return mfa_enforcement_policy
```

### MFAの実装方式と選択基準

**時間ベースワンタイムパスワード（TOTP）**

最も広く採用されているMFA方式：

```python
class TOTPImplementation:
    """
    TOTP実装と管理
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def setup_virtual_mfa(self, user_name):
        """
        仮想MFAデバイスのセットアップ
        """
        # 仮想MFAデバイスの作成
        mfa_device = self.iam.create_virtual_mfa_device(
            VirtualMFADeviceName=f'{user_name}-mfa'
        )
        
        # QRコードとシークレットキーの生成
        qr_code_png = mfa_device['VirtualMFADevice']['QRCodePNG']
        base32_string = mfa_device['VirtualMFADevice']['Base32StringSeed']
        
        # MFAデバイスの有効化プロセス
        activation_process = {
            'steps': [
                '1. QRコードを認証アプリでスキャン',
                '2. 2つの連続したOTPコードを入力',
                '3. MFAデバイスをユーザーに関連付け',
                '4. 成功確認とバックアップコードの生成'
            ],
            'supported_apps': [
                'Google Authenticator',
                'Microsoft Authenticator',
                'Authy',
                '1Password',
                'LastPass Authenticator'
            ],
            'best_practices': [
                'バックアップ用に複数デバイスに登録',
                'リカバリーコードの安全な保管',
                '定期的なMFAデバイスの見直し'
            ]
        }
        
        return {
            'serial': mfa_device['VirtualMFADevice']['SerialNumber'],
            'qr_code': qr_code_png,
            'secret': base32_string,
            'process': activation_process
        }
    
    def implement_totp_validation(self):
        """
        TOTPバリデーションの実装
        """
        totp_validation = """
        import pyotp
        import time
        
        class TOTPValidator:
            def __init__(self, secret, window=1):
                self.totp = pyotp.TOTP(secret)
                self.window = window  # 時間窓の許容範囲
                
            def validate_token(self, token, for_time=None):
                # 現在時刻でのトークン検証
                if for_time is None:
                    for_time = time.time()
                
                # 時間窓を考慮した検証
                for i in range(-self.window, self.window + 1):
                    if self.totp.verify(token, for_time + i * 30):
                        return True
                        
                return False
                
            def generate_backup_codes(self, count=10):
                # バックアップコードの生成
                import secrets
                codes = []
                for _ in range(count):
                    code = secrets.token_hex(4).upper()
                    formatted_code = f"{code[:4]}-{code[4:]}"
                    codes.append(formatted_code)
                return codes
        """
        
        return totp_validation
```

**ハードウェアセキュリティキー**

最高レベルのセキュリティ：

```python
class HardwareKeyImplementation:
    """
    ハードウェアセキュリティキーの実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def implement_hardware_key_support(self):
        """
        ハードウェアキーサポートの実装
        """
        hardware_key_config = {
            'supported_standards': {
                'FIDO_U2F': {
                    'description': 'Universal 2nd Factor',
                    'devices': ['YubiKey 4', 'Google Titan', 'Feitian'],
                    'benefits': ['フィッシング耐性', 'ユーザーフレンドリー']
                },
                'FIDO2_WebAuthn': {
                    'description': 'Web Authentication',
                    'devices': ['YubiKey 5', 'Solo Keys', 'Thetis'],
                    'benefits': ['パスワードレス認証', 'バイオメトリクス対応']
                },
                'PIV_SmartCard': {
                    'description': 'Personal Identity Verification',
                    'devices': ['YubiKey PIV', 'CAC cards'],
                    'benefits': ['証明書ベース', '規制準拠']
                }
            },
            'implementation_requirements': {
                'browser_support': ['Chrome 67+', 'Firefox 60+', 'Edge 18+'],
                'protocol': 'HTTPS required',
                'user_verification': 'PIN or biometric'
            },
            'deployment_strategy': {
                'pilot_phase': {
                    'target_users': 'Admins and high-privilege users',
                    'duration': '1 month',
                    'success_criteria': '90% adoption rate'
                },
                'rollout_phase': {
                    'target_users': 'All technical staff',
                    'duration': '3 months',
                    'training': 'Mandatory security training'
                },
                'enforcement_phase': {
                    'target_users': 'All users',
                    'grace_period': '2 weeks',
                    'exceptions': 'Documented and time-limited'
                }
            }
        }
        
        # WebAuthn実装例
        webauthn_implementation = """
        // クライアントサイドの実装
        async function registerSecurityKey() {
            const publicKeyCredentialCreationOptions = {
                challenge: new Uint8Array(32),
                rp: {
                    name: "Example Corp",
                    id: "example.com",
                },
                user: {
                    id: Uint8Array.from("user@example.com", c => c.charCodeAt(0)),
                    name: "user@example.com",
                    displayName: "User Name",
                },
                pubKeyCredParams: [{alg: -7, type: "public-key"}],
                authenticatorSelection: {
                    authenticatorAttachment: "cross-platform",
                    requireResidentKey: false,
                    userVerification: "preferred"
                },
                timeout: 60000,
                attestation: "direct"
            };
            
            try {
                const credential = await navigator.credentials.create({
                    publicKey: publicKeyCredentialCreationOptions
                });
                
                // サーバーに登録情報を送信
                await registerWithServer(credential);
            } catch (error) {
                console.error("Security key registration failed:", error);
            }
        }
        """
        
        return {
            'config': hardware_key_config,
            'implementation': webauthn_implementation
        }
```

### 認証情報のライフサイクル管理

**ローテーションポリシー**

定期的な認証情報の更新：

```python
class CredentialLifecycleManagement:
    """
    認証情報のライフサイクル管理
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.secretsmanager = boto3.client('secretsmanager')
    
    def implement_rotation_policy(self):
        """
        ローテーションポリシーの実装
        """
        rotation_policies = {
            'access_keys': {
                'max_age': 90,  # days
                'warning_period': 14,  # days before expiration
                'enforcement': 'automatic_deactivation',
                'exceptions': ['service_accounts_with_approval']
            },
            'passwords': {
                'max_age': 90,
                'complexity_requirements': {
                    'min_length': 14,
                    'require_uppercase': True,
                    'require_lowercase': True,
                    'require_numbers': True,
                    'require_symbols': True,
                    'prevent_reuse': 24  # 過去24個のパスワードは再利用不可
                },
                'mfa_reset_on_change': True
            },
            'certificates': {
                'max_age': 365,
                'renewal_window': 30,  # days before expiration
                'auto_renewal': True,
                'validation_method': 'DNS'
            },
            'service_account_credentials': {
                'rotation_method': 'dual_credentials',
                'rotation_schedule': 'monthly',
                'notification': 'webhook_to_ops_channel'
            }
        }
        
        # 自動ローテーションの実装
        auto_rotation_lambda = """
        import boto3
        import json
        from datetime import datetime, timedelta
        
        def lambda_handler(event, context):
            iam = boto3.client('iam')
            sns = boto3.client('sns')
            
            # アクセスキーの年齢チェック
            users = iam.list_users()['Users']
            
            for user in users:
                access_keys = iam.list_access_keys(UserName=user['UserName'])['AccessKeyMetadata']
                
                for key in access_keys:
                    key_age = (datetime.now() - key['CreateDate'].replace(tzinfo=None)).days
                    
                    if key_age > 90:
                        # キーの無効化
                        iam.update_access_key(
                            UserName=user['UserName'],
                            AccessKeyId=key['AccessKeyId'],
                            Status='Inactive'
                        )
                        
                        # 通知の送信
                        sns.publish(
                            TopicArn='arn:aws:sns:region:account:security-notifications',
                            Subject='Access Key Deactivated',
                            Message=f"Access key {key['AccessKeyId']} for user {user['UserName']} has been deactivated due to age ({key_age} days)"
                        )
                    elif key_age > 76:  # 14日前から警告
                        # 警告通知
                        sns.publish(
                            TopicArn='arn:aws:sns:region:account:security-warnings',
                            Subject='Access Key Expiration Warning',
                            Message=f"Access key {key['AccessKeyId']} for user {user['UserName']} will expire in {90 - key_age} days"
                        )
            
            return {
                'statusCode': 200,
                'body': json.dumps('Key rotation check completed')
            }
        """
        
        return {
            'policies': rotation_policies,
            'automation': auto_rotation_lambda
        }
```

**最小権限での発行**

認証情報には必要最小限の権限のみを付与：

```python
class LeastPrivilegeCredentials:
    """
    最小権限での認証情報管理
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.sts = boto3.client('sts')
    
    def create_minimal_credentials(self, purpose):
        """
        目的別の最小権限認証情報作成
        """
        credential_templates = {
            'ci_cd_deployment': {
                'description': 'CI/CDパイプライン用',
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Effect': 'Allow',
                            'Action': [
                                's3:PutObject',
                                's3:PutObjectAcl'
                            ],
                            'Resource': 'arn:aws:s3:::deployment-bucket/*'
                        },
                        {
                            'Effect': 'Allow',
                            'Action': [
                                'ecs:UpdateService',
                                'ecs:RegisterTaskDefinition',
                                'ecs:DescribeServices'
                            ],
                            'Resource': '*',
                            'Condition': {
                                'StringEquals': {
                                    'ecs:cluster': 'production-cluster'
                                }
                            }
                        }
                    ]
                },
                'session_duration': 3600,
                'external_id_required': True
            },
            'monitoring_readonly': {
                'description': '監視ダッシュボード用',
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Action': [
                            'cloudwatch:GetMetricData',
                            'cloudwatch:GetMetricStatistics',
                            'cloudwatch:ListMetrics',
                            'logs:FilterLogEvents',
                            'logs:GetLogEvents'
                        ],
                        'Resource': '*'
                    }]
                },
                'ip_restriction': ['10.0.0.0/8'],
                'time_restriction': 'business_hours_only'
            },
            'backup_service': {
                'description': 'バックアップサービス用',
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Effect': 'Allow',
                            'Action': [
                                's3:GetObject',
                                's3:ListBucket'
                            ],
                            'Resource': [
                                'arn:aws:s3:::production-data/*',
                                'arn:aws:s3:::production-data'
                            ]
                        },
                        {
                            'Effect': 'Allow',
                            'Action': [
                                's3:PutObject',
                                's3:PutObjectAcl'
                            ],
                            'Resource': 'arn:aws:s3:::backup-bucket/*',
                            'Condition': {
                                'StringEquals': {
                                    's3:x-amz-server-side-encryption': 'AES256'
                                }
                            }
                        }
                    ]
                },
                'require_encryption': True
            }
        }
        
        # 権限の定期的なレビュー
        permission_review_process = """
        def review_credential_usage(credential_id):
            # CloudTrailログから実際の使用状況を分析
            cloudtrail = boto3.client('cloudtrail')
            
            events = cloudtrail.lookup_events(
                LookupAttributes=[{
                    'AttributeKey': 'AccessKeyId',
                    'AttributeValue': credential_id
                }],
                StartTime=datetime.now() - timedelta(days=30)
            )
            
            used_actions = set()
            used_resources = set()
            
            for event in events['Events']:
                used_actions.add(event['EventName'])
                for resource in event.get('Resources', []):
                    used_resources.add(resource['ResourceName'])
            
            # 現在の権限と比較
            current_permissions = get_credential_permissions(credential_id)
            unused_permissions = set(current_permissions) - used_actions
            
            return {
                'used_actions': list(used_actions),
                'unused_permissions': list(unused_permissions),
                'recommendation': 'Remove unused permissions'
            }
        """
        
        return {
            'templates': credential_templates,
            'review_process': permission_review_process
        }
```

### シークレット管理のベストプラクティス

**集中管理サービスの活用**

AWS Systems Manager Parameter Store、Azure Key Vault、Google Secret Manager：

```python
class SecretsManagement:
    """
    シークレット管理の実装
    """
    
    def __init__(self):
        self.secretsmanager = boto3.client('secretsmanager')
        self.ssm = boto3.client('ssm')
        self.kms = boto3.client('kms')
    
    def implement_secrets_management(self):
        """
        シークレット管理システムの実装
        """
        # Secrets Managerによる管理
        secrets_manager_config = {
            'secret_types': {
                'database_credentials': {
                    'rotation_enabled': True,
                    'rotation_lambda': 'arn:aws:lambda:region:account:function:rotate-db-creds',
                    'rotation_schedule': 'rate(30 days)',
                    'version_stages': ['AWSCURRENT', 'AWSPENDING']
                },
                'api_keys': {
                    'rotation_enabled': True,
                    'rotation_lambda': 'custom-api-key-rotation',
                    'notification': 'SNS topic for key rotation'
                },
                'certificates': {
                    'storage_type': 'JSON',
                    'fields': ['certificate', 'private_key', 'certificate_chain'],
                    'expiry_monitoring': True
                }
            },
            'encryption': {
                'kms_key': 'alias/secrets-manager-key',
                'in_transit': 'TLS 1.2+',
                'at_rest': 'AES-256'
            },
            'access_control': {
                'resource_policy': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Principal': {
                            'AWS': 'arn:aws:iam::123456789012:role/ApplicationRole'
                        },
                        'Action': 'secretsmanager:GetSecretValue',
                        'Resource': '*',
                        'Condition': {
                            'StringEquals': {
                                'secretsmanager:VersionStage': 'AWSCURRENT'
                            }
                        }
                    }]
                }
            }
        }
        
        # Parameter Storeによる設定管理
        parameter_store_config = {
            'hierarchy': {
                '/production/database/': 'Database configurations',
                '/production/app/': 'Application settings',
                '/production/services/': 'Service endpoints'
            },
            'parameter_types': {
                'String': 'Plain text values',
                'SecureString': 'Encrypted sensitive data',
                'StringList': 'Comma-separated values'
            },
            'encryption_key': 'alias/parameter-store-key',
            'access_pattern': 'Path-based IAM policies'
        }
        
        # シークレット取得の実装
        secret_retrieval = """
        class SecretManager:
            def __init__(self):
                self.secrets_client = boto3.client('secretsmanager')
                self.ssm_client = boto3.client('ssm')
                self.cache = {}
                self.cache_ttl = 3600  # 1 hour
                
            def get_secret(self, secret_name, use_cache=True):
                # キャッシュチェック
                if use_cache and secret_name in self.cache:
                    cached_secret, timestamp = self.cache[secret_name]
                    if time.time() - timestamp < self.cache_ttl:
                        return cached_secret
                
                try:
                    # Secrets Managerから取得
                    response = self.secrets_client.get_secret_value(
                        SecretId=secret_name,
                        VersionStage='AWSCURRENT'
                    )
                    
                    secret_value = response['SecretString']
                    
                    # キャッシュに保存
                    if use_cache:
                        self.cache[secret_name] = (secret_value, time.time())
                    
                    return json.loads(secret_value)
                    
                except ClientError as e:
                    if e.response['Error']['Code'] == 'ResourceNotFoundException':
                        # Parameter Storeから取得を試みる
                        return self.get_parameter(secret_name)
                    raise
                    
            def get_parameter(self, parameter_name):
                response = self.ssm_client.get_parameter(
                    Name=parameter_name,
                    WithDecryption=True
                )
                return response['Parameter']['Value']
        """
        
        return {
            'secrets_manager': secrets_manager_config,
            'parameter_store': parameter_store_config,
            'implementation': secret_retrieval
        }
```

**環境変数とコンフィギュレーション管理**

アプリケーションへの安全な認証情報の注入：

```python
class ConfigurationManagement:
    """
    設定管理の実装
    """
    
    def __init__(self):
        self.ecs = boto3.client('ecs')
        self.lambda_client = boto3.client('lambda')
    
    def implement_secure_configuration(self):
        """
        セキュアな設定管理の実装
        """
        # ECSタスク定義での設定
        ecs_task_definition = {
            'family': 'web-app',
            'containerDefinitions': [{
                'name': 'app',
                'image': 'myapp:latest',
                'environment': [
                    {'name': 'APP_ENV', 'value': 'production'},
                    {'name': 'LOG_LEVEL', 'value': 'info'}
                ],
                'secrets': [
                    {
                        'name': 'DATABASE_URL',
                        'valueFrom': 'arn:aws:secretsmanager:region:account:secret:db-creds'
                    },
                    {
                        'name': 'API_KEY',
                        'valueFrom': 'arn:aws:ssm:region:account:parameter/production/app/api-key'
                    }
                ]
            }],
            'executionRoleArn': 'arn:aws:iam::account:role/ecsTaskExecutionRole',
            'taskRoleArn': 'arn:aws:iam::account:role/appTaskRole'
        }
        
        # Lambda環境変数の暗号化
        lambda_configuration = {
            'Environment': {
                'Variables': {
                    'STAGE': 'production',
                    'API_ENDPOINT': 'https://api.example.com'
                }
            },
            'KMSKeyArn': 'arn:aws:kms:region:account:key/lambda-env-key',
            'EnvironmentVariablesEncryption': True
        }
        
        # Kubernetes Secretsの管理
        k8s_secrets_management = """
        apiVersion: v1
        kind: Secret
        metadata:
          name: app-secrets
          namespace: production
type: Opaque
        data:
          database-url: <base64-encoded-value>
          api-key: <base64-encoded-value>
        ---
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: app-service-account
          namespace: production
          annotations:
            eks.amazonaws.com/role-arn: arn:aws:iam::account:role/app-irsa-role
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: app-deployment
        spec:
          template:
            spec:
              serviceAccountName: app-service-account
              containers:
              - name: app
                image: myapp:latest
                env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: app-secrets
                      key: database-url
                envFrom:
                - secretRef:
                    name: app-secrets
        """
        
        # 設定の階層化
        configuration_hierarchy = {
            'defaults': 'Built into application',
            'environment': 'Environment-specific overrides',
            'secrets': 'Sensitive values from secret store',
            'runtime': 'Runtime overrides (feature flags)',
            'precedence': 'runtime > secrets > environment > defaults'
        }
        
        return {
            'ecs': ecs_task_definition,
            'lambda': lambda_configuration,
            'kubernetes': k8s_secrets_management,
            'hierarchy': configuration_hierarchy
        }
```

**緊急時アクセス手順**

Break Glass手順の確立：

```python
class BreakGlassAccess:
    """
    緊急時アクセス手順の実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.cloudtrail = boto3.client('cloudtrail')
        self.sns = boto3.client('sns')
    
    def implement_break_glass_procedure(self):
        """
        Break Glass手順の実装
        """
        # 緊急アクセスアカウントの設定
        break_glass_account = {
            'account_name': 'break-glass-admin',
            'protection': {
                'mfa_device': 'Hardware key in safe',
                'password': 'Complex password in sealed envelope',
                'storage': 'Physical safe with dual control'
            },
            'permissions': 'AdministratorAccess',
            'monitoring': {
                'login_alert': 'Immediate notification to security team',
                'session_recording': 'All actions logged and monitored',
                'automatic_review': 'Post-incident review required'
            }
        }
        
        # 使用検知と通知
        detection_lambda = """
        def lambda_handler(event, context):
            # CloudTrailイベントから緊急アカウントの使用を検知
            if event['detail']['userIdentity']['userName'] == 'break-glass-admin':
                # 即座に通知
                sns = boto3.client('sns')
                
                message = {
                    'alert': 'CRITICAL: Break Glass Account Used',
                    'user': event['detail']['userIdentity']['userName'],
                    'time': event['detail']['eventTime'],
                    'source_ip': event['detail']['sourceIPAddress'],
                    'event': event['detail']['eventName'],
                    'action_required': 'Immediate investigation required'
                }
                
                # 複数チャネルへの通知
                sns.publish(
                    TopicArn='arn:aws:sns:region:account:security-critical',
                    Subject='🚨 BREAK GLASS ACCOUNT ACTIVATED',
                    Message=json.dumps(message, indent=2)
                )
                
                # Slackへの通知
                send_slack_alert(message)
                
                # PagerDutyへのインシデント作成
                create_pagerduty_incident(message)
                
                # セッションの自動記録開始
                start_session_recording(event['detail']['userIdentity']['accessKeyId'])
        """
        
        # 事後手順
        post_incident_procedure = {
            'immediate_actions': [
                'Verify the emergency was legitimate',
                'Review all actions taken during the session',
                'Check for any unauthorized changes'
            ],
            'within_24_hours': [
                'Complete incident report',
                'Reset break glass credentials',
                'Update MFA device if needed',
                'Review and update procedures'
            ],
            'follow_up': [
                'Lessons learned session',
                'Update runbooks',
                'Test recovery procedures',
                'Security training if needed'
            ]
        }
        
        # 定期的なテスト
        testing_schedule = {
            'frequency': 'Quarterly',
            'test_scenarios': [
                'Account access verification',
                'Notification system test',
                'Credential rotation',
                'Safe access procedures'
            ],
            'participants': ['Security team', 'Operations team', 'Management'],
            'documentation': 'Test results and improvements'
        }
        
        return {
            'account': break_glass_account,
            'detection': detection_lambda,
            'procedures': post_incident_procedure,
            'testing': testing_schedule
        }
```

### ゼロスタンディング権限

**一時的な認証情報の活用**

永続的な認証情報を最小化：

```python
class ZeroStandingPrivileges:
    """
    ゼロスタンディング権限の実装
    """
    
    def __init__(self):
        self.sts = boto3.client('sts')
        self.iam = boto3.client('iam')
    
    def implement_zero_standing_privileges(self):
        """
        ゼロスタンディング権限システムの実装
        """
        # 基本的な考え方
        zero_standing_principles = {
            'default_access': 'No permissions by default',
            'elevation_method': 'Just-in-time approval workflow',
            'session_duration': 'Minimal required time',
            'audit_trail': 'Complete activity logging'
        }
        
        # 実装アーキテクチャ
        architecture = {
            'components': {
                'identity_provider': 'SAML/OIDC IdP',
                'approval_system': 'ServiceNow/JIRA integration',
                'privilege_broker': 'Lambda-based broker service',
                'session_manager': 'Temporary credential vending',
                'audit_system': 'CloudTrail + SIEM'
            },
            'workflow': [
                'User requests access via portal',
                'Approval workflow triggered',
                'Upon approval, temporary role assumed',
                'Session monitored in real-time',
                'Automatic revocation on completion'
            ]
        }
        
        # 実装例
        privilege_broker = """
        class PrivilegeBroker:
            def __init__(self):
                self.sts = boto3.client('sts')
                self.approval_system = ApprovalSystemClient()
                
            async def request_elevation(self, user_id, requested_role, reason, duration):
                # 承認リクエストの作成
                approval_request = {
                    'requester': user_id,
                    'role': requested_role,
                    'reason': reason,
                    'duration': duration,
                    'risk_score': self.calculate_risk_score(user_id, requested_role)
                }
                
                # リスクに基づく承認フロー
                if approval_request['risk_score'] < 30:
                    # 低リスク：自動承認
                    approved = True
                elif approval_request['risk_score'] < 70:
                    # 中リスク：マネージャー承認
                    approved = await self.approval_system.request_manager_approval(approval_request)
                else:
                    # 高リスク：セキュリティチーム承認
                    approved = await self.approval_system.request_security_approval(approval_request)
                
                if approved:
                    # 一時的な認証情報の発行
                    session = self.sts.assume_role(
                        RoleArn=requested_role,
                        RoleSessionName=f"elevated-{user_id}-{int(time.time())}",
                        DurationSeconds=min(duration, 3600),  # 最大1時間
                        Policy=self.generate_session_policy(user_id, requested_role)
                    )
                    
                    # セッションの監視開始
                    self.start_session_monitoring(session['AssumedRoleUser']['AssumedRoleId'])
                    
                    return {
                        'credentials': session['Credentials'],
                        'session_id': session['AssumedRoleUser']['AssumedRoleId'],
                        'expires_at': session['Credentials']['Expiration']
                    }
                else:
                    raise PermissionError("Elevation request denied")
                    
            def calculate_risk_score(self, user_id, requested_role):
                # リスクスコアの計算ロジック
                score = 0
                
                # 役割の重要度
                if 'Admin' in requested_role:
                    score += 50
                elif 'Write' in requested_role:
                    score += 30
                else:
                    score += 10
                    
                # ユーザーの履歴
                if self.has_previous_violations(user_id):
                    score += 20
                    
                # 時間帯
                if not self.is_business_hours():
                    score += 15
                    
                # 場所
                if not self.is_known_location(user_id):
                    score += 15
                    
                return score
        """
        
        return {
            'principles': zero_standing_principles,
            'architecture': architecture,
            'implementation': privilege_broker
        }
```

**サービスアカウントの管理**

人間以外のアイデンティティの適切な管理：

```python
class ServiceAccountManagement:
    """
    サービスアカウント管理の実装
    """
    
    def __init__(self):
        self.iam = boto3.client('iam')
    
    def implement_service_account_governance(self):
        """
        サービスアカウントガバナンスの実装
        """
        # サービスアカウントの分類
        service_account_types = {
            'application_service_accounts': {
                'naming_convention': 'svc-{application}-{environment}',
                'rotation_policy': 'Automated monthly',
                'permissions': 'Application-specific minimal permissions',
                'examples': ['svc-webapp-prod', 'svc-api-staging']
            },
            'infrastructure_service_accounts': {
                'naming_convention': 'svc-infra-{service}',
                'rotation_policy': 'Automated quarterly',
                'permissions': 'Infrastructure management',
                'examples': ['svc-infra-backup', 'svc-infra-monitoring']
            },
            'integration_service_accounts': {
                'naming_convention': 'svc-int-{system1}-{system2}',
                'rotation_policy': 'Manual with approval',
                'permissions': 'Cross-system access',
                'examples': ['svc-int-erp-aws', 'svc-int-github-jenkins']
            }
        }
        
        # ライフサイクル管理
        lifecycle_management = {
            'creation': {
                'approval_required': True,
                'documentation': ['Purpose', 'Owner', 'Expiry date'],
                'initial_permissions': 'Start with read-only'
            },
            'monitoring': {
                'usage_tracking': 'CloudTrail analysis',
                'anomaly_detection': 'Unusual activity patterns',
                'compliance_check': 'Quarterly permission review'
            },
            'decommissioning': {
                'process': [
                    'Identify dependencies',
                    'Gradual permission removal',
                    'Monitor for failures',
                    'Complete removal'
                ],
                'grace_period': '30 days'
            }
        }
        
        # 実装例
        service_account_automation = """
        class ServiceAccountManager:
            def __init__(self):
                self.iam = boto3.client('iam')
                self.dynamodb = boto3.client('dynamodb')
                
            def create_service_account(self, account_spec):
                # アカウントの作成
                account_name = self.generate_account_name(account_spec)
                
                # IAMロールの作成
                role = self.iam.create_role(
                    RoleName=account_name,
                    AssumeRolePolicyDocument=json.dumps({
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Allow',
                            'Principal': {'Service': account_spec['service']},
                            'Action': 'sts:AssumeRole',
                            'Condition': {
                                'StringEquals': {
                                    'sts:ExternalId': self.generate_external_id()
                                }
                            }
                        }]
                    }),
                    Tags=[
                        {'Key': 'Type', 'Value': 'ServiceAccount'},
                        {'Key': 'Owner', 'Value': account_spec['owner']},
                        {'Key': 'Purpose', 'Value': account_spec['purpose']},
                        {'Key': 'ExpiryDate', 'Value': account_spec['expiry_date']}
                    ]
                )
                
                # メタデータの記録
                self.dynamodb.put_item(
                    TableName='service-accounts',
                    Item={
                        'AccountName': {'S': account_name},
                        'CreatedDate': {'S': datetime.now().isoformat()},
                        'Owner': {'S': account_spec['owner']},
                        'Purpose': {'S': account_spec['purpose']},
                        'LastRotated': {'S': datetime.now().isoformat()},
                        'NextRotation': {'S': (datetime.now() + timedelta(days=30)).isoformat()}
                    }
                )
                
                return {
                    'role_arn': role['Role']['Arn'],
                    'external_id': external_id
                }
                
            def audit_service_accounts(self):
                # 全サービスアカウントの監査
                service_accounts = self.get_all_service_accounts()
                audit_results = []
                
                for account in service_accounts:
                    # 使用状況の確認
                    last_used = self.get_last_used(account['AccountName'])
                    
                    # 権限の確認
                    permissions = self.analyze_permissions(account['AccountName'])
                    
                    # コンプライアンスチェック
                    compliance_issues = []
                    
                    # 90日以上未使用
                    if (datetime.now() - last_used).days > 90:
                        compliance_issues.append('Unused for 90+ days')
                        
                    # 過剰な権限
                    if self.has_admin_permissions(permissions):
                        compliance_issues.append('Has administrative permissions')
                        
                    # 期限切れ
                    if datetime.now() > datetime.fromisoformat(account['ExpiryDate']):
                        compliance_issues.append('Past expiry date')
                        
                    audit_results.append({
                        'account': account['AccountName'],
                        'last_used': last_used,
                        'issues': compliance_issues
                    })
                    
                return audit_results
        """
        
        return {
            'types': service_account_types,
            'lifecycle': lifecycle_management,
            'automation': service_account_automation
        }
```

## 6.3 監査ログとセキュリティイベントの監視

### 監査ログが語る真実

監査ログは、組織のクラウド環境で発生したすべての活動の記録です。それは、セキュリティインシデントの検出、コンプライアンスの証明、そして継続的な改善のための貴重な情報源となります。

**完全性と改ざん防止**

監査ログの価値は、その完全性と信頼性にあります：

```python
class AuditLogIntegrity:
    """
    監査ログの完全性保証
    """
    
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.s3 = boto3.client('s3')
        self.kms = boto3.client('kms')
    
    def implement_tamper_proof_logging(self):
        """
        改ざん防止ログシステムの実装
        """
        # CloudTrailの設定
        cloudtrail_config = {
            'TrailName': 'organization-audit-trail',
            'S3BucketName': 'audit-logs-immutable-bucket',
            'IncludeGlobalServiceEvents': True,
            'IsMultiRegionTrail': True,
            'EnableLogFileValidation': True,
            'EventSelectors': [{
                'ReadWriteType': 'All',
                'IncludeManagementEvents': True,
                'DataResources': [{
                    'Type': 'AWS::S3::Object',
                    'Values': ['arn:aws:s3:::*/*']
                }, {
                    'Type': 'AWS::Lambda::Function',
                    'Values': ['arn:aws:lambda:*:*:function/*']
                }]
            }],
            'InsightSelectors': [{
                'InsightType': 'ApiCallRateInsight'
            }]
        }
        
        # S3バケットの保護設定
        s3_protection = {
            'bucket_policy': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Sid': 'DenyDeleteActions',
                    'Effect': 'Deny',
                    'Principal': '*',
                    'Action': [
                        's3:DeleteBucket',
                        's3:DeleteBucketPolicy',
                        's3:DeleteObject',
                        's3:DeleteObjectVersion'
                    ],
                    'Resource': [
                        'arn:aws:s3:::audit-logs-immutable-bucket',
                        'arn:aws:s3:::audit-logs-immutable-bucket/*'
                    ]
                }]
            },
            'lifecycle_policy': {
                'Rules': [{
                    'Id': 'ArchiveOldLogs',
                    'Status': 'Enabled',
                    'Transitions': [{
                        'Days': 90,
                        'StorageClass': 'GLACIER'
                    }, {
                        'Days': 365,
                        'StorageClass': 'DEEP_ARCHIVE'
                    }]
                }]
            },
            'versioning': 'Enabled',
            'mfa_delete': 'Enabled',
            'object_lock': {
                'mode': 'COMPLIANCE',
                'retention_days': 2555  # 7 years
            }
        }
        
        # ログの暗号化
        encryption_config = {
            'kms_key': {
                'Description': 'Audit log encryption key',
                'KeyPolicy': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Sid': 'Enable CloudTrail to encrypt logs',
                        'Effect': 'Allow',
                        'Principal': {
                            'Service': 'cloudtrail.amazonaws.com'
                        },
                        'Action': [
                            'kms:GenerateDataKey',
                            'kms:DescribeKey'
                        ],
                        'Resource': '*'
                    }]
                }
            },
            'envelope_encryption': True,
            'key_rotation': 'Annual'
        }
        
        # デジタル署名による検証
        log_validation = """
        def validate_log_integrity(log_file_path):
            # CloudTrailダイジェストファイルの取得
            digest_file = get_digest_file(log_file_path)
            
            # デジタル署名の検証
            public_key = get_cloudtrail_public_key()
            signature = digest_file['Signature']
            digest_content = digest_file['DigestContent']
            
            # 署名検証
            if verify_signature(public_key, signature, digest_content):
                # 個々のログファイルのハッシュ検証
                for log_file in digest_content['LogFiles']:
                    expected_hash = log_file['Hash']
                    actual_hash = calculate_sha256(log_file['S3Object'])
                    
                    if expected_hash != actual_hash:
                        raise IntegrityError(f"Log file {log_file['S3Object']} has been tampered")
                        
                return True
            else:
                raise IntegrityError("Digest file signature validation failed")
        """
        
        return {
            'cloudtrail': cloudtrail_config,
            's3_protection': s3_protection,
            'encryption': encryption_config,
            'validation': log_validation
        }
```

### 包括的なログ収集戦略

**API呼び出しレベルのログ**

CloudTrail、Azure Activity Log、Cloud Audit Logs：

```python
class ComprehensiveLogging:
    """
    包括的なログ収集の実装
    """
    
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.logs = boto3.client('logs')
        self.config = boto3.client('config')
    
    def implement_api_logging(self):
        """
        API呼び出しログの実装
        """
        # 管理イベントとデータイベント
        event_logging_config = {
            'management_events': {
                'description': 'Control plane operations',
                'examples': [
                    'CreateBucket',
                    'RunInstances',
                    'CreateUser',
                    'PutBucketPolicy'
                ],
                'read_write_type': 'All',
                'logging': 'Always enabled'
            },
            'data_events': {
                's3_objects': {
                    'operations': ['GetObject', 'PutObject', 'DeleteObject'],
                    'scope': 'Selected buckets with sensitive data',
                    'cost_consideration': 'High volume, additional charges'
                },
                'lambda_invocations': {
                    'operations': ['Invoke'],
                    'scope': 'Critical functions only',
                    'use_case': 'Audit function executions'
                },
                'dynamodb_operations': {
                    'operations': ['GetItem', 'PutItem', 'Query', 'Scan'],
                    'scope': 'Tables with PII',
                    'compliance': 'Required for GDPR'
                }
            },
            'insights_events': {
                'api_call_rate': {
                    'description': 'Unusual API activity',
                    'detection': 'Statistical anomalies',
                    'alert_threshold': '5x baseline'
                },
                'api_error_rate': {
                    'description': 'Elevated error rates',
                    'detection': 'Error spike detection',
                    'alert_threshold': '10% error rate'
                }
            }
        }
        
        # ログフォーマットの標準化
        standardized_format = {
            'timestamp': 'ISO 8601 format',
            'request_id': 'Unique identifier for correlation',
            'event_source': 'Service that processed the request',
            'event_name': 'API action',
            'user_identity': {
                'type': 'IAMUser | AssumedRole | FederatedUser',
                'principal_id': 'Unique identifier',
                'arn': 'Full ARN',
                'account_id': 'AWS account ID',
                'access_key_id': 'For programmatic access'
            },
            'source_ip': 'Client IP address',
            'user_agent': 'Client application',
            'request_parameters': 'Input to the API call',
            'response_elements': 'Output from the API call',
            'error_code': 'If request failed',
            'error_message': 'Detailed error description'
        }
        
        return {
            'event_types': event_logging_config,
            'format': standardized_format
        }
    
    def implement_resource_logging(self):
        """
        リソースレベルログの実装
        """
        resource_logging = {
            'vpc_flow_logs': {
                'capture_type': 'ALL',
                'fields': [
                    'srcaddr', 'dstaddr', 'srcport', 'dstport',
                    'protocol', 'packets', 'bytes', 'action'
                ],
                'destinations': ['CloudWatch Logs', 'S3'],
                'analysis': {
                    'top_talkers': 'Source IPs with most traffic',
                    'denied_connections': 'Security group/NACL blocks',
                    'protocol_distribution': 'TCP/UDP/ICMP breakdown'
                }
            },
            's3_access_logs': {
                'fields': [
                    'bucket_owner', 'bucket', 'time', 'remote_ip',
                    'requester', 'request_id', 'operation', 'key',
                    'http_status', 'error_code', 'bytes_sent'
                ],
                'use_cases': [
                    'Access pattern analysis',
                    'Compliance auditing',
                    'Cost attribution'
                ]
            },
            'elb_access_logs': {
                'fields': [
                    'timestamp', 'elb', 'client:port', 'target:port',
                    'request_processing_time', 'target_processing_time',
                    'response_processing_time', 'elb_status_code',
                    'target_status_code', 'received_bytes', 'sent_bytes'
                ],
                'analysis': [
                    'Response time percentiles',
                    'Error rate by endpoint',
                    'Client geographic distribution'
                ]
            },
            'rds_logs': {
                'types': {
                    'error_log': 'Database errors and warnings',
                    'slow_query_log': 'Performance issues',
                    'general_log': 'All SQL statements',
                    'audit_log': 'Compliance and security'
                },
                'retention': '7-30 days depending on type'
            }
        }
        
        # ログ収集パイプライン
        collection_pipeline = """
        class LogCollectionPipeline:
            def __init__(self):
                self.kinesis = boto3.client('kinesis')
                self.firehose = boto3.client('firehose')
                
            def setup_centralized_logging(self):
                # Kinesis Data Streamsでリアルタイム収集
                stream_config = {
                    'StreamName': 'centralized-logs',
                    'ShardCount': 10,
                    'RetentionPeriodHours': 168  # 7 days
                }
                
                # Kinesis Data Firehoseでバッチ処理
                firehose_config = {
                    'DeliveryStreamName': 'logs-to-s3',
                    'ExtendedS3DestinationConfiguration': {
                        'BucketARN': 'arn:aws:s3:::central-log-bucket',
                        'Prefix': 'logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/',
                        'ErrorOutputPrefix': 'error-logs/',
                        'CompressionFormat': 'GZIP',
                        'DataFormatConversionConfiguration': {
                            'Enabled': True,
                            'OutputFormatConfiguration': {
                                'Serializer': {'ParquetSerDe': {}}
                            }
                        }
                    },
                    'ProcessingConfiguration': {
                        'Processors': [{
                            'Type': 'Lambda',
                            'Parameters': [{
                                'ParameterName': 'LambdaArn',
                                'ParameterValue': 'arn:aws:lambda:region:account:function:log-enrichment'
                            }]
                        }]
                    }
                }
                
                return {
                    'stream': stream_config,
                    'firehose': firehose_config
                }
        """
        
        return {
            'resource_logs': resource_logging,
            'pipeline': collection_pipeline
        }
```

**アプリケーションレベルのログ**

ビジネスロジックとユーザー行動：

```python
class ApplicationLogging:
    """
    アプリケーションログの実装
    """
    
    def __init__(self):
        self.logs = boto3.client('logs')
    
    def implement_structured_logging(self):
        """
        構造化ログの実装
        """
        # ログスキーマの定義
        log_schema = {
            'version': '1.0',
            'timestamp': 'datetime',
            'level': 'DEBUG | INFO | WARN | ERROR | FATAL',
            'logger': 'class or module name',
            'message': 'human-readable description',
            'context': {
                'request_id': 'unique request identifier',
                'user_id': 'authenticated user',
                'session_id': 'user session',
                'correlation_id': 'distributed trace ID'
            },
            'application': {
                'name': 'application name',
                'version': 'semantic version',
                'environment': 'dev | staging | prod'
            },
            'event': {
                'type': 'event category',
                'action': 'specific action',
                'result': 'success | failure',
                'duration_ms': 'execution time'
            },
            'error': {
                'type': 'exception class',
                'message': 'error description',
                'stack_trace': 'full stack trace'
            },
            'custom': 'application-specific fields'
        }
        
        # ロギング実装例
        logging_implementation = """
        import json
        import logging
        import sys
        from datetime import datetime
        from pythonjsonlogger import jsonlogger
        
        class StructuredLogger:
            def __init__(self, name, level=logging.INFO):
                self.logger = logging.getLogger(name)
                self.logger.setLevel(level)
                
                # JSON形式のハンドラー
                handler = logging.StreamHandler(sys.stdout)
                formatter = jsonlogger.JsonFormatter(
                    fmt='%(timestamp)s %(level)s %(name)s %(message)s'
                )
                handler.setFormatter(formatter)
                self.logger.addHandler(handler)
                
                # デフォルトのコンテキスト
                self.context = {}
                
            def set_context(self, **kwargs):
                self.context.update(kwargs)
                
            def log(self, level, message, **kwargs):
                extra = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'context': self.context,
                    **kwargs
                }
                
                self.logger.log(level, message, extra=extra)
                
            def info(self, message, **kwargs):
                self.log(logging.INFO, message, **kwargs)
                
            def error(self, message, error=None, **kwargs):
                if error:
                    kwargs['error'] = {
                        'type': type(error).__name__,
                        'message': str(error),
                        'stack_trace': traceback.format_exc()
                    }
                self.log(logging.ERROR, message, **kwargs)
                
            def audit(self, action, resource, result, **kwargs):
                self.log(logging.INFO, f"Audit: {action} on {resource}", 
                    event={
                        'type': 'audit',
                        'action': action,
                        'resource': resource,
                        'result': result
                    },
                    **kwargs
                )
        """
        
        # ログカテゴリとレベル
        log_categories = {
            'security': {
                'events': [
                    'authentication_attempt',
                    'authorization_check',
                    'password_change',
                    'privilege_escalation'
                ],
                'level': 'INFO for success, WARN for failure',
                'retention': 'Extended (2+ years)'
            },
            'performance': {
                'events': [
                    'api_request',
                    'database_query',
                    'external_service_call'
                ],
                'level': 'INFO with duration metrics',
                'sampling': 'Consider sampling for high-volume'
            },
            'business': {
                'events': [
                    'order_placed',
                    'payment_processed',
                    'user_registration'
                ],
                'level': 'INFO',
                'compliance': 'May require special handling for PII'
            },
            'error': {
                'events': [
                    'unhandled_exception',
                    'service_unavailable',
                    'data_corruption'
                ],
                'level': 'ERROR or FATAL',
                'alerts': 'Immediate notification required'
            }
        }
        
        return {
            'schema': log_schema,
            'implementation': logging_implementation,
            'categories': log_categories
        }
```

### リアルタイム脅威検出

**SIEMとの統合**

Security Information and Event Management システムによる相関分析：

```python
class SIEMIntegration:
    """
    SIEM統合の実装
    """
    
    def __init__(self):
        self.logs = boto3.client('logs')
        self.kinesis = boto3.client('kinesis')
    
    def implement_siem_integration(self):
        """
        SIEM統合の実装
        """
        # ログソースの統合
        log_sources = {
            'aws_native': {
                'cloudtrail': 'API activity logs',
                'guardduty': 'Threat intelligence findings',
                'security_hub': 'Aggregated security findings',
                'config': 'Configuration changes',
                'access_analyzer': 'Resource access analysis'
            },
            'infrastructure': {
                'vpc_flow_logs': 'Network traffic',
                'dns_logs': 'DNS queries',
                'waf_logs': 'Web application firewall'
            },
            'application': {
                'app_logs': 'Application events',
                'access_logs': 'User access patterns',
                'error_logs': 'Application errors'
            },
            'third_party': {
                'endpoint_protection': 'Anti-malware events',
                'vulnerability_scanner': 'Scan results',
                'dlp_solution': 'Data loss prevention alerts'
            }
        }
        
        # 相関ルールの定義
        correlation_rules = {
            'brute_force_detection': {
                'description': 'Multiple failed login attempts',
                'conditions': [
                    'event_name = ConsoleLogin',
                    'error_code = Failed',
                    'count > 5',
                    'time_window = 5 minutes'
                ],
                'severity': 'HIGH',
                'response': 'Block IP and notify security team'
            },
            'privilege_escalation': {
                'description': 'Unusual privilege changes',
                'conditions': [
                    'event_name IN (AttachUserPolicy, CreateAccessKey)',
                    'user_type = IAMUser',
                    'policy_contains("*:*")',
                    'time = outside_business_hours'
                ],
                'severity': 'CRITICAL',
                'response': 'Immediate investigation required'
            },
            'data_exfiltration': {
                'description': 'Large data transfer',
                'conditions': [
                    'bytes_transferred > 1GB',
                    'destination_ip = external',
                    'time_of_day = unusual',
                    'user_behavior = anomalous'
                ],
                'severity': 'HIGH',
                'response': 'Alert and potential connection termination'
            },
            'insider_threat': {
                'description': 'Suspicious insider activity',
                'conditions': [
                    'access_pattern = unusual',
                    'data_access = sensitive',
                    'time_pattern = irregular',
                    'download_volume = high'
                ],
                'severity': 'HIGH',
                'response': 'Manager notification and access review'
            }
        }
        
        # SIEM転送設定
        siem_forwarder = """
        class SIEMForwarder:
            def __init__(self, siem_endpoint, api_key):
                self.siem_endpoint = siem_endpoint
                self.api_key = api_key
                self.batch_size = 1000
                self.buffer = []
                
            def process_log_stream(self, log_events):
                for event in log_events:
                    # ログの正規化
                    normalized_event = self.normalize_log(event)
                    
                    # エンリッチメント
                    enriched_event = self.enrich_event(normalized_event)
                    
                    # バッファに追加
                    self.buffer.append(enriched_event)
                    
                    # バッチ送信
                    if len(self.buffer) >= self.batch_size:
                        self.send_to_siem()
                        
            def normalize_log(self, event):
                # 共通イベントフォーマット（CEF）への変換
                cef_event = {
                    'Version': 0,
                    'DeviceVendor': 'AWS',
                    'DeviceProduct': event.get('eventSource', 'Unknown'),
                    'DeviceVersion': '1.0',
                    'SignatureID': event.get('eventName', 'Unknown'),
                    'Name': event.get('eventName', 'Unknown'),
                    'Severity': self.calculate_severity(event),
                    'Extension': {
                        'src': event.get('sourceIPAddress'),
                        'user': event.get('userIdentity', {}).get('userName'),
                        'requestId': event.get('requestID'),
                        'eventTime': event.get('eventTime')
                    }
                }
                return cef_event
                
            def enrich_event(self, event):
                # IPアドレスの地理情報
                if 'src' in event['Extension']:
                    event['Extension']['srcGeo'] = self.get_geoip(event['Extension']['src'])
                    
                # ユーザーのリスクスコア
                if 'user' in event['Extension']:
                    event['Extension']['userRisk'] = self.get_user_risk_score(event['Extension']['user'])
                    
                # 脅威インテリジェンス
                event['Extension']['threatIntel'] = self.check_threat_intel(event)
                
                return event
                
            def send_to_siem(self):
                # SIEM APIへの送信
                headers = {
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.post(
                    f'{self.siem_endpoint}/api/events',
                    headers=headers,
                    json={'events': self.buffer}
                )
                
                if response.status_code == 200:
                    self.buffer = []
                else:
                    # エラー処理とリトライ
                    self.handle_send_error(response)
        """
        
        return {
            'sources': log_sources,
            'rules': correlation_rules,
            'forwarder': siem_forwarder
        }
```

**機械学習による異常検出**

通常のパターンからの逸脱を自動検出：

```python
class AnomalyDetection:
    """
    異常検出の実装
    """
    
    def __init__(self):
        self.sagemaker = boto3.client('sagemaker')
        self.kinesis = boto3.client('kinesis-analytics-v2')
    
    def implement_ml_anomaly_detection(self):
        """
        機械学習による異常検出の実装
        """
        # 異常検出モデル
        anomaly_models = {
            'user_behavior': {
                'algorithm': 'Random Cut Forest',
                'features': [
                    'login_time',
                    'login_location',
                    'resources_accessed',
                    'data_volume',
                    'session_duration'
                ],
                'training_period': '30 days',
                'update_frequency': 'Daily',
                'threshold': 'Dynamic based on confidence'
            },
            'api_usage': {
                'algorithm': 'Isolation Forest',
                'features': [
                    'api_call_rate',
                    'unique_apis_used',
                    'error_rate',
                    'response_time'
                ],
                'baseline': 'Per user and service',
                'seasonality': 'Day of week, time of day'
            },
            'network_traffic': {
                'algorithm': 'Autoencoder',
                'features': [
                    'bytes_transferred',
                    'connection_count',
                    'unique_destinations',
                    'protocol_distribution'
                ],
                'architecture': 'LSTM for time series',
                'anomaly_score': 'Reconstruction error'
            }
        }
        
        # リアルタイム異常検出パイプライン
        realtime_pipeline = """
        -- Kinesis Analytics SQL for real-time anomaly detection
        CREATE OR REPLACE STREAM anomaly_scores AS
        SELECT STREAM
            rowtime,
            user_id,
            ANOMALY_SCORE(
                CURSOR(
                    SELECT STREAM
                        login_hour,
                        login_location_hash,
                        resource_count,
                        data_volume_mb,
                        session_duration_min
                    FROM SOURCE_SQL_STREAM_001
                    RANGE INTERVAL '1' HOUR PRECEDING
                )
            ) AS anomaly_score,
            login_hour,
            login_location_hash,
            resource_count
        FROM SOURCE_SQL_STREAM_001;
        
        -- アラート生成
        CREATE OR REPLACE STREAM alerts AS
        SELECT STREAM
            rowtime,
            user_id,
            anomaly_score,
            'ANOMALY_DETECTED' as alert_type,
            'User behavior anomaly detected' as message
        FROM anomaly_scores
        WHERE anomaly_score > 3.0;  -- 3標準偏差以上
        """
        
        # 異常スコアリングロジック
        anomaly_scoring = """
        class AnomalyScorer:
            def __init__(self, model_name):
                self.model = self.load_model(model_name)
                self.baseline_stats = self.load_baseline_statistics()
                
            def score_event(self, event):
                # 特徴抽出
                features = self.extract_features(event)
                
                # ベースラインとの比較
                baseline_score = self.compare_to_baseline(features)
                
                # MLモデルによるスコアリング
                ml_score = self.model.predict_anomaly(features)
                
                # コンテキストベースの調整
                context_multiplier = self.get_context_multiplier(event)
                
                # 最終スコア計算
                final_score = (baseline_score * 0.3 + ml_score * 0.7) * context_multiplier
                
                return {
                    'event_id': event['id'],
                    'anomaly_score': final_score,
                    'contributing_factors': self.explain_score(features, final_score),
                    'recommended_action': self.recommend_action(final_score)
                }
                
            def explain_score(self, features, score):
                # SHAP値による説明可能性
                shap_values = self.model.explain(features)
                
                explanations = []
                for feature, value in shap_values.items():
                    if abs(value) > 0.1:  # 重要な要因のみ
                        explanations.append({
                            'feature': feature,
                            'contribution': value,
                            'description': self.get_feature_description(feature)
                        })
                        
                return sorted(explanations, key=lambda x: abs(x['contribution']), reverse=True)
        """
        
        return {
            'models': anomaly_models,
            'pipeline': realtime_pipeline,
            'scoring': anomaly_scoring
        }
```

### コンプライアンスとフォレンジック

**規制要件への対応**

業界固有の監査要件：

```python
class ComplianceLogging:
    """
    コンプライアンスログの実装
    """
    
    def __init__(self):
        self.config = boto3.client('config')
        self.securityhub = boto3.client('securityhub')
    
    def implement_compliance_logging(self):
        """
        コンプライアンスログシステムの実装
        """
        # 規制別の要件
        compliance_requirements = {
            'PCI_DSS': {
                'log_requirements': [
                    'All user access to cardholder data',
                    'All actions by privileged users',
                    'All access to audit logs',
                    'Invalid logical access attempts',
                    'Use of identification and authentication mechanisms'
                ],
                'retention_period': '1 year minimum',
                'review_frequency': 'Daily',
                'specific_events': {
                    'payment_processing': 'All transaction logs',
                    'card_data_access': 'Any access to PAN',
                    'system_changes': 'Configuration modifications'
                }
            },
            'HIPAA': {
                'log_requirements': [
                    'Access to PHI',
                    'Modifications to PHI',
                    'System authentication',
                    'Configuration changes'
                ],
                'retention_period': '6 years',
                'encryption': 'Required for logs containing PHI',
                'access_control': 'Minimum necessary standard'
            },
            'GDPR': {
                'log_requirements': [
                    'Personal data processing activities',
                    'Consent management',
                    'Data subject requests',
                    'Data breaches'
                ],
                'retention_period': 'No longer than necessary',
                'privacy_considerations': 'Logs themselves may contain personal data',
                'right_to_erasure': 'Must support deletion requests'
            },
            'SOX': {
                'log_requirements': [
                    'Financial system access',
                    'Financial data modifications',
                    'System configuration changes',
                    'User privilege changes'
                ],
                'retention_period': '7 years',
                'integrity': 'Tamper-proof storage required',
                'review': 'Regular management review'
            }
        }
        
        # コンプライアンスレポートの自動生成
        compliance_reporting = """
        class ComplianceReporter:
            def __init__(self):
                self.athena = boto3.client('athena')
                self.s3 = boto3.client('s3')
                
            def generate_pci_compliance_report(self, start_date, end_date):
                # 必要なログデータのクエリ
                queries = {
                    'user_access': f'''
                        SELECT 
                            useridentity.username,
                            eventtime,
                            eventsource,
                            eventname,
                            requestparameters,
                            sourceipaddress
                        FROM cloudtrail_logs
                        WHERE 
                            eventtime BETWEEN '{start_date}' AND '{end_date}'
                            AND (
                                requestparameters LIKE '%CardNumber%'
                                OR requestparameters LIKE '%PAN%'
                                OR eventsource = 'payment-service.amazonaws.com'
                            )
                    ''',
                    'privileged_actions': f'''
                        SELECT *
                        FROM cloudtrail_logs
                        WHERE 
                            eventtime BETWEEN '{start_date}' AND '{end_date}'
                            AND useridentity.type = 'AssumedRole'
                            AND useridentity.sessioncontext.sessionissuer.username LIKE '%Admin%'
                    ''',
                    'failed_access': f'''
                        SELECT 
                            useridentity.username,
                            eventtime,
                            eventsource,
                            eventname,
                            errorcode,
                            errormessage,
                            sourceipaddress
                        FROM cloudtrail_logs
                        WHERE 
                            eventtime BETWEEN '{start_date}' AND '{end_date}'
                            AND errorcode IS NOT NULL
                            AND eventname IN ('ConsoleLogin', 'AssumeRole', 'GetSessionToken')
                    '''
                }
                
                report_sections = {}
                for section, query in queries.items():
                    result = self.execute_athena_query(query)
                    report_sections[section] = self.format_results(result)
                    
                # レポートの生成
                report = self.create_report_document(report_sections, start_date, end_date)
                
                # 証跡の保存
                self.save_report_with_signature(report)
                
                return report
        """
        
        return {
            'requirements': compliance_requirements,
            'reporting': compliance_reporting
        }
```

**証跡の長期保存**

法的要件と調査のニーズ：

```python
class LogArchival:
    """
    ログアーカイブの実装
    """
    
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.glacier = boto3.client('glacier')
    
    def implement_log_archival(self):
        """
        ログアーカイブシステムの実装
        """
        # アーカイブ戦略
        archival_strategy = {
            'tiered_storage': {
                'hot': {
                    'duration': '0-30 days',
                    'storage_class': 'STANDARD',
                    'access': 'Immediate',
                    'cost': 'High',
                    'use_case': 'Active investigation'
                },
                'warm': {
                    'duration': '31-90 days',
                    'storage_class': 'STANDARD_IA',
                    'access': 'Milliseconds',
                    'cost': 'Medium',
                    'use_case': 'Recent incidents'
                },
                'cool': {
                    'duration': '91-365 days',
                    'storage_class': 'GLACIER_IR',
                    'access': 'Minutes',
                    'cost': 'Low',
                    'use_case': 'Compliance review'
                },
                'cold': {
                    'duration': '1-7 years',
                    'storage_class': 'GLACIER_FLEXIBLE',
                    'access': '1-12 hours',
                    'cost': 'Very low',
                    'use_case': 'Long-term retention'
                },
                'deep_archive': {
                    'duration': '7+ years',
                    'storage_class': 'DEEP_ARCHIVE',
                    'access': '12-48 hours',
                    'cost': 'Minimal',
                    'use_case': 'Legal hold'
                }
            },
            'lifecycle_rules': [{
                'Id': 'LogArchivalPolicy',
                'Status': 'Enabled',
                'Transitions': [
                    {
                        'Days': 30,
                        'StorageClass': 'STANDARD_IA'
                    },
                    {
                        'Days': 90,
                        'StorageClass': 'GLACIER_IR'
                    },
                    {
                        'Days': 365,
                        'StorageClass': 'GLACIER'
                    },
                    {
                        'Days': 2555,  # 7 years
                        'StorageClass': 'DEEP_ARCHIVE'
                    }
                ]
            }]
        }
        
        # 効率的な検索とリトリーバル
        search_optimization = {
            'indexing': {
                'method': 'AWS Glue crawler',
                'schedule': 'Daily',
                'partitioning': 'year/month/day/hour',
                'compression': 'Parquet with Snappy'
            },
            'metadata_catalog': {
                'service': 'AWS Glue Data Catalog',
                'schema_evolution': 'Automatic',
                'searchable_fields': [
                    'timestamp',
                    'user_identity',
                    'event_name',
                    'source_ip',
                    'error_code'
                ]
            },
            'query_optimization': {
                'partition_pruning': 'Use date ranges',
                'projection': 'Select only needed columns',
                'caching': 'Result caching for repeated queries'
            }
        }
        
        # アーカイブからの復元手順
        restoration_procedure = """
        class LogRestoration:
            def __init__(self):
                self.s3 = boto3.client('s3')
                
            def restore_logs(self, time_range, urgency='standard'):
                restoration_tiers = {
                    'expedited': {
                        'glacier_flexible': '1-5 minutes',
                        'deep_archive': 'Not available',
                        'cost_multiplier': 3
                    },
                    'standard': {
                        'glacier_flexible': '3-5 hours',
                        'deep_archive': '12 hours',
                        'cost_multiplier': 1
                    },
                    'bulk': {
                        'glacier_flexible': '5-12 hours',
                        'deep_archive': '48 hours',
                        'cost_multiplier': 0.25
                    }
                }
                
                # 必要なオブジェクトの特定
                objects_to_restore = self.identify_objects(time_range)
                
                # 復元リクエストの発行
                restoration_jobs = []
                for obj in objects_to_restore:
                    if obj['StorageClass'] in ['GLACIER', 'DEEP_ARCHIVE']:
                        job = self.s3.restore_object(
                            Bucket=obj['Bucket'],
                            Key=obj['Key'],
                            RestoreRequest={
                                'Days': 7,  # 復元後の保持期間
                                'GlacierJobParameters': {
                                    'Tier': urgency
                                }
                            }
                        )
                        restoration_jobs.append(job)
                        
                # 復元状態の監視
                return self.monitor_restoration(restoration_jobs)
        """
        
        return {
            'strategy': archival_strategy,
            'search': search_optimization,
            'restoration': restoration_procedure
        }
```

**インシデント調査の手順**

体系的なフォレンジック分析：

```python
class IncidentForensics:
    """
    インシデントフォレンジックの実装
    """
    
    def __init__(self):
        self.logs = boto3.client('logs')
        self.athena = boto3.client('athena')
        self.detective = boto3.client('detective')
    
    def implement_forensics_procedure(self):
        """
        フォレンジック手順の実装
        """
        # インシデント調査フレームワーク
        investigation_framework = {
            'phase_1_detection': {
                'triggers': [
                    'Security alert',
                    'Anomaly detection',
                    'User report',
                    'Compliance scan'
                ],
                'initial_assessment': [
                    'Determine scope',
                    'Identify affected resources',
                    'Assess business impact'
                ],
                'preservation': [
                    'Create log snapshots',
                    'Preserve evidence',
                    'Document initial findings'
                ]
            },
            'phase_2_analysis': {
                'timeline_reconstruction': [
                    'Identify initial compromise',
                    'Track lateral movement',
                    'Map attacker activities'
                ],
                'root_cause_analysis': [
                    'Vulnerability identification',
                    'Configuration review',
                    'Access control analysis'
                ],
                'impact_assessment': [
                    'Data exfiltration check',
                    'System integrity verification',
                    'Compliance violation review'
                ]
            },
            'phase_3_containment': {
                'immediate_actions': [
                    'Isolate affected systems',
                    'Revoke compromised credentials',
                    'Block malicious IPs'
                ],
                'evidence_collection': [
                    'Full packet capture',
                    'Memory dumps',
                    'Disk images'
                ]
            },
            'phase_4_remediation': {
                'eradication': [
                    'Remove malware',
                    'Patch vulnerabilities',
                    'Reset credentials'
                ],
                'recovery': [
                    'Restore from clean backups',
                    'Rebuild compromised systems',
                    'Validate system integrity'
                ]
            },
            'phase_5_lessons_learned': {
                'documentation': [
                    'Incident report',
                    'Timeline of events',
                    'Technical findings'
                ],
                'improvements': [
                    'Update security controls',
                    'Enhance monitoring',
                    'Revise response procedures'
                ]
            }
        }
        
        # フォレンジック分析クエリ
        forensic_queries = """
        class ForensicAnalyzer:
            def __init__(self):
                self.athena = boto3.client('athena')
                
            def analyze_compromise(self, indicators):
                queries = {
                    'initial_access': f'''
                        -- 初期侵入の特定
                        WITH suspicious_logins AS (
                            SELECT 
                                useridentity.username,
                                sourceipaddress,
                                eventtime,
                                responseelements
                            FROM cloudtrail_logs
                            WHERE 
                                eventname = 'ConsoleLogin'
                                AND sourceipaddress IN ({indicators['suspicious_ips']})
                                AND eventtime >= DATE_SUB('{indicators['incident_time']}', INTERVAL 30 DAY)
                        )
                        SELECT * FROM suspicious_logins
                        ORDER BY eventtime ASC
                    ''',
                    
                    'privilege_escalation': f'''
                        -- 権限昇格の追跡
                        SELECT 
                            useridentity.username,
                            eventname,
                            requestparameters,
                            eventtime
                        FROM cloudtrail_logs
                        WHERE 
                            eventname IN (
                                'AttachUserPolicy',
                                'PutUserPolicy',
                                'CreateAccessKey',
                                'AssumeRole'
                            )
                            AND useridentity.username = '{indicators['compromised_user']}'
                            AND eventtime >= '{indicators['compromise_start']}'
                        ORDER BY eventtime
                    ''',
                    
                    'lateral_movement': f'''
                        -- 横展開の検出
                        WITH user_actions AS (
                            SELECT 
                                useridentity.accesskeyid,
                                eventname,
                                eventsource,
                                COUNT(*) as action_count,
                                COUNT(DISTINCT eventsource) as unique_services
                            FROM cloudtrail_logs
                            WHERE 
                                useridentity.accesskeyid IN ({indicators['suspicious_keys']})
                                AND eventtime BETWEEN '{indicators['start_time']}' AND '{indicators['end_time']}'
                            GROUP BY useridentity.accesskeyid, eventname, eventsource
                        )
                        SELECT * FROM user_actions
                        WHERE unique_services > 5  -- 異常に多くのサービスアクセス
                    ''',
                    
                    'data_exfiltration': f'''
                        -- データ持ち出しの検出
                        SELECT 
                            eventname,
                            requestparameters,
                            resources,
                            SUM(CAST(additionalinfo.bytestransferred AS BIGINT)) as total_bytes
                        FROM cloudtrail_logs
                        WHERE 
                            eventname IN ('GetObject', 'CopyObject', 'RestoreObject')
                            AND useridentity.accesskeyid = '{indicators['compromised_key']}'
                            AND eventtime BETWEEN '{indicators['start_time']}' AND '{indicators['end_time']}'
                        GROUP BY eventname, requestparameters, resources
                        HAVING total_bytes > 1073741824  -- 1GB以上
                    '''
                }
                
                results = {}
                for query_name, query in queries.items():
                    results[query_name] = self.execute_query(query)
                    
                return self.create_forensic_timeline(results)
        """
        
        # インシデントレスポンス自動化
        incident_response_automation = """
        class IncidentResponder:
            def __init__(self):
                self.iam = boto3.client('iam')
                self.ec2 = boto3.client('ec2')
                self.guardduty = boto3.client('guardduty')
                
            def automated_response(self, finding):
                severity = finding['Severity']
                finding_type = finding['Type']
                
                if severity >= 7:  # HIGH or CRITICAL
                    if 'UnauthorizedAccess' in finding_type:
                        self.respond_to_unauthorized_access(finding)
                    elif 'Trojan' in finding_type:
                        self.respond_to_malware(finding)
                    elif 'CryptoCurrency' in finding_type:
                        self.respond_to_cryptomining(finding)
                        
            def respond_to_unauthorized_access(self, finding):
                # 影響を受けたリソースの特定
                resource = finding['Resource']
                
                if resource['Type'] == 'AccessKey':
                    # アクセスキーの無効化
                    self.iam.update_access_key(
                        UserName=resource['AccessKeyDetails']['UserName'],
                        AccessKeyId=resource['AccessKeyDetails']['AccessKeyId'],
                        Status='Inactive'
                    )
                    
                    # 新しいキーの生成を通知
                    self.notify_user_key_rotation(resource['AccessKeyDetails']['UserName'])
                    
                elif resource['Type'] == 'Instance':
                    # インスタンスの隔離
                    instance_id = resource['InstanceDetails']['InstanceId']
                    
                    # 隔離用セキュリティグループの適用
                    self.ec2.modify_instance_attribute(
                        InstanceId=instance_id,
                        Groups=['sg-isolation']  # すべてのトラフィックを拒否
                    )
                    
                    # フォレンジック用スナップショットの作成
                    self.create_forensic_snapshot(instance_id)
                    
            def create_forensic_snapshot(self, instance_id):
                # インスタンスのボリューム取得
                instance = self.ec2.describe_instances(InstanceIds=[instance_id])
                volumes = instance['Reservations'][0]['Instances'][0]['BlockDeviceMappings']
                
                for volume in volumes:
                    # スナップショット作成
                    snapshot = self.ec2.create_snapshot(
                        VolumeId=volume['Ebs']['VolumeId'],
                        Description=f'Forensic snapshot for incident on {instance_id}',
                        TagSpecifications=[{
                            'ResourceType': 'snapshot',
                            'Tags': [
                                {'Key': 'Purpose', 'Value': 'Forensics'},
                                {'Key': 'IncidentId', 'Value': finding['Id']},
                                {'Key': 'RetentionDate', 'Value': (datetime.now() + timedelta(days=90)).isoformat()}
                            ]
                        }]
                    )
        """
        
        return {
            'framework': investigation_framework,
            'queries': forensic_queries,
            'automation': incident_response_automation
        }
```

## 6.4 クラウドWAF（Web Application Firewall）とDDoS対策

### アプリケーション層の脅威の現実

ネットワーク層のセキュリティが強化される一方で、攻撃者はアプリケーション層により注目しています。SQLインジェクション、クロスサイトスクリプティング（XSS）、その他のOWASP Top 10の脅威は、ビジネスに直接的な影響を与える可能性があります。

**WAFの位置づけと価値**

WAFは、アプリケーションとインターネットの間に配置される防御層です：

```python
class WAFImplementation:
    """
    WAF実装と管理
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
        self.cloudfront = boto3.client('cloudfront')
        self.shield = boto3.client('shield')
    
    def demonstrate_waf_value(self):
        """
        WAFの価値を実証
        """
        waf_capabilities = {
            'threat_protection': {
                'owasp_top_10': [
                    'SQL Injection',
                    'Cross-Site Scripting (XSS)',
                    'Broken Authentication',
                    'XML External Entities (XXE)',
                    'Security Misconfiguration',
                    'Sensitive Data Exposure',
                    'Broken Access Control',
                    'Cross-Site Request Forgery (CSRF)',
                    'Using Components with Known Vulnerabilities',
                    'Insufficient Logging & Monitoring'
                ],
                'zero_day_protection': 'Virtual patching capability',
                'bot_protection': 'Automated threat detection'
            },
            'performance_benefits': {
                'caching': 'Reduce origin load',
                'compression': 'Optimize content delivery',
                'edge_computing': 'Process at edge locations'
            },
            'compliance_support': {
                'pci_dss': 'Requirement 6.6 compliance',
                'logging': 'Full request/response logging',
                'reporting': 'Compliance reports generation'
            }
        }
        
        return waf_capabilities
```

### WAFルールの設計と最適化

**マネージドルールセットの活用**

クラウドプロバイダーとセキュリティベンダーが提供する事前定義ルール：

```python
class WAFRuleManagement:
    """
    WAFルール管理の実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
    
    def create_web_acl(self):
        """
        Web ACLの作成と設定
        """
        # Web ACLの定義
        web_acl_config = {
            'Name': 'production-web-acl',
            'Scope': 'CLOUDFRONT',  # or 'REGIONAL'
            'DefaultAction': {'Allow': {}},
            'Rules': [
                {
                    'Name': 'RateLimitRule',
                    'Priority': 1,
                    'Statement': {
                        'RateBasedStatement': {
                            'Limit': 1000,
                            'AggregateKeyType': 'IP',
                            'ScopeDownStatement': {
                                'ByteMatchStatement': {
                                    'SearchString': '/api/',
                                    'FieldToMatch': {'UriPath': {}},
                                    'TextTransformations': [{
                                        'Priority': 0,
                                        'Type': 'LOWERCASE'
                                    }],
                                    'PositionalConstraint': 'STARTS_WITH'
                                }
                            }
                        }
                    },
                    'Action': {
                        'Block': {
                            'CustomResponse': {
                                'ResponseCode': 429,
                                'CustomResponseBodyKey': 'rate-limit-exceeded'
                            }
                        }
                    },
                    'VisibilityConfig': {
                        'SampledRequestsEnabled': True,
                        'CloudWatchMetricsEnabled': True,
                        'MetricName': 'RateLimitRule'
                    }
                },
                {
                    'Name': 'AWSManagedRulesCommonRuleSet',
                    'Priority': 2,
                    'OverrideAction': {'None': {}},
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'VendorName': 'AWS',
                            'Name': 'AWSManagedRulesCommonRuleSet',
                            'ExcludedRules': [
                                {'Name': 'SizeRestrictions_BODY'},
                                {'Name': 'GenericRFI_BODY'}
                            ]
                        }
                    },
                    'VisibilityConfig': {
                        'SampledRequestsEnabled': True,
                        'CloudWatchMetricsEnabled': True,
                        'MetricName': 'CommonRuleSet'
                    }
                },
                {
                    'Name': 'SQLiProtection',
                    'Priority': 3,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'VendorName': 'AWS',
                            'Name': 'AWSManagedRulesSQLiRuleSet'
                        }
                    },
                    'OverrideAction': {'None': {}},
                    'VisibilityConfig': {
                        'SampledRequestsEnabled': True,
                        'CloudWatchMetricsEnabled': True,
                        'MetricName': 'SQLiProtection'
                    }
                }
            ],
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'production-web-acl'
            },
            'CustomResponseBodies': {
                'rate-limit-exceeded': {
                    'ContentType': 'APPLICATION_JSON',
                    'Content': '{"error": "Rate limit exceeded. Please try again later."}'
                }
            }
        }
        
        # ルールグループの管理
        rule_group_management = {
            'aws_managed': {
                'core_rule_set': 'General web application protection',
                'known_bad_inputs': 'Known malicious patterns',
                'sqli_rule_set': 'SQL injection protection',
                'linux_rule_set': 'Linux-specific protections',
                'windows_rule_set': 'Windows-specific protections',
                'ip_reputation': 'Bad IP reputation list',
                'anonymous_ip': 'Proxy and VPN detection',
                'bot_control': 'Bot traffic management'
            },
            'marketplace_rules': {
                'fortinet': 'Advanced threat protection',
                'f5': 'Application security',
                'imperva': 'Web application protection'
            },
            'versioning': {
                'update_strategy': 'Staged rollout',
                'testing': 'Count mode before block',
                'rollback': 'Previous version retention'
            }
        }
        
        return {
            'web_acl': web_acl_config,
            'rule_groups': rule_group_management
        }
```

**カスタムルールの作成**

アプリケーション固有の保護：

```python
class CustomWAFRules:
    """
    カスタムWAFルールの実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
    
    def create_custom_rules(self):
        """
        カスタムルールの作成
        """
        # APIエンドポイント保護
        api_protection_rule = {
            'Name': 'APIEndpointProtection',
            'Priority': 10,
            'Statement': {
                'AndStatement': {
                    'Statements': [
                        {
                            'ByteMatchStatement': {
                                'SearchString': '/api/v2/',
                                'FieldToMatch': {'UriPath': {}},
                                'TextTransformations': [{
                                    'Priority': 0,
                                    'Type': 'LOWERCASE'
                                }],
                                'PositionalConstraint': 'STARTS_WITH'
                            }
                        },
                        {
                            'NotStatement': {
                                'Statement': {
                                    'ByteMatchStatement': {
                                        'SearchString': 'Bearer',
                                        'FieldToMatch': {
                                            'SingleHeader': {'Name': 'authorization'}
                                        },
                                        'TextTransformations': [{
                                            'Priority': 0,
                                            'Type': 'NONE'
                                        }],
                                        'PositionalConstraint': 'STARTS_WITH'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'APIEndpointProtection'
            }
        }
        
        # 地理的制限
        geo_restriction_rule = {
            'Name': 'GeoRestriction',
            'Priority': 20,
            'Statement': {
                'OrStatement': {
                    'Statements': [
                        {
                            'GeoMatchStatement': {
                                'CountryCodes': ['CN', 'RU', 'KP']
                            }
                        },
                        {
                            'AndStatement': {
                                'Statements': [
                                    {
                                        'GeoMatchStatement': {
                                            'CountryCodes': ['US']
                                        }
                                    },
                                    {
                                        'NotStatement': {
                                            'Statement': {
                                                'IPSetReferenceStatement': {
                                                    'Arn': 'arn:aws:wafv2:region:account:regional/ipset/allowed-us-ips/id'
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            'Action': {
                'Block': {
                    'CustomResponse': {
                        'ResponseCode': 403,
                        'CustomResponseBodyKey': 'geo-blocked'
                    }
                }
            }
        }
        
        # カスタムレート制限
        custom_rate_limit = {
            'Name': 'CustomRateLimit',
            'Priority': 30,
            'Statement': {
                'RateBasedStatement': {
                    'Limit': 100,
                    'AggregateKeyType': 'CUSTOM_KEYS',
                    'CustomKeys': [
                        {
                            'Cookie': {
                                'Name': 'session_id',
                                'TextTransformations': [{
                                    'Priority': 0,
                                    'Type': 'NONE'
                                }]
                            }
                        },
                        {
                            'Header': {
                                'Name': 'x-api-key',
                                'TextTransformations': [{
                                    'Priority': 0,
                                    'Type': 'NONE'
                                }]
                            }
                        }
                    ],
                    'ScopeDownStatement': {
                        'ByteMatchStatement': {
                            'SearchString': '/api/expensive-operation',
                            'FieldToMatch': {'UriPath': {}},
                            'TextTransformations': [{
                                'Priority': 0,
                                'Type': 'LOWERCASE'
                            }],
                            'PositionalConstraint': 'EXACTLY'
                        }
                    }
                }
            }
        }
        
        # 正規表現パターンマッチング
        regex_pattern_rule = {
            'Name': 'MaliciousPatternDetection',
            'Priority': 40,
            'Statement': {
                'OrStatement': {
                    'Statements': [
                        {
                            'RegexMatchStatement': {
                                'RegexString': '(union.*select|select.*from|insert.*into|delete.*from)',
                                'FieldToMatch': {'Body': {}},
                                'TextTransformations': [
                                    {'Priority': 0, 'Type': 'LOWERCASE'},
                                    {'Priority': 1, 'Type': 'URL_DECODE'},
                                    {'Priority': 2, 'Type': 'HTML_ENTITY_DECODE'}
                                ]
                            }
                        },
                        {
                            'RegexMatchStatement': {
                                'RegexString': '<script[^>]*>.*?</script>',
                                'FieldToMatch': {'Body': {}},
                                'TextTransformations': [
                                    {'Priority': 0, 'Type': 'LOWERCASE'},
                                    {'Priority': 1, 'Type': 'HTML_ENTITY_DECODE'}
                                ]
                            }
                        }
                    ]
                }
            }
        }
        
        return {
            'api_protection': api_protection_rule,
            'geo_restriction': geo_restriction_rule,
            'rate_limit': custom_rate_limit,
            'pattern_matching': regex_pattern_rule
        }
```

**誤検知の最小化**

正当なトラフィックをブロックしないための調整：

```python
class WAFTuning:
    """
    WAFチューニングの実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
        self.logs = boto3.client('logs')
    
    def implement_waf_tuning(self):
        """
        WAFチューニングの実装
        """
        # 学習モードの実装
        learning_mode = {
            'phases': {
                'phase_1_baseline': {
                    'duration': '7 days',
                    'action': 'Count',
                    'objective': 'Establish normal traffic patterns',
                    'metrics': ['Request volume', 'URI patterns', 'User agents']
                },
                'phase_2_tuning': {
                    'duration': '14 days',
                    'action': 'Count with alerts',
                    'objective': 'Identify false positives',
                    'adjustments': [
                        'Exclude legitimate patterns',
                        'Adjust rate limits',
                        'Whitelist known good IPs'
                    ]
                },
                'phase_3_enforcement': {
                    'duration': 'Ongoing',
                    'action': 'Block',
                    'objective': 'Active protection',
                    'monitoring': 'Continuous false positive monitoring'
                }
            }
        }
        
        # 誤検知分析
        false_positive_analysis = """
        class FalsePositiveAnalyzer:
            def __init__(self):
                self.athena = boto3.client('athena')
                
            def analyze_blocked_requests(self, start_time, end_time):
                # ブロックされたリクエストの分析
                query = f'''
                    WITH blocked_requests AS (
                        SELECT 
                            timestamp,
                            httpRequest.uri,
                            httpRequest.httpMethod,
                            httpRequest.clientIp,
                            httpRequest.headers,
                            action,
                            terminatingRuleId,
                            ruleGroupList
                        FROM waf_logs
                        WHERE 
                            action = 'BLOCK'
                            AND timestamp BETWEEN '{start_time}' AND '{end_time}'
                    ),
                    rule_statistics AS (
                        SELECT 
                            terminatingRuleId,
                            COUNT(*) as block_count,
                            COUNT(DISTINCT httpRequest.clientIp) as unique_ips,
                            COUNT(DISTINCT httpRequest.uri) as unique_uris
                        FROM blocked_requests
                        GROUP BY terminatingRuleId
                    )
                    SELECT 
                        rs.*,
                        br.httpRequest.uri as sample_uri,
                        br.httpRequest.httpMethod as sample_method
                    FROM rule_statistics rs
                    JOIN blocked_requests br ON rs.terminatingRuleId = br.terminatingRuleId
                    ORDER BY rs.block_count DESC
                '''
                
                results = self.execute_query(query)
                
                # パターン分析
                patterns = self.identify_patterns(results)
                
                # 推奨される除外設定
                recommendations = self.generate_exclusions(patterns)
                
                return {
                    'statistics': results,
                    'patterns': patterns,
                    'recommendations': recommendations
                }
                
            def identify_patterns(self, blocked_requests):
                patterns = {
                    'legitimate_bots': [],
                    'api_clients': [],
                    'mobile_apps': [],
                    'internal_tools': []
                }
                
                for request in blocked_requests:
                    # User-Agentパターン
                    if 'googlebot' in request['user_agent'].lower():
                        patterns['legitimate_bots'].append(request)
                    elif 'mobile-app' in request['user_agent']:
                        patterns['mobile_apps'].append(request)
                        
                    # URIパターン
                    if '/health' in request['uri'] or '/status' in request['uri']:
                        patterns['internal_tools'].append(request)
                        
                return patterns
        """
        
        # 除外リストの管理
        exclusion_management = {
            'types': {
                'uri_exclusions': {
                    'health_checks': ['/health', '/healthz', '/status'],
                    'static_assets': ['/favicon.ico', '/robots.txt'],
                    'api_endpoints': ['/api/public/*']
                },
                'ip_exclusions': {
                    'office_networks': ['203.0.113.0/24'],
                    'monitoring_services': ['198.51.100.0/24'],
                    'cdn_nodes': 'Dynamic list from provider'
                },
                'header_exclusions': {
                    'internal_services': {
                        'X-Internal-Request': 'true'
                    },
                    'partner_apis': {
                        'X-Partner-Key': 'specific-values'
                    }
                }
            },
            'implementation': 'Scoped rules with exclusion statements'
        }
        
        return {
            'learning_mode': learning_mode,
            'analysis': false_positive_analysis,
            'exclusions': exclusion_management
        }
```

### DDoS攻撃への多層防御

**ネットワーク層（L3/L4）のDDoS対策**

大容量攻撃への対処：

```python
class DDoSProtection:
    """
    DDoS保護の実装
    """
    
    def __init__(self):
        self.shield = boto3.client('shield')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def implement_ddos_protection(self):
        """
        DDoS保護の実装
        """
        # AWS Shield設定
        shield_configuration = {
            'shield_standard': {
                'protection': [
                    'SYN/ACK floods',
                    'UDP reflection attacks',
                    'DNS query floods'
                ],
                'coverage': 'All AWS resources',
                'cost': 'Free',
                'mitigation': 'Automatic'
            },
            'shield_advanced': {
                'additional_protection': [
                    'Application layer attacks',
                    'Advanced attack notification',
                    'DDoS Response Team (DRT) support',
                    'Cost protection'
                ],
                'resources': [
                    'CloudFront distributions',
                    'Route 53 hosted zones',
                    'Elastic Load Balancers',
                    'Elastic IPs'
                ],
                'cost': '$3000/month',
                'sla': '99.99% availability'
            }
        }
        
        # DDoS対策アーキテクチャ
        ddos_architecture = {
            'edge_layer': {
                'service': 'CloudFront',
                'protections': [
                    'Anycast network distribution',
                    'Edge-based filtering',
                    'Origin shielding'
                ],
                'capacity': 'Terabits per second'
            },
            'dns_layer': {
                'service': 'Route 53',
                'protections': [
                    'Shuffle sharding',
                    'Anycast routing',
                    'Query rate limiting'
                ],
                'resilience': 'Global distribution'
            },
            'application_layer': {
                'service': 'ALB + WAF',
                'protections': [
                    'Rate limiting',
                    'Challenge-response',
                    'Behavioral analysis'
                ]
            },
            'origin_layer': {
                'service': 'Auto Scaling',
                'protections': [
                    'Dynamic capacity',
                    'Connection limits',
                    'Circuit breakers'
                ]
            }
        }
        
        # 緩和戦略
        mitigation_strategies = {
            'volumetric_attacks': {
                'detection': 'Traffic volume anomalies',
                'mitigation': [
                    'Null routing',
                    'Rate limiting',
                    'Traffic scrubbing'
                ],
                'automation': 'AWS Shield automatic mitigation'
            },
            'protocol_attacks': {
                'detection': 'Protocol violations',
                'mitigation': [
                    'SYN cookies',
                    'Connection state tracking',
                    'Proxy validation'
                ]
            },
            'application_attacks': {
                'detection': 'Request pattern analysis',
                'mitigation': [
                    'CAPTCHA challenges',
                    'JavaScript validation',
                    'Behavioral scoring'
                ]
            }
        }
        
        return {
            'shield': shield_configuration,
            'architecture': ddos_architecture,
            'strategies': mitigation_strategies
        }
```

**アプリケーション層（L7）のDDoS対策**

より巧妙な攻撃への対応：

```python
class ApplicationDDoSProtection:
    """
    アプリケーション層DDoS保護
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
        self.cloudfront = boto3.client('cloudfront')
    
    def implement_l7_ddos_protection(self):
        """
        L7 DDoS保護の実装
        """
        # レート制限の実装
        rate_limiting_strategy = {
            'global_rate_limit': {
                'requests_per_5min': 10000,
                'scope': 'Per IP address',
                'action': 'Temporary block (5 minutes)'
            },
            'api_rate_limits': {
                '/api/search': {
                    'requests_per_minute': 60,
                    'key': 'API key or session',
                    'burst': 100
                },
                '/api/write': {
                    'requests_per_minute': 10,
                    'key': 'User ID',
                    'queue': 'Token bucket algorithm'
                }
            },
            'dynamic_rate_limiting': {
                'baseline': 'Normal traffic patterns',
                'multiplier': '2x during attacks',
                'adjustment': 'ML-based threshold'
            }
        }
        
        # ボット管理
        bot_management = {
            'detection_methods': {
                'behavioral_analysis': [
                    'Mouse movements',
                    'Keyboard patterns',
                    'Navigation sequences'
                ],
                'technical_fingerprinting': [
                    'TLS fingerprinting',
                    'HTTP header analysis',
                    'JavaScript execution'
                ],
                'reputation_scoring': [
                    'IP reputation',
                    'ASN analysis',
                    'Geolocation patterns'
                ]
            },
            'challenge_types': {
                'captcha': {
                    'provider': 'reCAPTCHA v3',
                    'threshold': 0.5,
                    'fallback': 'Visual challenge'
                },
                'javascript_challenge': {
                    'complexity': 'Proof of work',
                    'validation': 'Server-side verification'
                },
                'device_attestation': {
                    'method': 'Trusted Platform Module',
                    'mobile': 'SafetyNet/DeviceCheck'
                }
            }
        }
        
        # 高度な緩和技術
        advanced_mitigation = """
        class AdvancedDDoSMitigation:
            def __init__(self):
                self.cache = {}
                self.blocked_ips = set()
                
            def implement_syn_cookies(self):
                # SYN Cookie実装（概念的）
                def generate_syn_cookie(src_ip, src_port, dst_ip, dst_port):
                    # タイムスタンプとシークレットを使用
                    timestamp = int(time.time()) >> 6
                    secret = self.get_rotating_secret()
                    
                    # Cookie値の生成
                    cookie = hashlib.sha256(
                        f"{src_ip}{src_port}{dst_ip}{dst_port}{timestamp}{secret}".encode()
                    ).hexdigest()[:8]
                    
                    return int(cookie, 16)
                    
            def implement_puzzle_solving(self):
                # Proof of Work challenge
                def generate_challenge(difficulty=20):
                    challenge = secrets.token_hex(16)
                    target = '0' * (difficulty // 4)
                    
                    return {
                        'challenge': challenge,
                        'difficulty': difficulty,
                        'target': target,
                        'expires': time.time() + 30  # 30秒の有効期限
                    }
                    
                def verify_solution(challenge, solution, target):
                    result = hashlib.sha256(
                        f"{challenge}{solution}".encode()
                    ).hexdigest()
                    
                    return result.startswith(target)
                    
            def implement_traffic_shaping(self):
                # トラフィックシェーピング
                class TokenBucket:
                    def __init__(self, capacity, refill_rate):
                        self.capacity = capacity
                        self.tokens = capacity
                        self.refill_rate = refill_rate
                        self.last_refill = time.time()
                        
                    def consume(self, tokens=1):
                        self.refill()
                        
                        if self.tokens >= tokens:
                            self.tokens -= tokens
                            return True
                        return False
                        
                    def refill(self):
                        now = time.time()
                        elapsed = now - self.last_refill
                        
                        tokens_to_add = elapsed * self.refill_rate
                        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
                        self.last_refill = now
        """
        
        return {
            'rate_limiting': rate_limiting_strategy,
            'bot_management': bot_management,
            'advanced_techniques': advanced_mitigation
        }
```

### 高度な保護機能

**レート制限とスロットリング**

リソース枯渇攻撃からの保護：

```python
class RateLimiting:
    """
    レート制限の実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
        self.apigateway = boto3.client('apigateway')
    
    def implement_rate_limiting(self):
        """
        包括的なレート制限の実装
        """
        # API Gatewayのレート制限
        api_rate_limits = {
            'usage_plans': {
                'basic': {
                    'rate': 100,  # requests per second
                    'burst': 200,
                    'quota': {
                        'limit': 10000,
                        'period': 'DAY'
                    }
                },
                'premium': {
                    'rate': 1000,
                    'burst': 2000,
                    'quota': {
                        'limit': 1000000,
                        'period': 'DAY'
                    }
                },
                'internal': {
                    'rate': 10000,
                    'burst': 20000,
                    'quota': None  # 無制限
                }
            },
            'method_throttling': {
                '/search': {
                    'rate': 50,
                    'burst': 100
                },
                '/upload': {
                    'rate': 10,
                    'burst': 20
                }
            }
        }
        
        # 分散レート制限
        distributed_rate_limiting = """
        class DistributedRateLimiter:
            def __init__(self, redis_client):
                self.redis = redis_client
                
            def check_rate_limit(self, key, limit, window):
                # Sliding window log algorithm
                now = time.time()
                window_start = now - window
                
                # Remove old entries
                self.redis.zremrangebyscore(key, 0, window_start)
                
                # Count requests in window
                count = self.redis.zcard(key)
                
                if count < limit:
                    # Add current request
                    self.redis.zadd(key, {str(uuid.uuid4()): now})
                    self.redis.expire(key, window)
                    return True
                    
                return False
                
            def get_remaining_quota(self, key, limit, window):
                now = time.time()
                window_start = now - window
                
                self.redis.zremrangebyscore(key, 0, window_start)
                count = self.redis.zcard(key)
                
                return max(0, limit - count)
        """
        
        # グレースフルデグラデーション
        graceful_degradation = {
            'strategies': {
                'feature_flags': {
                    'search_autocomplete': 'Disable during high load',
                    'image_processing': 'Queue for async processing',
                    'recommendations': 'Serve cached results'
                },
                'quality_reduction': {
                    'image_quality': 'Reduce from 100% to 80%',
                    'video_bitrate': 'Adaptive bitrate reduction',
                    'api_fields': 'Return essential fields only'
                },
                'caching_aggressive': {
                    'ttl_extension': 'Increase cache TTL',
                    'stale_while_revalidate': 'Serve stale content',
                    'edge_caching': 'Push more to CDN'
                }
            }
        }
        
        return {
            'api_limits': api_rate_limits,
            'distributed': distributed_rate_limiting,
            'degradation': graceful_degradation
        }
```

**ボット管理**

自動化された脅威への対処：

```python
class BotManagement:
    """
    ボット管理の実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
    
    def implement_bot_detection(self):
        """
        ボット検出と管理の実装
        """
        # ボット分類
        bot_classification = {
            'good_bots': {
                'search_engines': [
                    'Googlebot',
                    'Bingbot',
                    'Slurp',
                    'DuckDuckBot'
                ],
                'monitoring': [
                    'Pingdom',
                    'UptimeRobot',
                    'StatusCake'
                ],
                'social_media': [
                    'facebookexternalhit',
                    'Twitterbot',
                    'LinkedInBot'
                ],
                'treatment': 'Allow with rate limits'
            },
            'bad_bots': {
                'scrapers': {
                    'detection': 'Unusual request patterns',
                    'characteristics': [
                        'No JavaScript execution',
                        'Sequential URL access',
                        'High request rate'
                    ]
                },
                'vulnerability_scanners': {
                    'patterns': [
                        'Common exploit paths',
                        'SQL injection attempts',
                        'Directory traversal'
                    ]
                },
                'credential_stuffing': {
                    'indicators': [
                        'Multiple login attempts',
                        'Distributed IPs',
                        'Reused user agents'
                    ]
                },
                'treatment': 'Block or challenge'
            },
            'gray_bots': {
                'description': 'Unknown or ambiguous',
                'treatment': 'Progressive challenges'
            }
        }
        
        # 検出技術
        detection_techniques = {
            'fingerprinting': {
                'tls_fingerprint': {
                    'description': 'TLS handshake analysis',
                    'features': [
                        'Cipher suites',
                        'Extensions',
                        'Curves'
                    ]
                },
                'http_fingerprint': {
                    'headers_order': 'Header field order',
                    'accept_headers': 'Accept header variations',
                    'connection_behavior': 'Keep-alive patterns'
                },
                'javascript_fingerprint': {
                    'canvas': 'Canvas rendering',
                    'webgl': 'WebGL capabilities',
                    'audio': 'Audio context fingerprint'
                }
            },
            'behavioral_analysis': {
                'mouse_movements': {
                    'human_characteristics': [
                        'Curved paths',
                        'Variable speed',
                        'Hesitation'
                    ],
                    'bot_characteristics': [
                        'Straight lines',
                        'Constant speed',
                        'No hesitation'
                    ]
                },
                'interaction_patterns': {
                    'human': 'Random, exploratory',
                    'bot': 'Sequential, predictable'
                }
            }
        }
        
        # ボット管理実装
        bot_management_implementation = """
        class BotDetector:
            def __init__(self):
                self.ml_model = self.load_ml_model()
                self.fingerprint_db = {}
                
            def analyze_request(self, request):
                score = 0
                signals = []
                
                # TLSフィンガープリント
                tls_fp = self.get_tls_fingerprint(request)
                if self.is_known_bot_fingerprint(tls_fp):
                    score += 50
                    signals.append('Known bot TLS fingerprint')
                    
                # ヘッダー分析
                header_score = self.analyze_headers(request.headers)
                score += header_score
                
                # 行動分析
                if hasattr(request, 'behavior_data'):
                    behavior_score = self.analyze_behavior(request.behavior_data)
                    score += behavior_score
                    
                # ML予測
                ml_score = self.ml_model.predict(self.extract_features(request))
                score = score * 0.7 + ml_score * 0.3
                
                return {
                    'score': score,
                    'classification': self.classify_score(score),
                    'signals': signals,
                    'recommended_action': self.recommend_action(score)
                }
                
            def classify_score(self, score):
                if score < 30:
                    return 'human'
                elif score < 70:
                    return 'suspicious'
                else:
                    return 'bot'
                    
            def recommend_action(self, score):
                if score < 30:
                    return 'allow'
                elif score < 50:
                    return 'monitor'
                elif score < 70:
                    return 'challenge'
                else:
                    return 'block'
        """
        
        return {
            'classification': bot_classification,
            'detection': detection_techniques,
            'implementation': bot_management_implementation
        }
```

**リアルタイムの脅威インテリジェンス**

最新の脅威情報の活用：

```python
class ThreatIntelligence:
    """
    脅威インテリジェンスの実装
    """
    
    def __init__(self):
        self.wafv2 = boto3.client('wafv2')
        self.guardduty = boto3.client('guardduty')
    
    def implement_threat_intelligence(self):
        """
        脅威インテリジェンスシステムの実装
        """
        # 脅威フィード統合
        threat_feeds = {
            'ip_reputation': {
                'sources': [
                    'AWS Managed IP reputation list',
                    'Emerging Threats',
                    'AlienVault OTX',
                    'Abuse.ch'
                ],
                'update_frequency': 'Hourly',
                'categories': [
                    'Malware C&C',
                    'Botnet',
                    'Tor exit nodes',
                    'VPN/Proxy'
                ]
            },
            'domain_reputation': {
                'sources': [
                    'PhishTank',
                    'OpenPhish',
                    'URLhaus'
                ],
                'validation': 'DNS verification',
                'action': 'Block or warn'
            },
            'file_hash_reputation': {
                'sources': [
                    'VirusTotal',
                    'Hybrid Analysis',
                    'Malware Bazaar'
                ],
                'integration': 'S3 upload scanning'
            }
        }
        
        # 脅威スコアリング
        threat_scoring_system = {
            'factors': {
                'ip_reputation': {
                    'weight': 0.3,
                    'scoring': {
                        'clean': 0,
                        'suspicious': 50,
                        'malicious': 100
                    }
                },
                'geo_risk': {
                    'weight': 0.2,
                    'high_risk_countries': ['XX', 'YY'],
                    'scoring': 'Based on origin country'
                },
                'behavioral_anomaly': {
                    'weight': 0.3,
                    'factors': [
                        'Request rate',
                        'Access patterns',
                        'Error rate'
                    ]
                },
                'threat_intelligence': {
                    'weight': 0.2,
                    'real_time_feeds': True
                }
            },
            'thresholds': {
                'low': 0-30,
                'medium': 31-60,
                'high': 61-80,
                'critical': 81-100
            }
        }
        
        # 自動対応システム
        automated_response = """
        class ThreatResponseAutomation:
            def __init__(self):
                self.waf = boto3.client('wafv2')
                self.sns = boto3.client('sns')
                self.dynamodb = boto3.client('dynamodb')
                
            def process_threat(self, threat_data):
                score = self.calculate_threat_score(threat_data)
                
                if score >= 80:  # Critical threat
                    self.immediate_block(threat_data)
                elif score >= 60:  # High threat
                    self.temporary_block(threat_data, duration=3600)
                elif score >= 40:  # Medium threat
                    self.rate_limit(threat_data)
                else:  # Low threat
                    self.monitor(threat_data)
                    
            def immediate_block(self, threat_data):
                # IPセットの更新
                ip_set = self.waf.get_ip_set(
                    Name='blocked-ips',
                    Scope='REGIONAL',
                    Id='ip-set-id'
                )
                
                addresses = ip_set['IPSet']['Addresses']
                addresses.append(threat_data['source_ip'] + '/32')
                
                self.waf.update_ip_set(
                    Name='blocked-ips',
                    Scope='REGIONAL',
                    Id='ip-set-id',
                    Addresses=addresses,
                    LockToken=ip_set['LockToken']
                )
                
                # 通知
                self.notify_security_team(threat_data)
                
                # 記録
                self.log_action(threat_data, 'immediate_block')
                
            def temporary_block(self, threat_data, duration):
                # DynamoDBに一時的なブロックを記録
                expiry = int(time.time()) + duration
                
                self.dynamodb.put_item(
                    TableName='temporary-blocks',
                    Item={
                        'ip_address': {'S': threat_data['source_ip']},
                        'block_reason': {'S': threat_data['threat_type']},
                        'expiry': {'N': str(expiry)},
                        'threat_score': {'N': str(threat_data['score'])}
                    }
                )
                
                # Lambda関数で定期的に期限切れエントリを削除
                
            def update_threat_intelligence(self):
                # 脅威フィードの更新
                feeds = self.get_threat_feeds()
                
                for feed in feeds:
                    indicators = self.fetch_feed(feed['url'])
                    self.process_indicators(indicators)
                    
                # ローカルキャッシュの更新
                self.update_cache()
        """
        
        return {
            'threat_feeds': threat_feeds,
            'scoring': threat_scoring_system,
            'automation': automated_response
        }
```

## 6.5 脆弱性管理とパッチ適用

### 継続的なセキュリティの実現

クラウド環境のダイナミックな性質は、従来の定期的な脆弱性スキャンとパッチ適用のアプローチを時代遅れにしています。現代の脆弱性管理は、継続的で自動化されたプロセスである必要があります。

**責任共有モデルにおける脆弱性管理**

クラウドプロバイダーとユーザーの責任範囲：

```python
class VulnerabilityManagement:
    """
    脆弱性管理の実装
    """
    
    def __init__(self):
        self.inspector = boto3.client('inspector2')
        self.systems_manager = boto3.client('ssm')
        self.ecr = boto3.client('ecr')
    
    def define_responsibility_model(self):
        """
        責任共有モデルの定義
        """
        responsibility_matrix = {
            'cloud_provider': {
                'infrastructure': [
                    'Physical security',
                    'Hypervisor patching',
                    'Network infrastructure',
                    'Managed service patching'
                ],
                'services': {
                    'RDS': 'Database engine patching',
                    'Lambda': 'Runtime environment',
                    'Fargate': 'Container runtime'
                }
            },
            'customer': {
                'operating_system': [
                    'OS patching',
                    'Security updates',
                    'Configuration'
                ],
                'applications': [
                    'Application code',
                    'Third-party libraries',
                    'Container images'
                ],
                'data': [
                    'Encryption',
                    'Access control',
                    'Backup'
                ]
            },
            'shared': {
                'identity_management': 'Configuration and usage',
                'network_traffic': 'Protection and monitoring',
                'configuration': 'Security settings'
            }
        }
        
        return responsibility_matrix
```

### 脆弱性の発見と評価

**自動スキャニングの実装**

定期的かつ継続的な脆弱性検出：

```python
class VulnerabilityScanning:
    """
    脆弱性スキャニングの実装
    """
    
    def __init__(self):
        self.inspector = boto3.client('inspector2')
        self.ecr = boto3.client('ecr')
        self.ssm = boto3.client('ssm')
    
    def implement_continuous_scanning(self):
        """
        継続的スキャニングの実装
        """
        # Amazon Inspectorの設定
        inspector_config = {
            'scan_types': {
                'ec2_scanning': {
                    'frequency': 'Continuous',
                    'coverage': [
                        'Operating system vulnerabilities',
                        'Network exposure',
                        'CVE detection'
                    ],
                    'integration': 'Systems Manager inventory'
                },
                'ecr_scanning': {
                    'trigger': 'On push',
                    'scan_on_push': True,
                    'filters': {
                        'severity': ['CRITICAL', 'HIGH', 'MEDIUM'],
                        'repository_names': ['production/*']
                    }
                },
                'lambda_scanning': {
                    'layers': True,
                    'functions': True,
                    'coverage': 'Known vulnerabilities in runtime'
                }
            }
        }
        
        # カスタムスキャニングパイプライン
        custom_scanning_pipeline = """
        class VulnerabilityScanner:
            def __init__(self):
                self.scanners = {
                    'dependency_check': DependencyChecker(),
                    'sast': StaticAnalyzer(),
                    'container_scan': ContainerScanner(),
                    'iac_scan': IaCScanner()
                }
                
            def scan_application(self, app_config):
                results = {
                    'scan_id': str(uuid.uuid4()),
                    'timestamp': datetime.now().isoformat(),
                    'findings': []
                }
                
                # 依存関係スキャン
                if app_config.get('language'):
                    dep_results = self.scan_dependencies(app_config)
                    results['findings'].extend(dep_results)
                    
                # 静的コード分析
                if app_config.get('source_code'):
                    sast_results = self.scan_source_code(app_config)
                    results['findings'].extend(sast_results)
                    
                # コンテナスキャン
                if app_config.get('container_image'):
                    container_results = self.scan_container(app_config)
                    results['findings'].extend(container_results)
                    
                # IaCスキャン
                if app_config.get('iac_templates'):
                    iac_results = self.scan_infrastructure(app_config)
                    results['findings'].extend(iac_results)
                    
                # 結果の集約と優先順位付け
                prioritized_findings = self.prioritize_findings(results['findings'])
                
                return {
                    'summary': self.generate_summary(prioritized_findings),
                    'critical_findings': [f for f in prioritized_findings if f['severity'] == 'CRITICAL'],
                    'full_results': prioritized_findings
                }
                
            def scan_dependencies(self, config):
                findings = []
                
                if config['language'] == 'python':
                    # pip-auditの使用
                    vulnerabilities = self.scanners['dependency_check'].scan_python(config['requirements_file'])
                elif config['language'] == 'node':
                    # npm auditの使用
                    vulnerabilities = self.scanners['dependency_check'].scan_node(config['package_lock'])
                elif config['language'] == 'java':
                    # OWASP Dependency Checkの使用
                    vulnerabilities = self.scanners['dependency_check'].scan_java(config['pom_file'])
                    
                for vuln in vulnerabilities:
                    findings.append({
                        'type': 'dependency',
                        'severity': vuln['severity'],
                        'cve': vuln.get('cve'),
                        'package': vuln['package'],
                        'current_version': vuln['version'],
                        'fixed_version': vuln.get('fixed_version'),
                        'description': vuln['description']
                    })
                    
                return findings
        """
        
        return {
            'inspector': inspector_config,
            'pipeline': custom_scanning_pipeline
        }
```

**リスクベースの優先順位付け**

すべての脆弱性が同じ重要度ではない：

```python
class RiskAssessment:
    """
    リスク評価の実装
    """
    
    def __init__(self):
        self.config = boto3.client('config')
        
    def implement_risk_scoring(self):
        """
        リスクスコアリングの実装
        """
        # リスク計算モデル
        risk_model = {
            'factors': {
                'cvss_score': {
                    'weight': 0.3,
                    'ranges': {
                        'critical': (9.0, 10.0),
                        'high': (7.0, 8.9),
                        'medium': (4.0, 6.9),
                        'low': (0.1, 3.9)
                    }
                },
                'exploitability': {
                    'weight': 0.2,
                    'factors': [
                        'Public exploit available',
                        'Exploit complexity',
                        'Required privileges'
                    ]
                },
                'asset_criticality': {
                    'weight': 0.25,
                    'classification': {
                        'production_database': 10,
                        'customer_facing_api': 9,
                        'internal_service': 6,
                        'development_system': 3
                    }
                },
                'exposure': {
                    'weight': 0.15,
                    'factors': {
                        'internet_facing': 10,
                        'internal_only': 5,
                        'isolated': 2
                    }
                },
                'data_sensitivity': {
                    'weight': 0.1,
                    'classification': {
                        'pii': 10,
                        'financial': 9,
                        'proprietary': 7,
                        'public': 2
                    }
                }
            }
        }
        
        # リスク計算実装
        risk_calculator = """
        class RiskCalculator:
            def __init__(self, risk_model):
                self.model = risk_model
                
            def calculate_risk_score(self, vulnerability, asset):
                score = 0
                
                # CVSSスコアの評価
                cvss_score = vulnerability.get('cvss_score', 0)
                cvss_weight = self.model['factors']['cvss_score']['weight']
                score += (cvss_score / 10) * cvss_weight * 100
                
                # エクスプロイト可能性
                exploit_score = self.assess_exploitability(vulnerability)
                exploit_weight = self.model['factors']['exploitability']['weight']
                score += exploit_score * exploit_weight
                
                # 資産の重要度
                asset_score = self.model['factors']['asset_criticality']['classification'].get(
                    asset['type'], 5
                )
                asset_weight = self.model['factors']['asset_criticality']['weight']
                score += (asset_score / 10) * asset_weight * 100
                
                # 露出度
                exposure_score = self.model['factors']['exposure']['factors'].get(
                    asset['exposure_level'], 5
                )
                exposure_weight = self.model['factors']['exposure']['weight']
                score += (exposure_score / 10) * exposure_weight * 100
                
                # データ機密性
                data_score = self.model['factors']['data_sensitivity']['classification'].get(
                    asset['data_classification'], 5
                )
                data_weight = self.model['factors']['data_sensitivity']['weight']
                score += (data_score / 10) * data_weight * 100
                
                return {
                    'total_score': round(score, 2),
                    'risk_level': self.classify_risk(score),
                    'factors': {
                        'cvss': cvss_score,
                        'exploitability': exploit_score,
                        'asset_criticality': asset_score,
                        'exposure': exposure_score,
                        'data_sensitivity': data_score
                    }
                }
                
            def assess_exploitability(self, vulnerability):
                score = 5  # ベーススコア
                
                if vulnerability.get('exploit_available'):
                    score += 3
                    
                if vulnerability.get('exploit_in_wild'):
                    score += 2
                    
                complexity = vulnerability.get('exploit_complexity', 'medium')
                if complexity == 'low':
                    score += 1
                elif complexity == 'high':
                    score -= 1
                    
                return min(10, max(0, score))
                
            def classify_risk(self, score):
                if score >= 80:
                    return 'CRITICAL'
                elif score >= 60:
                    return 'HIGH'
                elif score >= 40:
                    return 'MEDIUM'
                elif score >= 20:
                    return 'LOW'
                else:
                    return 'INFO'
        """
        
        return {
            'model': risk_model,
            'calculator': risk_calculator
        }
```

### パッチ管理の自動化

**イミュータブルインフラストラクチャアプローチ**

パッチを適用するのではなく、新しいイメージで置き換え：

```python
class AutomatedPatching:
    """
    自動パッチ管理の実装
    """
    
    def __init__(self):
        self.ssm = boto3.client('ssm')
        self.ec2 = boto3.client('ec2')
        self.imagebuilder = boto3.client('imagebuilder')
    
    def implement_immutable_patching(self):
        """
        イミュータブルパッチングの実装
        """
        # EC2 Image Builderパイプライン
        image_pipeline = {
            'name': 'golden-ami-pipeline',
            'description': 'Automated patching via new AMI',
            'schedule': {
                'frequency': 'WEEKLY',
                'pipelineExecutionStartCondition': 'EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE'
            },
            'recipe': {
                'components': [
                    {
                        'componentArn': 'arn:aws:imagebuilder:region:aws:component/update-linux-kernel/x.x.x',
                        'parameters': []
                    },
                    {
                        'componentArn': 'arn:aws:imagebuilder:region:aws:component/update-linux/x.x.x',
                        'parameters': []
                    },
                    {
                        'componentArn': 'custom-hardening-component',
                        'parameters': []
                    }
                ],
                'tests': [
                    {
                        'name': 'security-validation',
                        'script': 'validate-security-baseline.sh'
                    },
                    {
                        'name': 'application-validation',
                        'script': 'test-application-functionality.sh'
                    }
                ]
            },
            'distribution': {
                'amiDistributionConfiguration': {
                    'name': 'golden-ami-{% raw %}{{ imagebuilder:buildDate }}{% endraw %}',
                    'description': 'Patched and hardened AMI',
                    'targetAccountIds': ['production-account', 'staging-account'],
                    'amiTags': {
                        'PatchDate': '{% raw %}{{ imagebuilder:buildDate }}{% endraw %}',
                        'Compliance': 'CIS-Hardened',
                        'AutoUpdate': 'true'
                    }
                }
            }
        }
        
        # 自動ロールアウト戦略
        rollout_strategy = """
        class PatchRolloutManager:
            def __init__(self):
                self.asg = boto3.client('autoscaling')
                self.elb = boto3.client('elbv2')
                
            def execute_rolling_update(self, asg_name, new_ami_id):
                # 現在の設定を取得
                asg_details = self.asg.describe_auto_scaling_groups(
                    AutoScalingGroupNames=[asg_name]
                )['AutoScalingGroups'][0]
                
                # 新しい起動テンプレートバージョンを作成
                new_version = self.create_launch_template_version(
                    asg_details['LaunchTemplate']['LaunchTemplateId'],
                    new_ami_id
                )
                
                # インスタンスリフレッシュを開始
                refresh_id = self.asg.start_instance_refresh(
                    AutoScalingGroupName=asg_name,
                    Preferences={
                        'MinHealthyPercentage': 90,
                        'InstanceWarmup': 300,
                        'CheckpointPercentages': [50],
                        'CheckpointDelay': 600
                    },
                    DesiredConfiguration={
                        'LaunchTemplate': {
                            'LaunchTemplateId': asg_details['LaunchTemplate']['LaunchTemplateId'],
                            'Version': str(new_version)
                        }
                    }
                )
                
                # 進捗を監視
                return self.monitor_refresh(refresh_id)
                
            def monitor_refresh(self, refresh_id):
                while True:
                    status = self.asg.describe_instance_refreshes(
                        AutoScalingGroupName=asg_name,
                        InstanceRefreshIds=[refresh_id]
                    )['InstanceRefreshes'][0]
                    
                    if status['Status'] == 'Successful':
                        return {'status': 'success', 'details': status}
                    elif status['Status'] == 'Failed':
                        # ロールバック処理
                        self.rollback(asg_name)
                        return {'status': 'failed', 'details': status}
                        
                    # ヘルスチェック
                    if not self.verify_health(asg_name):
                        self.pause_refresh(refresh_id)
                        
                    time.sleep(30)
        """
        
        return {
            'pipeline': image_pipeline,
            'rollout': rollout_strategy
        }
```

**段階的ロールアウト**

リスクを最小化するパッチ適用戦略：

```python
class PhasedRollout:
    """
    段階的ロールアウトの実装
    """
    
    def __init__(self):
        self.ssm = boto3.client('ssm')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def implement_phased_patching(self):
        """
        段階的パッチ適用の実装
        """
        # パッチンググループ戦略
        patching_groups = {
            'canary': {
                'percentage': 1,
                'description': 'Single instance for initial validation',
                'validation_time': 3600,  # 1 hour
                'rollback_threshold': {
                    'error_rate': 0.01,
                    'latency_increase': 1.2
                }
            },
            'pilot': {
                'percentage': 10,
                'description': 'Small subset for extended validation',
                'validation_time': 86400,  # 24 hours
                'rollback_threshold': {
                    'error_rate': 0.05,
                    'latency_increase': 1.5
                }
            },
            'wave_1': {
                'percentage': 33,
                'description': 'First production wave',
                'validation_time': 172800,  # 48 hours
            },
            'wave_2': {
                'percentage': 33,
                'description': 'Second production wave',
                'validation_time': 86400,  # 24 hours
            },
            'wave_3': {
                'percentage': 23,
                'description': 'Final production wave',
                'validation_time': 0
            }
        }
        
        # Systems Manager Patch Manager設定
        patch_baseline = {
            'Name': 'production-patch-baseline',
            'OperatingSystem': 'AMAZON_LINUX_2023',
            'GlobalFilters': {
                'PatchFilters': [{
                    'Key': 'CLASSIFICATION',
                    'Values': ['Security', 'Bugfix']
                }]
            },
            'ApprovalRules': {
                'PatchRules': [{
                    'PatchFilterGroup': {
                        'PatchFilters': [{
                            'Key': 'SEVERITY',
                            'Values': ['Critical', 'Important']
                        }]
                    },
                    'ComplianceLevel': 'CRITICAL',
                    'ApproveAfterDays': 0,
                    'EnableNonSecurity': False
                }]
            },
            'ApprovedPatches': [],
            'RejectedPatches': ['kernel*'],  # カーネルパッチは個別に管理
            'ApprovedPatchesComplianceLevel': 'HIGH',
            'ApprovedPatchesEnableNonSecurity': True
        }
        
        # メンテナンスウィンドウ
        maintenance_windows = {
            'canary': {
                'schedule': 'cron(0 2 ? * TUE *)',  # 毎週火曜日 2:00 AM
                'duration': 4,
                'cutoff': 1
            },
            'production': {
                'schedule': 'cron(0 2 ? * SUN *)',  # 毎週日曜日 2:00 AM
                'duration': 6,
                'cutoff': 2
            }
        }
        
        # 検証とロールバック
        validation_checks = """
        class PatchValidation:
            def __init__(self):
                self.cloudwatch = boto3.client('cloudwatch')
                self.elbv2 = boto3.client('elbv2')
                
            def validate_patch_success(self, instance_ids, baseline_metrics):
                validation_results = {
                    'passed': True,
                    'checks': []
                }
                
                # アプリケーションヘルスチェック
                health_check = self.check_application_health(instance_ids)
                validation_results['checks'].append({
                    'name': 'application_health',
                    'status': health_check['healthy'],
                    'details': health_check
                })
                
                # パフォーマンスメトリクス
                performance = self.check_performance_metrics(instance_ids, baseline_metrics)
                validation_results['checks'].append({
                    'name': 'performance',
                    'status': performance['within_threshold'],
                    'details': performance
                })
                
                # エラーレート
                error_rate = self.check_error_rates(instance_ids, baseline_metrics)
                validation_results['checks'].append({
                    'name': 'error_rate',
                    'status': error_rate['acceptable'],
                    'details': error_rate
                })
                
                # OS レベルチェック
                os_checks = self.run_os_validation(instance_ids)
                validation_results['checks'].append({
                    'name': 'os_validation',
                    'status': os_checks['passed'],
                    'details': os_checks
                })
                
                # 総合判定
                validation_results['passed'] = all(
                    check['status'] for check in validation_results['checks']
                )
                
                return validation_results
                
            def rollback_if_needed(self, validation_results, instance_ids):
                if not validation_results['passed']:
                    # ロールバック処理
                    for instance_id in instance_ids:
                        self.restore_from_snapshot(instance_id)
                        
                    # アラート送信
                    self.send_rollback_notification(validation_results)
                    
                    return {'action': 'rollback', 'reason': validation_results}
                    
                return {'action': 'continue', 'validation': validation_results}
        """
        
        return {
            'groups': patching_groups,
            'baseline': patch_baseline,
            'windows': maintenance_windows,
            'validation': validation_checks
        }
```

### コンテナとサーバーレスのセキュリティ

**コンテナイメージの脆弱性管理**

新しいパラダイムに対応した管理：

```python
class ContainerSecurity:
    """
    コンテナセキュリティの実装
    """
    
    def __init__(self):
        self.ecr = boto3.client('ecr')
        self.ecs = boto3.client('ecs')
        
    def implement_container_scanning(self):
        """
        コンテナスキャニングの実装
        """
        # ECRスキャニング設定
        ecr_scanning_config = {
            'scanOnPush': True,
            'repositoryFilters': [{
                'filter': '*',
                'filterType': 'WILDCARD'
            }],
            'scanFrequency': 'CONTINUOUS_SCAN',
            'rules': [{
                'scanFrequency': 'SCAN_ON_PUSH',
                'repositoryFilters': [{
                    'filter': 'prod-*',
                    'filterType': 'WILDCARD'
                }]
            }]
        }
        
        # コンテナイメージポリシー
        image_policies = {
            'base_image_policy': {
                'allowed_base_images': [
                    'alpine:latest',
                    'ubuntu:22.04',
                    'ubuntu:24.04',
                    'amazonlinux:2023'
                ],
                'prohibited_packages': [
                    'netcat',
                    'telnet',
                    'ftp'
                ],
                'required_labels': [
                    'maintainer',
                    'version',
                    'security-scan'
                ]
            },
            'vulnerability_thresholds': {
                'production': {
                    'critical': 0,
                    'high': 0,
                    'medium': 5,
                    'low': 'unlimited'
                },
                'staging': {
                    'critical': 0,
                    'high': 3,
                    'medium': 10,
                    'low': 'unlimited'
                }
            }
        }
        
        # ランタイム保護
        runtime_protection = """
        class ContainerRuntimeProtection:
            def __init__(self):
                self.guardduty = boto3.client('guardduty')
                
            def implement_runtime_security(self):
                # Fargate セキュリティ設定
                fargate_security = {
                    'task_definition': {
                        'requiresCompatibilities': ['FARGATE'],
                        'networkMode': 'awsvpc',
                        'cpu': '256',
                        'memory': '512',
                        'taskRoleArn': 'arn:aws:iam::account:role/minimal-task-role',
                        'executionRoleArn': 'arn:aws:iam::account:role/ecs-execution-role',
                        'containerDefinitions': [{
                            'name': 'app',
                            'image': 'ecr.region.amazonaws.com/repo:tag',
                            'readonlyRootFilesystem': True,
                            'user': '1000:1000',  # Non-root user
                            'linuxParameters': {
                                'capabilities': {
                                    'drop': ['ALL'],
                                    'add': ['NET_BIND_SERVICE']
                                },
                                'initProcessEnabled': True
                            },
                            'secrets': [{
                                'name': 'DB_PASSWORD',
                                'valueFrom': 'arn:aws:secretsmanager:region:account:secret:db-password'
                            }],
                            'environment': [{
                                'name': 'APP_ENV',
                                'value': 'production'
                            }]
                        }]
                    }
                }
                
                # セキュリティグループ
                security_group_config = {
                    'ingress': [{
                        'protocol': 'tcp',
                        'from_port': 443,
                        'to_port': 443,
                        'source_security_group': 'alb-sg'
                    }],
                    'egress': [{
                        'protocol': 'tcp',
                        'from_port': 443,
                        'to_port': 443,
                        'destination': '0.0.0.0/0',
                        'description': 'HTTPS outbound only'
                    }]
                }
                
                return {
                    'fargate': fargate_security,
                    'network': security_group_config
                }
        """
        
        return {
            'scanning': ecr_scanning_config,
            'policies': image_policies,
            'runtime': runtime_protection
        }
```

**サーバーレス関数のセキュリティ**

共有責任モデルの変化：

```python
class ServerlessSecurity:
    """
    サーバーレスセキュリティの実装
    """
    
    def __init__(self):
        self.lambda_client = boto3.client('lambda')
        
    def implement_lambda_security(self):
        """
        Lambda関数のセキュリティ実装
        """
        # セキュアな関数設定
        secure_function_config = {
            'Runtime': 'python3.12',
            'Handler': 'index.handler',
            'Role': 'arn:aws:iam::account:role/minimal-lambda-role',
            'Timeout': 30,
            'MemorySize': 256,
            'Environment': {
                'Variables': {
                    'LOG_LEVEL': 'INFO'
                }
            },
            'VpcConfig': {
                'SubnetIds': ['subnet-private-1', 'subnet-private-2'],
                'SecurityGroupIds': ['sg-lambda-egress-only']
            },
            'DeadLetterConfig': {
                'TargetArn': 'arn:aws:sqs:region:account:dlq'
            },
            'TracingConfig': {
                'Mode': 'Active'
            },
            'Layers': [
                'arn:aws:lambda:region:account:layer:security-runtime:1'
            ]
        }
        
        # ランタイム保護レイヤー
        security_layer = """
        import functools
        import json
        import logging
        from aws_lambda_powertools import Logger, Tracer, Metrics
        from aws_lambda_powertools.metrics import MetricUnit
        
        logger = Logger()
        tracer = Tracer()
        metrics = Metrics()
        
        def security_wrapper(func):
            @functools.wraps(func)
            def wrapper(event, context):
                # 入力検証
                try:
                    validated_event = validate_input(event)
                except ValidationError as e:
                    logger.error(f"Input validation failed: {e}")
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': 'Invalid input'})
                    }
                    
                # レート制限チェック
                if not check_rate_limit(event, context):
                    logger.warning("Rate limit exceeded")
                    return {
                        'statusCode': 429,
                        'body': json.dumps({'error': 'Rate limit exceeded'})
                    }
                    
                # セキュリティヘッダーの設定
                response = func(validated_event, context)
                
                if isinstance(response, dict) and 'headers' not in response:
                    response['headers'] = {}
                    
                response['headers'].update({
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block',
                    'Strict-Transport-Security': 'max-age=31536000',
                    'Content-Security-Policy': "default-src 'self'"
                })
                
                return response
                
            return wrapper
            
        def validate_input(event):
            # JSON Schema validation
            schema = {
                'type': 'object',
                'properties': {
                    'action': {'type': 'string', 'enum': ['read', 'write']},
                    'resource': {'type': 'string', 'pattern': '^[a-zA-Z0-9-_]+},
                    'data': {'type': 'object'}
                },
                'required': ['action', 'resource']
            }
            
            # Validate against schema
            # ... validation logic ...
            
            # Sanitize input
            sanitized = {}
            for key, value in event.items():
                if isinstance(value, str):
                    # Remove potential injection attempts
                    sanitized[key] = value.replace('<', '').replace('>', '')
                else:
                    sanitized[key] = value
                    
            return sanitized
        """
        
        # 依存関係の管理
        dependency_management = {
            'vulnerability_scanning': {
                'tool': 'safety check',
                'frequency': 'On every deployment',
                'action': 'Block deployment if critical vulnerabilities'
            },
            'minimal_dependencies': {
                'principle': 'Include only necessary packages',
                'review': 'Regular dependency audit',
                'alternatives': 'Consider AWS SDK instead of third-party'
            },
            'version_pinning': {
                'requirements': 'Pin all dependency versions',
                'updates': 'Automated PR for updates',
                'testing': 'Comprehensive test suite'
            }
        }
        
        return {
            'function_config': secure_function_config,
            'security_layer': security_layer,
            'dependencies': dependency_management
        }
```

### セキュリティの文化醸成

**DevSecOpsの実践**

セキュリティを開発プロセスに統合：

```python
class DevSecOpsCulture:
    """
    DevSecOps文化の実装
    """
    
    def __init__(self):
        self.codepipeline = boto3.client('codepipeline')
        
    def implement_security_pipeline(self):
        """
        セキュリティパイプラインの実装
        """
        # セキュリティゲート
        security_gates = {
            'commit_stage': {
                'checks': [
                    'Secret scanning',
                    'Linting',
                    'Basic SAST'
                ],
                'tools': ['git-secrets', 'pre-commit hooks'],
                'failure_action': 'Block commit'
            },
            'build_stage': {
                'checks': [
                    'Dependency vulnerability scan',
                    'Container image scan',
                    'License compliance'
                ],
                'tools': ['OWASP Dependency Check', 'Trivy', 'License Finder'],
                'failure_action': 'Fail build'
            },
            'test_stage': {
                'checks': [
                    'SAST',
                    'DAST',
                    'Security unit tests'
                ],
                'tools': ['SonarQube', 'OWASP ZAP', 'Custom security tests'],
                'failure_action': 'Block progression'
            },
            'deploy_stage': {
                'checks': [
                    'Infrastructure security scan',
                    'Configuration validation',
                    'Runtime protection deployment'
                ],
                'tools': ['Checkov', 'AWS Config Rules', 'GuardDuty'],
                'failure_action': 'Rollback'
            }
        }
        
        # セキュリティメトリクス
        security_metrics = {
            'vulnerability_metrics': {
                'mean_time_to_detect': 'Time from introduction to detection',
                'mean_time_to_remediate': 'Time from detection to fix',
                'vulnerability_density': 'Vulnerabilities per KLOC',
                'patch_compliance': 'Percentage of systems patched on time'
            },
            'process_metrics': {
                'security_training_completion': 'Percentage of developers trained',
                'code_review_coverage': 'Percentage of code reviewed',
                'security_test_coverage': 'Percentage of code with security tests',
                'incident_response_time': 'Time to respond to security incidents'
            },
            'outcome_metrics': {
                'security_incidents': 'Number of incidents per month',
                'data_breaches': 'Number and impact of breaches',
                'compliance_violations': 'Number of compliance issues',
                'customer_trust': 'Security-related customer satisfaction'
            }
        }
        
        # トレーニングプログラム
        training_program = {
            'onboarding': {
                'topics': [
                    'Secure coding practices',
                    'OWASP Top 10',
                    'Cloud security basics',
                    'Company security policies'
                ],
                'format': 'Interactive workshops',
                'duration': '2 days',
                'certification': 'Internal security certification'
            },
            'continuous_education': {
                'monthly_topics': [
                    'Latest vulnerabilities',
                    'New attack techniques',
                    'Tool updates',
                    'Case studies'
                ],
                'format': 'Lunch and learn sessions',
                'gamification': 'Security champions program'
            },
            'hands_on_labs': {
                'capture_the_flag': 'Monthly CTF competitions',
                'bug_bounty': 'Internal bug bounty program',
                'red_team_exercises': 'Quarterly attack simulations'
            }
        }
        
        return {
            'pipeline': security_gates,
            'metrics': security_metrics,
            'training': training_program
        }
```

**継続的な改善サイクル**

PDCAサイクルの実装：

```python
class ContinuousSecurityImprovement:
    """
    継続的セキュリティ改善の実装
    """
    
    def __init__(self):
        self.securityhub = boto3.client('securityhub')
        
    def implement_improvement_cycle(self):
        """
        改善サイクルの実装
        """
        # PDCAサイクル
        improvement_cycle = {
            'plan': {
                'activities': [
                    'Security assessment',
                    'Risk analysis',
                    'Goal setting',
                    'Resource allocation'
                ],
                'outputs': [
                    'Security roadmap',
                    'Budget allocation',
                    'Team assignments'
                ],
                'frequency': 'Quarterly'
            },
            'do': {
                'activities': [
                    'Implement security controls',
                    'Deploy security tools',
                    'Conduct training',
                    'Execute security tests'
                ],
                'tracking': 'JIRA tickets, project boards',
                'reporting': 'Weekly status updates'
            },
            'check': {
                'activities': [
                    'Security metrics review',
                    'Incident analysis',
                    'Compliance audit',
                    'Penetration testing'
                ],
                'tools': [
                    'Security dashboards',
                    'Automated reports',
                    'Third-party assessments'
                ],
                'frequency': 'Monthly'
            },
            'act': {
                'activities': [
                    'Process improvements',
                    'Tool updates',
                    'Policy revisions',
                    'Lessons learned'
                ],
                'documentation': 'Security wiki, runbooks',
                'communication': 'All-hands security updates'
            }
        }
        
        # 成熟度モデル
        maturity_model = {
            'level_1_initial': {
                'characteristics': [
                    'Ad-hoc security practices',
                    'Reactive incident response',
                    'Limited automation'
                ],
                'next_steps': 'Establish basic policies and procedures'
            },
            'level_2_managed': {
                'characteristics': [
                    'Documented policies',
                    'Basic automation',
                    'Regular assessments'
                ],
                'next_steps': 'Implement continuous monitoring'
            },
            'level_3_defined': {
                'characteristics': [
                    'Standardized processes',
                    'Integrated security tools',
                    'Proactive threat hunting'
                ],
                'next_steps': 'Achieve full automation'
            },
            'level_4_quantified': {
                'characteristics': [
                    'Metrics-driven decisions',
                    'Predictive analytics',
                    'Automated response'
                ],
                'next_steps': 'Continuous optimization'
            },
            'level_5_optimized': {
                'characteristics': [
                    'Self-healing systems',
                    'AI-driven security',
                    'Industry leadership'
                ],
                'continuous': 'Innovation and knowledge sharing'
            }
        }
        
        return {
            'pdca_cycle': improvement_cycle,
            'maturity': maturity_model
        }
```

## まとめ

第6章では、クラウド環境におけるIAMとセキュリティの実践について包括的に学びました。

**主要な学習ポイント**

1. **ロールベースのアクセス制御（RBAC）**：ゼロトラストモデルに基づいた最小権限の原則を実装し、動的な権限管理システムを構築する方法を習得しました。

2. **多要素認証とシークレット管理**：パスワードを超えたセキュリティ層の実装と、安全な認証情報管理の実践を学びました。

3. **監査ログとセキュリティイベントの監視**：包括的なログ収集戦略とリアルタイム脅威検出システムの構築方法を理解しました。

4. **WAFとDDoS対策**：アプリケーション層の保護と大規模攻撃への対処法を習得しました。

5. **脆弱性管理とパッチ適用**：継続的なセキュリティ改善プロセスとDevSecOpsの実践を学びました。

これらの技術と実践を組み合わせることで、クラウド環境における包括的なセキュリティ体制を構築できるようになりました。セキュリティは一度構築すれば終わりではなく、継続的な改善が必要な領域です。次章では、このセキュアなインフラストラクチャを効果的に監視し、最適化するための手法について詳しく学びます。
---

[第07章](../chapter-chapter07/index.md)へ進む
