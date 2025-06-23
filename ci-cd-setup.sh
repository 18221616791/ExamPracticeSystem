#!/bin/bash

# CI/CD 自动化部署脚本
# 适用于阿里云服务器或其他Linux服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量（请根据实际情况修改）
SERVER_HOST="your-server-ip"
SERVER_USER="root"
SERVER_PORT="22"
DEPLOY_PATH="/opt/question-bank"
GIT_REPO="https://github.com/your-username/your-repo.git"
GIT_BRANCH="main"

# 函数：打印信息
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

# 函数：检查依赖
check_dependencies() {
    print_info "检查本地依赖..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git 未安装"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        print_error "SSH 未安装"
        exit 1
    fi
    
    if ! command -v scp &> /dev/null; then
        print_error "SCP 未安装"
        exit 1
    fi
    
    print_success "依赖检查完成"
}

# 函数：构建项目
build_project() {
    print_info "构建项目..."
    
    # 安装依赖
    npm install
    cd client && npm install && cd ..
    
    # 构建前端
    npm run build
    
    print_success "项目构建完成"
}

# 函数：部署到服务器
deploy_to_server() {
    print_info "部署到服务器 $SERVER_HOST..."
    
    # 创建临时目录
    TEMP_DIR="/tmp/question-bank-deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $TEMP_DIR
    
    # 复制必要文件
    cp -r client/dist $TEMP_DIR/
    cp -r server $TEMP_DIR/
    cp package*.json $TEMP_DIR/
    cp docker-compose.yml $TEMP_DIR/
    cp Dockerfile $TEMP_DIR/
    cp nginx.conf $TEMP_DIR/
    cp -r mysql-init $TEMP_DIR/
    cp deploy.sh $TEMP_DIR/
    cp quick-start.sh $TEMP_DIR/
    cp .env.example $TEMP_DIR/
    cp .dockerignore $TEMP_DIR/
    
    # 在服务器上创建目录结构
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"
    
    # 备份当前版本
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "
        cd $DEPLOY_PATH
        if [ -d 'current' ]; then
            mv current backup-\$(date +%Y%m%d-%H%M%S)
            # 只保留最近5个备份
            ls -t | grep '^backup-' | tail -n +6 | xargs -r rm -rf
        fi
        mkdir -p current
    "
    
    # 上传文件
    scp -P $SERVER_PORT -r $TEMP_DIR/* $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/current/
    
    # 在服务器上执行部署
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "
        cd $DEPLOY_PATH/current
        
        # 设置执行权限
        chmod +x deploy.sh
        chmod +x quick-start.sh
        
        # 检查Docker是否安装
        if ! command -v docker &> /dev/null; then
            echo '安装Docker...'
            curl -fsSL https://get.docker.com | sh
            systemctl start docker
            systemctl enable docker
        fi
        
        # 检查Docker Compose是否安装
        if ! command -v docker-compose &> /dev/null; then
            echo '安装Docker Compose...'
            curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # 创建环境变量文件
        if [ ! -f .env ]; then
            cp .env.example .env
            echo '请编辑 .env 文件设置正确的环境变量'
        fi
        
        # 停止旧服务
        docker-compose down || true
        
        # 启动新服务
        docker-compose up -d
        
        # 等待服务启动
        sleep 30
        
        # 检查服务状态
        docker-compose ps
        
        echo '部署完成！'
    "
    
    # 清理临时文件
    rm -rf $TEMP_DIR
    
    print_success "部署完成"
}

# 函数：健康检查
health_check() {
    print_info "执行健康检查..."
    
    # 检查服务是否响应
    if curl -f http://$SERVER_HOST/health &> /dev/null; then
        print_success "服务运行正常"
    else
        print_warning "健康检查失败，请检查服务状态"
    fi
}

# 函数：回滚
rollback() {
    print_info "回滚到上一个版本..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "
        cd $DEPLOY_PATH
        
        # 停止当前服务
        cd current && docker-compose down || true
        cd ..
        
        # 找到最新的备份
        LATEST_BACKUP=\$(ls -t | grep '^backup-' | head -n 1)
        
        if [ -z \"\$LATEST_BACKUP\" ]; then
            echo '没有找到备份版本'
            exit 1
        fi
        
        # 备份当前版本
        mv current failed-\$(date +%Y%m%d-%H%M%S)
        
        # 恢复备份版本
        mv \$LATEST_BACKUP current
        
        # 启动服务
        cd current && docker-compose up -d
        
        echo '回滚完成'
    "
    
    print_success "回滚完成"
}

# 函数：查看日志
view_logs() {
    print_info "查看服务日志..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "
        cd $DEPLOY_PATH/current
        docker-compose logs -f --tail=100
    "
}

# 函数：显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy     构建并部署项目"
    echo "  rollback   回滚到上一个版本"
    echo "  logs       查看服务日志"
    echo "  health     执行健康检查"
    echo "  setup      初始化CI/CD配置"
    echo "  help       显示此帮助信息"
    echo ""
}

# 函数：初始化配置
setup_cicd() {
    print_info "初始化CI/CD配置..."
    
    echo "请输入服务器信息:"
    read -p "服务器IP地址: " SERVER_HOST
    read -p "SSH用户名 [root]: " SERVER_USER
    SERVER_USER=${SERVER_USER:-root}
    read -p "SSH端口 [22]: " SERVER_PORT
    SERVER_PORT=${SERVER_PORT:-22}
    read -p "部署路径 [/opt/question-bank]: " DEPLOY_PATH
    DEPLOY_PATH=${DEPLOY_PATH:-/opt/question-bank}
    
    # 更新脚本中的配置
    sed -i "s/SERVER_HOST=\"your-server-ip\"/SERVER_HOST=\"$SERVER_HOST\"/g" $0
    sed -i "s/SERVER_USER=\"root\"/SERVER_USER=\"$SERVER_USER\"/g" $0
    sed -i "s/SERVER_PORT=\"22\"/SERVER_PORT=\"$SERVER_PORT\"/g" $0
    sed -i "s|DEPLOY_PATH=\"/opt/question-bank\"|DEPLOY_PATH=\"$DEPLOY_PATH\"|g" $0
    
    print_success "配置已更新"
    
    # 测试SSH连接
    print_info "测试SSH连接..."
    if ssh -p $SERVER_PORT -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST "echo 'SSH连接成功'"; then
        print_success "SSH连接测试成功"
    else
        print_error "SSH连接测试失败，请检查服务器信息和SSH密钥配置"
    fi
}

# 主函数
main() {
    case "$1" in
        "deploy")
            check_dependencies
            build_project
            deploy_to_server
            health_check
            ;;
        "rollback")
            rollback
            ;;
        "logs")
            view_logs
            ;;
        "health")
            health_check
            ;;
        "setup")
            setup_cicd
            ;;
        "help"|"")
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"