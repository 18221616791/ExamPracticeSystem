#!/bin/bash

# 快速配置CI/CD脚本
# 帮助用户快速设置自动化部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}    题库系统 CI/CD 配置向导${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_step "检查系统依赖..."
    
    local missing_deps=()
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v ssh &> /dev/null; then
        missing_deps+=("ssh")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少以下依赖: ${missing_deps[*]}"
        print_info "请先安装这些依赖，然后重新运行此脚本"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 选择部署方案
select_deployment_method() {
    print_step "选择部署方案"
    echo
    echo "请选择您的部署方案:"
    echo "1) GitHub Actions (推荐 - 完全自动化)"
    echo "2) 手动脚本部署 (适用于任何Git仓库)"
    echo "3) Webhook自动部署 (Git推送触发)"
    echo "4) 仅本地Docker开发环境"
    echo
    
    while true; do
        read -p "请输入选项 (1-4): " choice
        case $choice in
            1)
                DEPLOYMENT_METHOD="github-actions"
                break
                ;;
            2)
                DEPLOYMENT_METHOD="manual-script"
                break
                ;;
            3)
                DEPLOYMENT_METHOD="webhook"
                break
                ;;
            4)
                DEPLOYMENT_METHOD="local-dev"
                break
                ;;
            *)
                print_warning "请输入有效选项 (1-4)"
                ;;
        esac
    done
    
    print_info "已选择: $DEPLOYMENT_METHOD"
}

# 收集服务器信息
collect_server_info() {
    if [ "$DEPLOYMENT_METHOD" = "local-dev" ]; then
        return 0
    fi
    
    print_step "收集服务器信息"
    
    read -p "服务器IP地址: " SERVER_HOST
    read -p "SSH用户名 [root]: " SERVER_USER
    SERVER_USER=${SERVER_USER:-root}
    read -p "SSH端口 [22]: " SERVER_PORT
    SERVER_PORT=${SERVER_PORT:-22}
    read -p "部署路径 [/opt/question-bank]: " DEPLOY_PATH
    DEPLOY_PATH=${DEPLOY_PATH:-/opt/question-bank}
    
    # 测试SSH连接
    print_info "测试SSH连接..."
    if ssh -p $SERVER_PORT -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'SSH连接成功'" 2>/dev/null; then
        print_success "SSH连接测试成功"
    else
        print_warning "SSH连接测试失败，请确保:"
        echo "  1. 服务器信息正确"
        echo "  2. SSH密钥已配置"
        echo "  3. 服务器防火墙允许SSH连接"
        
        read -p "是否继续配置? (y/n): " continue_setup
        if [ "$continue_setup" != "y" ]; then
            exit 1
        fi
    fi
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# 配置环境变量
setup_environment() {
    print_step "配置环境变量"
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_info "已创建 .env 文件"
    fi
    
    # 生成随机密码
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)
    WEBHOOK_SECRET=$(generate_password)
    
    # 更新环境变量
    if [ "$DEPLOYMENT_METHOD" != "local-dev" ]; then
        sed -i "s/DB_HOST=localhost/DB_HOST=mysql/g" .env
    fi
    sed -i "s/DB_PASSWORD=your_secure_password/DB_PASSWORD=$DB_PASSWORD/g" .env
    sed -i "s/JWT_SECRET=your_jwt_secret_key/JWT_SECRET=$JWT_SECRET/g" .env
    sed -i "s/MYSQL_ROOT_PASSWORD=your_mysql_root_password/MYSQL_ROOT_PASSWORD=$DB_PASSWORD/g" .env
    
    print_success "环境变量配置完成"
    print_info "数据库密码: $DB_PASSWORD"
    print_info "JWT密钥: $JWT_SECRET"
    
    if [ "$DEPLOYMENT_METHOD" = "webhook" ]; then
        print_info "Webhook密钥: $WEBHOOK_SECRET"
        echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
    fi
}

# 配置GitHub Actions
setup_github_actions() {
    print_step "配置GitHub Actions"
    
    print_info "GitHub Actions工作流已创建: .github/workflows/deploy.yml"
    print_warning "请在GitHub仓库中配置以下Secrets:"
    echo
    echo "  SERVER_HOST: $SERVER_HOST"
    echo "  SERVER_USER: $SERVER_USER"
    echo "  SERVER_PORT: $SERVER_PORT"
    echo "  SERVER_SSH_KEY: [您的SSH私钥]"
    echo "  DB_PASSWORD: $DB_PASSWORD"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo
    print_info "配置路径: GitHub仓库 > Settings > Secrets and variables > Actions"
    
    # 生成SSH密钥提示
    print_info "如果还没有SSH密钥，请运行以下命令生成:"
    echo "  ssh-keygen -t rsa -b 4096 -C 'deploy@question-bank'"
    echo "  cat ~/.ssh/id_rsa.pub  # 公钥添加到服务器"
    echo "  cat ~/.ssh/id_rsa      # 私钥添加到GitHub Secrets"
}

# 配置手动脚本
setup_manual_script() {
    print_step "配置手动部署脚本"
    
    # 更新脚本配置
    sed -i "s/SERVER_HOST=\"your-server-ip\"/SERVER_HOST=\"$SERVER_HOST\"/g" ci-cd-setup.sh
    sed -i "s/SERVER_USER=\"root\"/SERVER_USER=\"$SERVER_USER\"/g" ci-cd-setup.sh
    sed -i "s/SERVER_PORT=\"22\"/SERVER_PORT=\"$SERVER_PORT\"/g" ci-cd-setup.sh
    sed -i "s|DEPLOY_PATH=\"/opt/question-bank\"|DEPLOY_PATH=\"$DEPLOY_PATH\"|g" ci-cd-setup.sh
    
    chmod +x ci-cd-setup.sh
    
    print_success "手动部署脚本配置完成"
    print_info "使用方法:"
    echo "  ./ci-cd-setup.sh deploy   # 部署项目"
    echo "  ./ci-cd-setup.sh rollback # 回滚版本"
    echo "  ./ci-cd-setup.sh logs     # 查看日志"
    echo "  ./ci-cd-setup.sh health   # 健康检查"
}

# 配置Webhook部署
setup_webhook() {
    print_step "配置Webhook自动部署"
    
    # 更新webhook配置
    sed -i "s/WEBHOOK_SECRET=your-webhook-secret/WEBHOOK_SECRET=$WEBHOOK_SECRET/g" webhook-deploy.service
    sed -i "s|PROJECT_PATH=/opt/question-bank/current|PROJECT_PATH=$DEPLOY_PATH/current|g" webhook-deploy.service
    
    print_success "Webhook配置完成"
    print_info "Webhook密钥: $WEBHOOK_SECRET"
    print_info "在服务器上安装Webhook服务:"
    echo "  npm run webhook:install"
    echo "  npm run webhook:enable"
    echo "  npm run webhook:start-service"
    echo
    print_info "Git仓库Webhook配置:"
    echo "  GitHub: http://$SERVER_HOST:3001/webhook/github"
    echo "  GitLab: http://$SERVER_HOST:3001/webhook/gitlab"
    echo "  Gitee:  http://$SERVER_HOST:3001/webhook/gitee"
    echo "  Secret: $WEBHOOK_SECRET"
}

# 配置本地开发环境
setup_local_dev() {
    print_step "配置本地开发环境"
    
    print_info "安装项目依赖..."
    npm install
    cd client && npm install && cd ..
    
    print_success "本地开发环境配置完成"
    print_info "启动开发环境:"
    echo "  npm run docker:dev        # 启动开发环境"
    echo "  npm run dev               # 启动本地开发服务器"
    echo "  npm run docker:dev:down   # 停止开发环境"
}

# 创建部署文档
create_deployment_docs() {
    print_step "创建部署文档"
    
    cat > DEPLOYMENT-SUMMARY.md << EOF
# 部署配置摘要

## 部署方案
**选择的方案**: $DEPLOYMENT_METHOD

## 服务器信息
- **服务器地址**: $SERVER_HOST
- **SSH用户**: $SERVER_USER
- **SSH端口**: $SERVER_PORT
- **部署路径**: $DEPLOY_PATH

## 环境变量
- **数据库密码**: $DB_PASSWORD
- **JWT密钥**: $JWT_SECRET
EOF

    if [ "$DEPLOYMENT_METHOD" = "webhook" ]; then
        echo "- **Webhook密钥**: $WEBHOOK_SECRET" >> DEPLOYMENT-SUMMARY.md
    fi
    
    cat >> DEPLOYMENT-SUMMARY.md << EOF

## 访问地址
- **前端**: http://$SERVER_HOST
- **API**: http://$SERVER_HOST/api
- **健康检查**: http://$SERVER_HOST/health
EOF

    if [ "$DEPLOYMENT_METHOD" = "webhook" ]; then
        cat >> DEPLOYMENT-SUMMARY.md << EOF
- **Webhook**: http://$SERVER_HOST:3001
EOF
    fi
    
    cat >> DEPLOYMENT-SUMMARY.md << EOF

## 常用命令
EOF

    case $DEPLOYMENT_METHOD in
        "github-actions")
            cat >> DEPLOYMENT-SUMMARY.md << EOF
- 推送代码到main分支即可自动部署
- 查看部署状态: GitHub Actions页面
EOF
            ;;
        "manual-script")
            cat >> DEPLOYMENT-SUMMARY.md << EOF
- 部署: \`./ci-cd-setup.sh deploy\`
- 回滚: \`./ci-cd-setup.sh rollback\`
- 日志: \`./ci-cd-setup.sh logs\`
- 健康检查: \`./ci-cd-setup.sh health\`
EOF
            ;;
        "webhook")
            cat >> DEPLOYMENT-SUMMARY.md << EOF
- 推送代码到main分支即可自动部署
- 查看Webhook日志: \`npm run webhook:logs\`
- 手动部署: POST http://$SERVER_HOST:3001/deploy/manual
EOF
            ;;
        "local-dev")
            cat >> DEPLOYMENT-SUMMARY.md << EOF
- 启动开发环境: \`npm run docker:dev\`
- 启动本地服务: \`npm run dev\`
- 停止开发环境: \`npm run docker:dev:down\`
EOF
            ;;
    esac
    
    cat >> DEPLOYMENT-SUMMARY.md << EOF

## 相关文档
- [CI/CD详细指南](./CI-CD-GUIDE.md)
- [Docker部署指南](./DEPLOYMENT.md)
- [项目README](./README.md)

---
*此文档由setup-cicd.sh自动生成于 $(date)*
EOF

    print_success "部署文档已创建: DEPLOYMENT-SUMMARY.md"
}

# 显示完成信息
show_completion() {
    print_success "CI/CD配置完成！"
    echo
    print_info "配置摘要:"
    echo "  - 部署方案: $DEPLOYMENT_METHOD"
    if [ "$DEPLOYMENT_METHOD" != "local-dev" ]; then
        echo "  - 服务器: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
        echo "  - 部署路径: $DEPLOY_PATH"
    fi
    echo "  - 环境变量已配置"
    echo "  - 部署文档已生成"
    echo
    
    case $DEPLOYMENT_METHOD in
        "github-actions")
            print_info "下一步:"
            echo "  1. 将代码推送到GitHub"
            echo "  2. 在GitHub仓库中配置Secrets"
            echo "  3. 推送到main分支触发自动部署"
            ;;
        "manual-script")
            print_info "下一步:"
            echo "  1. 运行: ./ci-cd-setup.sh deploy"
            echo "  2. 等待部署完成"
            echo "  3. 访问: http://$SERVER_HOST"
            ;;
        "webhook")
            print_info "下一步:"
            echo "  1. 在服务器上安装Webhook服务"
            echo "  2. 在Git仓库中配置Webhook"
            echo "  3. 推送代码触发自动部署"
            ;;
        "local-dev")
            print_info "下一步:"
            echo "  1. 运行: npm run docker:dev"
            echo "  2. 访问: http://localhost:3001"
            ;;
    esac
    
    echo
    print_info "详细文档请查看:"
    echo "  - CI-CD-GUIDE.md (详细指南)"
    echo "  - DEPLOYMENT-SUMMARY.md (配置摘要)"
}

# 主函数
main() {
    print_header
    
    check_dependencies
    select_deployment_method
    collect_server_info
    setup_environment
    
    case $DEPLOYMENT_METHOD in
        "github-actions")
            setup_github_actions
            ;;
        "manual-script")
            setup_manual_script
            ;;
        "webhook")
            setup_webhook
            ;;
        "local-dev")
            setup_local_dev
            ;;
    esac
    
    create_deployment_docs
    show_completion
}

# 运行主函数
main "$@"