# 快速配置CI/CD脚本 (PowerShell版本)
# 帮助用户快速设置自动化部署

param(
    [string]$Action = "setup"
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Purple = "Magenta"
    Cyan = "Cyan"
}

# 打印函数
function Write-Header {
    Write-Host "================================" -ForegroundColor $Colors.Purple
    Write-Host "    题库系统 CI/CD 配置向导" -ForegroundColor $Colors.Purple
    Write-Host "================================" -ForegroundColor $Colors.Purple
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor $Colors.Purple
}

# 检查依赖
function Test-Dependencies {
    Write-Step "检查系统依赖..."
    
    $missingDeps = @()
    
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        $missingDeps += "git"
    }
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        $missingDeps += "node"
    }
    
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        $missingDeps += "npm"
    }
    
    if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
        $missingDeps += "ssh"
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Error "缺少以下依赖: $($missingDeps -join ', ')"
        Write-Info "请先安装这些依赖，然后重新运行此脚本"
        Write-Info "推荐安装方式:"
        Write-Info "  - Git: https://git-scm.com/download/win"
        Write-Info "  - Node.js: https://nodejs.org/"
        Write-Info "  - SSH: 通过Git Bash或Windows OpenSSH"
        exit 1
    }
    
    Write-Success "依赖检查通过"
}

# 选择部署方案
function Select-DeploymentMethod {
    Write-Step "选择部署方案"
    Write-Host ""
    Write-Host "请选择您的部署方案:"
    Write-Host "1) GitHub Actions (推荐 - 完全自动化)"
    Write-Host "2) 手动脚本部署 (适用于任何Git仓库)"
    Write-Host "3) Webhook自动部署 (Git推送触发)"
    Write-Host "4) 仅本地Docker开发环境"
    Write-Host ""
    
    do {
        $choice = Read-Host "请输入选项 (1-4)"
        switch ($choice) {
            "1" {
                $script:DeploymentMethod = "github-actions"
                break
            }
            "2" {
                $script:DeploymentMethod = "manual-script"
                break
            }
            "3" {
                $script:DeploymentMethod = "webhook"
                break
            }
            "4" {
                $script:DeploymentMethod = "local-dev"
                break
            }
            default {
                Write-Warning "请输入有效选项 (1-4)"
                continue
            }
        }
        break
    } while ($true)
    
    Write-Info "已选择: $script:DeploymentMethod"
}

# 收集服务器信息
function Get-ServerInfo {
    if ($script:DeploymentMethod -eq "local-dev") {
        return
    }
    
    Write-Step "收集服务器信息"
    
    $script:ServerHost = Read-Host "服务器IP地址"
    $serverUser = Read-Host "SSH用户名 [root]"
    $script:ServerUser = if ($serverUser) { $serverUser } else { "root" }
    $serverPort = Read-Host "SSH端口 [22]"
    $script:ServerPort = if ($serverPort) { $serverPort } else { "22" }
    $deployPath = Read-Host "部署路径 [/opt/question-bank]"
    $script:DeployPath = if ($deployPath) { $deployPath } else { "/opt/question-bank" }
    
    # 测试SSH连接
    Write-Info "测试SSH连接..."
    try {
        $testResult = ssh -p $script:ServerPort -o ConnectTimeout=10 -o BatchMode=yes "$script:ServerUser@$script:ServerHost" "echo 'SSH连接成功'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "SSH连接测试成功"
        } else {
            throw "SSH连接失败"
        }
    } catch {
        Write-Warning "SSH连接测试失败，请确保:"
        Write-Host "  1. 服务器信息正确"
        Write-Host "  2. SSH密钥已配置"
        Write-Host "  3. 服务器防火墙允许SSH连接"
        
        $continueSetup = Read-Host "是否继续配置? (y/n)"
        if ($continueSetup -ne "y") {
            exit 1
        }
    }
}

# 生成随机密码
function New-RandomPassword {
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $password = ""
    for ($i = 0; $i -lt 25; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# 配置环境变量
function Set-Environment {
    Write-Step "配置环境变量"
    
    if (!(Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Info "已创建 .env 文件"
    }
    
    # 生成随机密码
    $script:DbPassword = New-RandomPassword
    $script:JwtSecret = New-RandomPassword
    $script:WebhookSecret = New-RandomPassword
    
    # 读取.env文件内容
    $envContent = Get-Content ".env" -Raw
    
    # 更新环境变量
    if ($script:DeploymentMethod -ne "local-dev") {
        $envContent = $envContent -replace "DB_HOST=localhost", "DB_HOST=mysql"
    }
    $envContent = $envContent -replace "DB_PASSWORD=your_secure_password", "DB_PASSWORD=$script:DbPassword"
    $envContent = $envContent -replace "JWT_SECRET=your_jwt_secret_key", "JWT_SECRET=$script:JwtSecret"
    $envContent = $envContent -replace "MYSQL_ROOT_PASSWORD=your_mysql_root_password", "MYSQL_ROOT_PASSWORD=$script:DbPassword"
    
    if ($script:DeploymentMethod -eq "webhook") {
        $envContent += "`nWEBHOOK_SECRET=$script:WebhookSecret"
    }
    
    # 写回.env文件
    Set-Content ".env" $envContent -Encoding UTF8
    
    Write-Success "环境变量配置完成"
    Write-Info "数据库密码: $script:DbPassword"
    Write-Info "JWT密钥: $script:JwtSecret"
    
    if ($script:DeploymentMethod -eq "webhook") {
        Write-Info "Webhook密钥: $script:WebhookSecret"
    }
}

# 配置GitHub Actions
function Set-GitHubActions {
    Write-Step "配置GitHub Actions"
    
    Write-Info "GitHub Actions工作流已创建: .github/workflows/deploy.yml"
    Write-Warning "请在GitHub仓库中配置以下Secrets:"
    Write-Host ""
    Write-Host "  SERVER_HOST: $script:ServerHost"
    Write-Host "  SERVER_USER: $script:ServerUser"
    Write-Host "  SERVER_PORT: $script:ServerPort"
    Write-Host "  SERVER_SSH_KEY: [您的SSH私钥]"
    Write-Host "  DB_PASSWORD: $script:DbPassword"
    Write-Host "  JWT_SECRET: $script:JwtSecret"
    Write-Host ""
    Write-Info "配置路径: GitHub仓库 > Settings > Secrets and variables > Actions"
    
    # 生成SSH密钥提示
    Write-Info "如果还没有SSH密钥，请运行以下命令生成:"
    Write-Host "  ssh-keygen -t rsa -b 4096 -C 'deploy@question-bank'"
    Write-Host "  Get-Content ~/.ssh/id_rsa.pub  # 公钥添加到服务器"
    Write-Host "  Get-Content ~/.ssh/id_rsa      # 私钥添加到GitHub Secrets"
}

# 配置手动脚本
function Set-ManualScript {
    Write-Step "配置手动部署脚本"
    
    # 更新Windows批处理脚本配置
    if (Test-Path "ci-cd-setup.bat") {
        $batContent = Get-Content "ci-cd-setup.bat" -Raw
        $batContent = $batContent -replace 'set SERVER_HOST=your-server-ip', "set SERVER_HOST=$script:ServerHost"
        $batContent = $batContent -replace 'set SERVER_USER=root', "set SERVER_USER=$script:ServerUser"
        $batContent = $batContent -replace 'set SERVER_PORT=22', "set SERVER_PORT=$script:ServerPort"
        $batContent = $batContent -replace 'set DEPLOY_PATH=/opt/question-bank', "set DEPLOY_PATH=$script:DeployPath"
        Set-Content "ci-cd-setup.bat" $batContent -Encoding UTF8
    }
    
    # 更新Linux脚本配置
    if (Test-Path "ci-cd-setup.sh") {
        $shContent = Get-Content "ci-cd-setup.sh" -Raw
        $shContent = $shContent -replace 'SERVER_HOST="your-server-ip"', "SERVER_HOST=`"$script:ServerHost`""
        $shContent = $shContent -replace 'SERVER_USER="root"', "SERVER_USER=`"$script:ServerUser`""
        $shContent = $shContent -replace 'SERVER_PORT="22"', "SERVER_PORT=`"$script:ServerPort`""
        $shContent = $shContent -replace 'DEPLOY_PATH="/opt/question-bank"', "DEPLOY_PATH=`"$script:DeployPath`""
        Set-Content "ci-cd-setup.sh" $shContent -Encoding UTF8
    }
    
    Write-Success "手动部署脚本配置完成"
    Write-Info "Windows使用方法:"
    Write-Host "  .\ci-cd-setup.bat deploy   # 部署项目"
    Write-Host "  .\ci-cd-setup.bat rollback # 回滚版本"
    Write-Host "  .\ci-cd-setup.bat logs     # 查看日志"
    Write-Host "  .\ci-cd-setup.bat health   # 健康检查"
    Write-Info "Linux使用方法:"
    Write-Host "  ./ci-cd-setup.sh deploy   # 部署项目"
    Write-Host "  ./ci-cd-setup.sh rollback # 回滚版本"
    Write-Host "  ./ci-cd-setup.sh logs     # 查看日志"
    Write-Host "  ./ci-cd-setup.sh health   # 健康检查"
}

# 配置Webhook部署
function Set-Webhook {
    Write-Step "配置Webhook自动部署"
    
    # 更新webhook配置
    if (Test-Path "webhook-deploy.service") {
        $serviceContent = Get-Content "webhook-deploy.service" -Raw
        $serviceContent = $serviceContent -replace "WEBHOOK_SECRET=your-webhook-secret", "WEBHOOK_SECRET=$script:WebhookSecret"
        $serviceContent = $serviceContent -replace "PROJECT_PATH=/opt/question-bank/current", "PROJECT_PATH=$script:DeployPath/current"
        Set-Content "webhook-deploy.service" $serviceContent -Encoding UTF8
    }
    
    Write-Success "Webhook配置完成"
    Write-Info "Webhook密钥: $script:WebhookSecret"
    Write-Info "在服务器上安装Webhook服务:"
    Write-Host "  npm run webhook:install"
    Write-Host "  npm run webhook:enable"
    Write-Host "  npm run webhook:start-service"
    Write-Host ""
    Write-Info "Git仓库Webhook配置:"
    Write-Host "  GitHub: http://$script:ServerHost:3001/webhook/github"
    Write-Host "  GitLab: http://$script:ServerHost:3001/webhook/gitlab"
    Write-Host "  Gitee:  http://$script:ServerHost:3001/webhook/gitee"
    Write-Host "  Secret: $script:WebhookSecret"
}

# 配置本地开发环境
function Set-LocalDev {
    Write-Step "配置本地开发环境"
    
    Write-Info "安装项目依赖..."
    try {
        npm install
        Set-Location "client"
        npm install
        Set-Location ".."
        
        Write-Success "本地开发环境配置完成"
        Write-Info "启动开发环境:"
        Write-Host "  npm run docker:dev        # 启动开发环境"
        Write-Host "  npm run dev               # 启动本地开发服务器"
        Write-Host "  npm run docker:dev:down   # 停止开发环境"
    } catch {
        Write-Error "依赖安装失败: $($_.Exception.Message)"
    }
}

# 创建部署文档
function New-DeploymentDocs {
    Write-Step "创建部署文档"
    
    $docContent = @"
# 部署配置摘要

## 部署方案
**选择的方案**: $script:DeploymentMethod

## 服务器信息
- **服务器地址**: $script:ServerHost
- **SSH用户**: $script:ServerUser
- **SSH端口**: $script:ServerPort
- **部署路径**: $script:DeployPath

## 环境变量
- **数据库密码**: $script:DbPassword
- **JWT密钥**: $script:JwtSecret
"@

    if ($script:DeploymentMethod -eq "webhook") {
        $docContent += "`n- **Webhook密钥**: $script:WebhookSecret"
    }
    
    $docContent += @"

## 访问地址
- **前端**: http://$script:ServerHost
- **API**: http://$script:ServerHost/api
- **健康检查**: http://$script:ServerHost/health
"@

    if ($script:DeploymentMethod -eq "webhook") {
        $docContent += "`n- **Webhook**: http://$script:ServerHost:3001"
    }
    
    $docContent += "`n`n## 常用命令"
    
    switch ($script:DeploymentMethod) {
        "github-actions" {
            $docContent += @"
- 推送代码到main分支即可自动部署
- 查看部署状态: GitHub Actions页面
"@
        }
        "manual-script" {
            $docContent += @"
- 部署: `.\ci-cd-setup.bat deploy` (Windows) 或 `./ci-cd-setup.sh deploy` (Linux)
- 回滚: `.\ci-cd-setup.bat rollback` (Windows) 或 `./ci-cd-setup.sh rollback` (Linux)
- 日志: `.\ci-cd-setup.bat logs` (Windows) 或 `./ci-cd-setup.sh logs` (Linux)
- 健康检查: `.\ci-cd-setup.bat health` (Windows) 或 `./ci-cd-setup.sh health` (Linux)
"@
        }
        "webhook" {
            $docContent += @"
- 推送代码到main分支即可自动部署
- 查看Webhook日志: `npm run webhook:logs`
- 手动部署: POST http://$script:ServerHost:3001/deploy/manual
"@
        }
        "local-dev" {
            $docContent += @"
- 启动开发环境: `npm run docker:dev`
- 启动本地服务: `npm run dev`
- 停止开发环境: `npm run docker:dev:down`
"@
        }
    }
    
    $docContent += @"

## 相关文档
- [CI/CD详细指南](./CI-CD-GUIDE.md)
- [Docker部署指南](./DEPLOYMENT.md)
- [项目README](./README.md)

---
*此文档由setup-cicd.ps1自动生成于 $(Get-Date)*
"@

    Set-Content "DEPLOYMENT-SUMMARY.md" $docContent -Encoding UTF8
    Write-Success "部署文档已创建: DEPLOYMENT-SUMMARY.md"
}

# 显示完成信息
function Show-Completion {
    Write-Success "CI/CD配置完成！"
    Write-Host ""
    Write-Info "配置摘要:"
    Write-Host "  - 部署方案: $script:DeploymentMethod"
    if ($script:DeploymentMethod -ne "local-dev") {
        Write-Host "  - 服务器: $script:ServerUser@$script:ServerHost:$script:ServerPort"
        Write-Host "  - 部署路径: $script:DeployPath"
    }
    Write-Host "  - 环境变量已配置"
    Write-Host "  - 部署文档已生成"
    Write-Host ""
    
    switch ($script:DeploymentMethod) {
        "github-actions" {
            Write-Info "下一步:"
            Write-Host "  1. 将代码推送到GitHub"
            Write-Host "  2. 在GitHub仓库中配置Secrets"
            Write-Host "  3. 推送到main分支触发自动部署"
        }
        "manual-script" {
            Write-Info "下一步:"
            Write-Host "  1. 运行: .\ci-cd-setup.bat deploy (Windows) 或 ./ci-cd-setup.sh deploy (Linux)"
            Write-Host "  2. 等待部署完成"
            Write-Host "  3. 访问: http://$script:ServerHost"
        }
        "webhook" {
            Write-Info "下一步:"
            Write-Host "  1. 在服务器上安装Webhook服务"
            Write-Host "  2. 在Git仓库中配置Webhook"
            Write-Host "  3. 推送代码触发自动部署"
        }
        "local-dev" {
            Write-Info "下一步:"
            Write-Host "  1. 运行: npm run docker:dev"
            Write-Host "  2. 访问: http://localhost:3001"
        }
    }
    
    Write-Host ""
    Write-Info "详细文档请查看:"
    Write-Host "  - CI-CD-GUIDE.md (详细指南)"
    Write-Host "  - DEPLOYMENT-SUMMARY.md (配置摘要)"
}

# 主函数
function Main {
    Write-Header
    
    Test-Dependencies
    Select-DeploymentMethod
    Get-ServerInfo
    Set-Environment
    
    switch ($script:DeploymentMethod) {
        "github-actions" {
            Set-GitHubActions
        }
        "manual-script" {
            Set-ManualScript
        }
        "webhook" {
            Set-Webhook
        }
        "local-dev" {
            Set-LocalDev
        }
    }
    
    New-DeploymentDocs
    Show-Completion
}

# 脚本变量初始化
$script:DeploymentMethod = ""
$script:ServerHost = ""
$script:ServerUser = ""
$script:ServerPort = ""
$script:DeployPath = ""
$script:DbPassword = ""
$script:JwtSecret = ""
$script:WebhookSecret = ""

# 运行主函数
if ($Action -eq "setup") {
    Main
} else {
    Write-Error "未知操作: $Action"
    Write-Info "使用方法: .\setup-cicd.ps1 -Action setup"
}