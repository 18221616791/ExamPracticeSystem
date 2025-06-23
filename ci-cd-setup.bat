@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM CI/CD 自动化部署脚本 (Windows版本)
REM 适用于阿里云服务器或其他Linux服务器

REM 配置变量（请根据实际情况修改）
set SERVER_HOST=your-server-ip
set SERVER_USER=root
set SERVER_PORT=22
set DEPLOY_PATH=/opt/question-bank
set GIT_REPO=https://github.com/your-username/your-repo.git
set GIT_BRANCH=main

REM 颜色定义（Windows CMD不支持ANSI颜色，使用echo代替）
set "INFO_PREFIX=[INFO]"
set "SUCCESS_PREFIX=[SUCCESS]"
set "WARNING_PREFIX=[WARNING]"
set "ERROR_PREFIX=[ERROR]"

REM 函数：打印信息
:print_info
echo %INFO_PREFIX% %~1
goto :eof

:print_success
echo %SUCCESS_PREFIX% %~1
goto :eof

:print_warning
echo %WARNING_PREFIX% %~1
goto :eof

:print_error
echo %ERROR_PREFIX% %~1
goto :eof

REM 函数：检查依赖
:check_dependencies
call :print_info "检查本地依赖..."

where git >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Git 未安装，请先安装Git"
    exit /b 1
)

where ssh >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "SSH 未安装，请安装OpenSSH或使用Git Bash"
    exit /b 1
)

where scp >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "SCP 未安装，请安装OpenSSH或使用Git Bash"
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js/NPM 未安装，请先安装Node.js"
    exit /b 1
)

call :print_success "依赖检查完成"
goto :eof

REM 函数：构建项目
:build_project
call :print_info "构建项目..."

REM 安装依赖
npm install
if %errorlevel% neq 0 (
    call :print_error "后端依赖安装失败"
    exit /b 1
)

cd client
npm install
if %errorlevel% neq 0 (
    call :print_error "前端依赖安装失败"
    exit /b 1
)
cd ..

REM 构建前端
npm run build
if %errorlevel% neq 0 (
    call :print_error "前端构建失败"
    exit /b 1
)

call :print_success "项目构建完成"
goto :eof

REM 函数：部署到服务器
:deploy_to_server
call :print_info "部署到服务器 %SERVER_HOST%..."

REM 创建临时目录
set TEMP_DIR=%TEMP%\question-bank-deploy-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TEMP_DIR=%TEMP_DIR: =0%
mkdir "%TEMP_DIR%"

REM 复制必要文件
xcopy /E /I "client\dist" "%TEMP_DIR%\dist\"
xcopy /E /I "server" "%TEMP_DIR%\server\"
copy "package*.json" "%TEMP_DIR%\"
copy "docker-compose.yml" "%TEMP_DIR%\"
copy "Dockerfile" "%TEMP_DIR%\"
copy "nginx.conf" "%TEMP_DIR%\"
xcopy /E /I "mysql-init" "%TEMP_DIR%\mysql-init\"
copy "deploy.sh" "%TEMP_DIR%\"
copy "quick-start.sh" "%TEMP_DIR%\"
copy ".env.example" "%TEMP_DIR%\"
copy ".dockerignore" "%TEMP_DIR%\"

REM 在服务器上创建目录结构
ssh -p %SERVER_PORT% %SERVER_USER%@%SERVER_HOST% "mkdir -p %DEPLOY_PATH%"
if %errorlevel% neq 0 (
    call :print_error "无法连接到服务器"
    exit /b 1
)

REM 备份当前版本
ssh -p %SERVER_PORT% %SERVER_USER%@%SERVER_HOST% "cd %DEPLOY_PATH% && if [ -d 'current' ]; then mv current backup-$(date +%%Y%%m%%d-%%H%%M%%S) && ls -t | grep '^backup-' | tail -n +6 | xargs -r rm -rf; fi && mkdir -p current"

REM 上传文件
scp -P %SERVER_PORT% -r "%TEMP_DIR%\*" %SERVER_USER%@%SERVER_HOST%:%DEPLOY_PATH%/current/
if %errorlevel% neq 0 (
    call :print_error "文件上传失败"
    exit /b 1
)

REM 在服务器上执行部署
ssh -p %SERVER_PORT% %SERVER_USER%@%SERVER_HOST% "cd %DEPLOY_PATH%/current && chmod +x deploy.sh && chmod +x quick-start.sh && if ! command -v docker >/dev/null 2>&1; then echo '安装Docker...' && curl -fsSL https://get.docker.com | sh && systemctl start docker && systemctl enable docker; fi && if ! command -v docker-compose >/dev/null 2>&1; then echo '安装Docker Compose...' && curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose; fi && if [ ! -f .env ]; then cp .env.example .env && echo '请编辑 .env 文件设置正确的环境变量'; fi && docker-compose down || true && docker-compose up -d && sleep 30 && docker-compose ps && echo '部署完成！'"

REM 清理临时文件
rmdir /S /Q "%TEMP_DIR%"

call :print_success "部署完成"
goto :eof

REM 函数：健康检查
:health_check
call :print_info "执行健康检查..."

REM 使用curl检查服务（需要安装curl或使用PowerShell）
curl -f http://%SERVER_HOST%/health >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "服务运行正常"
) else (
    call :print_warning "健康检查失败，请检查服务状态"
)
goto :eof

REM 函数：回滚
:rollback
call :print_info "回滚到上一个版本..."

ssh -p %SERVER_PORT% %SERVER_USER%@%SERVER_HOST% "cd %DEPLOY_PATH% && cd current && docker-compose down || true && cd .. && LATEST_BACKUP=$(ls -t | grep '^backup-' | head -n 1) && if [ -z \"$LATEST_BACKUP\" ]; then echo '没有找到备份版本' && exit 1; fi && mv current failed-$(date +%%Y%%m%%d-%%H%%M%%S) && mv $LATEST_BACKUP current && cd current && docker-compose up -d && echo '回滚完成'"

call :print_success "回滚完成"
goto :eof

REM 函数：查看日志
:view_logs
call :print_info "查看服务日志..."

ssh -p %SERVER_PORT% %SERVER_USER%@%SERVER_HOST% "cd %DEPLOY_PATH%/current && docker-compose logs -f --tail=100"
goto :eof

REM 函数：初始化配置
:setup_cicd
call :print_info "初始化CI/CD配置..."

set /p "input_host=请输入服务器IP地址: "
if not "%input_host%"=="" set SERVER_HOST=%input_host%

set /p "input_user=SSH用户名 [root]: "
if not "%input_user%"=="" set SERVER_USER=%input_user%

set /p "input_port=SSH端口 [22]: "
if not "%input_port%"=="" set SERVER_PORT=%input_port%

set /p "input_path=部署路径 [/opt/question-bank]: "
if not "%input_path%"=="" set DEPLOY_PATH=%input_path%

REM 更新脚本中的配置（Windows批处理中比较复杂，建议手动修改）
call :print_warning "请手动编辑此脚本文件，更新配置变量"
echo SERVER_HOST=%SERVER_HOST%
echo SERVER_USER=%SERVER_USER%
echo SERVER_PORT=%SERVER_PORT%
echo DEPLOY_PATH=%DEPLOY_PATH%

REM 测试SSH连接
call :print_info "测试SSH连接..."
ssh -p %SERVER_PORT% -o ConnectTimeout=10 %SERVER_USER%@%SERVER_HOST% "echo 'SSH连接成功'"
if %errorlevel% equ 0 (
    call :print_success "SSH连接测试成功"
) else (
    call :print_error "SSH连接测试失败，请检查服务器信息和SSH密钥配置"
)
goto :eof

REM 函数：显示帮助
:show_help
echo 用法: %~nx0 [选项]
echo.
echo 选项:
echo   deploy     构建并部署项目
echo   rollback   回滚到上一个版本
echo   logs       查看服务日志
echo   health     执行健康检查
echo   setup      初始化CI/CD配置
echo   help       显示此帮助信息
echo.
goto :eof

REM 主程序
if "%1"=="deploy" (
    call :check_dependencies
    if !errorlevel! equ 0 (
        call :build_project
        if !errorlevel! equ 0 (
            call :deploy_to_server
            if !errorlevel! equ 0 (
                call :health_check
            )
        )
    )
) else if "%1"=="rollback" (
    call :rollback
) else if "%1"=="logs" (
    call :view_logs
) else if "%1"=="health" (
    call :health_check
) else if "%1"=="setup" (
    call :setup_cicd
) else if "%1"=="help" (
    call :show_help
) else if "%1"=="" (
    call :show_help
) else (
    call :print_error "未知选项: %1"
    call :show_help
    exit /b 1
)

endlocal