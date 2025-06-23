#!/bin/bash

# 题库系统 Docker 部署脚本
# 适用于阿里云服务器部署

set -e

echo "=== 题库系统 Docker 部署脚本 ==="
echo "开始时间: $(date)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        echo "请先安装 Docker: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: Docker Compose 未安装${NC}"
        echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 和 Docker Compose 已安装${NC}"
}

# 检查端口占用
check_ports() {
    local ports=("80" "443" "3000" "3306")
    for port in "${ports[@]}"; do
        if netstat -tuln | grep ":$port " > /dev/null; then
            echo -e "${YELLOW}警告: 端口 $port 已被占用${NC}"
            read -p "是否继续部署？(y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "部署已取消"
                exit 1
            fi
        fi
    done
    echo -e "${GREEN}✓ 端口检查完成${NC}"
}

# 创建必要的目录
create_directories() {
    echo "创建必要的目录..."
    mkdir -p uploads
    mkdir -p server/logs
    mkdir -p mysql-init
    mkdir -p ssl
    echo -e "${GREEN}✓ 目录创建完成${NC}"
}

# 设置环境变量
setup_environment() {
    if [ ! -f .env ]; then
        echo "创建环境配置文件..."
        cp .env.example .env
        
        # 生成随机JWT密钥
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
        
        # 生成随机数据库密码
        DB_PASSWORD=$(openssl rand -base64 16)
        MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)
        
        sed -i "s/app_password/$DB_PASSWORD/g" .env
        sed -i "s/root123456/$MYSQL_ROOT_PASSWORD/g" .env
        
        echo -e "${GREEN}✓ 环境配置文件已创建${NC}"
        echo -e "${YELLOW}请检查 .env 文件并根据需要修改配置${NC}"
    else
        echo -e "${GREEN}✓ 环境配置文件已存在${NC}"
    fi
}

# 构建和启动服务
deploy_services() {
    echo "开始构建和部署服务..."
    
    # 停止现有服务
    echo "停止现有服务..."
    docker-compose down
    
    # 清理旧镜像（可选）
    read -p "是否清理旧的Docker镜像？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker system prune -f
        echo -e "${GREEN}✓ 旧镜像清理完成${NC}"
    fi
    
    # 构建镜像
    echo "构建应用镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    echo "启动服务..."
    docker-compose up -d
    
    echo -e "${GREEN}✓ 服务部署完成${NC}"
}

# 检查服务状态
check_services() {
    echo "检查服务状态..."
    sleep 10
    
    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ 容器启动成功${NC}"
    else
        echo -e "${RED}✗ 容器启动失败${NC}"
        docker-compose logs
        exit 1
    fi
    
    # 检查健康状态
    echo "等待服务就绪..."
    for i in {1..30}; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 应用服务就绪${NC}"
            break
        fi
        echo "等待中... ($i/30)"
        sleep 2
    done
}

# 显示部署信息
show_deployment_info() {
    echo -e "\n${GREEN}=== 部署完成 ===${NC}"
    echo "应用访问地址:"
    echo "  - HTTP: http://$(hostname -I | awk '{print $1}'):80"
    echo "  - 直接访问: http://$(hostname -I | awk '{print $1}'):3000"
    echo "  - 本地访问: http://localhost:80"
    echo ""
    echo "管理命令:"
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 停止服务: docker-compose down"
    echo "  - 重启服务: docker-compose restart"
    echo "  - 查看状态: docker-compose ps"
    echo ""
    echo "数据库连接信息:"
    echo "  - 主机: localhost:3306"
    echo "  - 数据库: question_bank"
    echo "  - 用户名: app_user"
    echo "  - 密码: 查看 .env 文件中的 DB_PASSWORD"
    echo ""
    echo -e "${YELLOW}注意: 请妥善保管 .env 文件中的密码信息${NC}"
}

# 主函数
main() {
    echo "开始部署流程..."
    
    check_docker
    check_ports
    create_directories
    setup_environment
    deploy_services
    check_services
    show_deployment_info
    
    echo -e "\n${GREEN}部署完成！${NC}"
    echo "结束时间: $(date)"
}

# 执行主函数
main "$@"