@echo off
REM ==============================================================================
REM ElectroCad DIN - Script de Execucao Standalone Local Blindado (Windows)
REM Norma EN 61439 - Software de Desenho e Modelacao de Quadros Eletricos DIN
REM ==============================================================================

:: Garante que o diretorio de trabalho e SEMPRE a pasta onde o ficheiro esta guardado
cd /d "%~dp0"

:: Forca codificacao UTF-8 para carateres e acentos portugueses
chcp 65001 >nul 2>&1

title ElectroCad DIN - Software de Quadros Eletricos (Standalone)
color 0b
cls

echo ==============================================================================
echo   ⚡ ElectroCad DIN - Software de Engenharia de Quadros Eletricos
echo   Modo Standalone Local (Windows)
echo ==============================================================================
echo.

:: 1. Verificar se Node.js esta instalado e acessivel
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO CRITICO] O Node.js nao foi detetado no sistema Windows (PATH).
    echo.
    echo Para executar o servidor localmente no seu computador, e necessario o Node.js:
    echo 1. Faca download gratuito em: https://nodejs.org/ (versao LTS recomendada)
    echo 2. Instale normalmente (com a opcao "Add to PATH" ativada)
    echo 3. Volte a clicar neste ficheiro apos a instalacao.
    echo.
    echo Em alternativa, pode abrir diretamente a versao web sem servidor:
    echo Pretende abrir a versao online no navegador agora? (S/N)
    set /p OPEN_ONLINE="Escolha [S/N]: "
    if /i "%OPEN_ONLINE%"=="S" (
        start "" "https://ais-pre-4jvcirr6ca7apbvk3kljic-752728037562.europe-west2.run.app"
    )
    echo.
    echo Prima qualquer tecla para sair...
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [OK] Node.js detetado: %NODE_VERSION%

:: 2. Verificar presenca de package.json
if not exist "package.json" (
    echo [ERRO] O ficheiro package.json nao foi encontrado nesta pasta:
    echo        %CD%
    echo Certifique-se de que descompactou todos os ficheiros do arquivo ZIP.
    echo.
    pause
    exit /b 1
)

:: 3. Instalar dependencias se a pasta node_modules nao existir
if not exist "node_modules\" (
    echo.
    echo [CONFIGURACAO INICIAL] Pasta node_modules em falta.
    echo A descarregar e instalar dependencias (npm install)...
    echo Isto so acontece na primeira vez e pode demorar 1 a 2 minutos.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] A instalacao das dependencias falhou.
        echo Verifique a ligacao a internet ou execute 'npm install' manualmente.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas com sucesso!
)

:: 4. Verificar se a porta 3000 ja esta ocupada (aplicacao ja em execucao)
netstat -ano | findstr /r ":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [INFO] O servidor ElectroCad ja esta ativo na porta 3000!
    echo A abrir aplicacao diretamente...
    goto open_browser
)

:: 5. Iniciar o servidor local em segundo plano
echo.
echo [ARRANQUE] A iniciar servidor local ElectroCad DIN...
start "ElectroCad Server Backend" /min cmd /c "call npm run dev"

:: Aguardar 3 segundos para o servidor Vite inicializar
echo A aguardar inicializacao do servidor...
ping 127.0.0.1 -n 4 >nul 2>&1

:open_browser
echo [OK] Servidor pronto em http://localhost:3000
echo A abrir aplicacao em modo de janela nativa (estilo desktop)...
echo.

set APP_URL=http://localhost:3000

:: Tentar abrir no Microsoft Edge em modo de aplicacao limpa (sem barra de navegacao)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --start-maximized
    goto finish
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --start-maximized
    goto finish
)

:: Tentar Google Chrome em modo de aplicacao limpa
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --start-maximized
    goto finish
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --start-maximized
    goto finish
)

:: Tentar comandos diretos no PATH
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge --app="%APP_URL%" --start-maximized
    goto finish
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome --app="%APP_URL%" --start-maximized
    goto finish
)

:: Fallback para navegador predefinido
start "" "%APP_URL%"

:finish
echo ==============================================================================
echo  ElectroCad DIN esta a correr!
echo  Para fechar o programa, feche a janela da aplicacao e esta consola.
echo ==============================================================================
timeout /t 5 >nul
exit
