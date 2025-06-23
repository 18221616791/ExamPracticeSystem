#!/bin/bash

# 题库系统快速启动脚本
# 用于本地开发和测试

set -e

echo "=== 题库系统快速启动 ==="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
}

# 选择启动模式
select_mode() {
    echo -e "${BLUE}请选择启动模式:${NC}"
    echo "1) 开发模式 (端口: 3001, 数据库: 3307)"
    echo "2) 生产模式 (端口: 80, 3000, 数据库: 3306)"
    echo "3) 仅数据库 (端口: 3306)"
    echo "4) 停止所有服务"
    echo "5) 查看服务状态"
    echo "6) 查看日志"
    echo "7) 清理数据"
    
    read -p "请输入选择 (1-7): " choice
    
    case $choice in
        1)
            start_dev_mode
            ;;
        2)
            start_prod_mode
            ;;
        3)
            start_db_only
            ;;
        4)
            stop_services
            ;;
        5)
            show_status
            ;;
        6)
            show_logs
            ;;
        7)
            clean_data
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            exit 1
            ;;
    esac
}

# 开发模式
start_dev_mode() {
    echo -e "${YELLOW}启动开发模式...${NC}"
    
    # 创建必要目录
    mkdir -p uploads server/logs
    
    # 启动开发环境
    docker-compose -f docker-compose.dev.yml up -d
    
    echo -e "${GREEN}开发环境启动完成！${NC}"
    echo "访问地址: http://localhost:3001"
    echo "数据库端口: 3307"
    echo "查看日志: docker-compose -f docker-compose.dev.yml logs -f"
}

# 生产模式
start_prod_mode() {
    echo -e "${YELLOW}启动生产模式...${NC}"
    
    # 检查环境配置
    if [ ! -f .env ]; then
        echo "创建环境配置文件..."
        cp .env.example .env
        echo -e "${YELLOW}请编辑 .env 文件配置生产环境参数${NC}"
        read -p "按回车键继续..."
    fi
    
    # 创建必要目录
    mkdir -p uploads server/logs mysql-init ssl
    
    # 构建并启动生产环境
    docker-compose build
    docker-compose up -d
    
    echo -e "${GREEN}生产环境启动完成！${NC}"
    echo "HTTP访问: http://localhost:80"
    echo "直接访问: http://localhost:3000"
    echo "数据库端口: 3306"
}

# 仅启动数据库
start_db_only() {
    echo -e "${YELLOW}仅启动数据库服务...${NC}"
    
    mkdir -p mysql-init
    
    docker-compose up -d mysql
    
    echo -e "${GREEN}数据库服务启动完成！${NC}"
    echo "数据库端口: 3306"
    echo "连接信息:"
    echo "  主机: localhost:3306"
    echo "  数据库: question_bank"
    echo "  用户: app_user"
    echo "  密码: app_password"
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}停止所有服务...${NC}"
    
    # 停止生产环境
    if [ -f docker-compose.yml ]; then
        docker-compose down
    fi
    
    # 停止开发环境
    if [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml down
    fi
    
    echo -e "${GREEN}所有服务已停止${NC}"
}

# 查看状态
show_status() {
    echo -e "${BLUE}=== 服务状态 ===${NC}"
    
    echo -e "\n${YELLOW}生产环境:${NC}"
    if [ -f docker-compose.yml ]; then
        docker-compose ps
    else
        echo "未找到生产环境配置"
    fi
    
    echo -e "\n${YELLOW}开发环境:${NC}"
    if [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml ps
    else
        echo "未找到开发环境配置"
    fi
    
    echo -e "\n${YELLOW}Docker 资源使用:${NC}"
    docker stats --no-stream
}

# 查看日志
show_logs() {
    echo -e "${BLUE}请选择要查看的日志:${NC}"
    echo "1) 生产环境日志"
    echo "2) 开发环境日志"
    echo "3) 应用日志"
    echo "4) 数据库日志"
    
    read -p "请输入选择 (1-4): " log_choice
    
    case $log_choice in
        1)
            docker-compose logs -f
            ;;
        2)
            docker-compose -f docker-compose.dev.yml logs -f
            ;;
        3)
            if docker ps | grep -q "question-bank-app"; then
                docker-compose logs -f app
            elif docker ps | grep -q "question-bank-app-dev"; then
                docker-compose -f docker-compose.dev.yml logs -f app-dev
            else
                echo "应用容器未运行"
            fi
            ;;
        4)
            if docker ps | grep -q "question-bank-mysql"; then
                docker-compose logs -f mysql
            elif docker ps | grep -q "question-bank-mysql-dev"; then
                docker-compose -f docker-compose.dev.yml logs -f mysql-dev
            else
                echo "数据库容器未运行"
            fi
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
}

# 清理数据
clean_data() {
    echo -e "${RED}警告: 此操作将删除所有数据！${NC}"
    read -p "确认删除所有数据？(输入 'yes' 确认): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}停止服务并清理数据...${NC}"
        
        # 停止并删除容器和卷
        docker-compose down -v 2>/dev/null || true
        docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
        
        # 清理本地数据
        read -p "是否删除本地上传文件和日志？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf uploads/* server/logs/*
            echo "本地文件已清理"
        fi
        
        # 清理Docker资源
        docker system prune -f
        
        echo -e "${GREEN}数据清理完成${NC}"
    else
        echo "操作已取消"
    fi
}

# 主函数
main() {
    check_docker
    select_mode
}

# 执行主函数
main "$@"