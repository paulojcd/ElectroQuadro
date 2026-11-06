@echo off
REM ==============================================================================
REM ElectroCad DIN - Compilador Automatico para Ficheiro Executavel (.EXE)
REM Utiliza as ferramentas integradas de raiz no Windows (Microsoft .NET csc.exe)
REM Nao necessita de instalar nenhum software externo adicional!
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Gerador de Executavel .EXE - ElectroCad DIN
color 0a
cls

echo ==============================================================================
echo   ⚡ ElectroCad DIN - Gerador de Ficheiro Executavel Windows (.EXE)
echo ==============================================================================
echo.
echo A procurar ferramentas nativas da Microsoft no seu Windows...
echo.

set CSC64="C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
set CSC32="C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
set CSC=""

if exist %CSC64% (
    set CSC=%CSC64%
) else if exist %CSC32% (
    set CSC=%CSC32%
)

if not %CSC%=="" (
    echo [OK] Compilador nativo Microsoft .NET encontrado:
    echo      %CSC%
    echo.
    echo A compilar 'ElectroCad-DIN.exe' em modo de janela nativa (Windows GUI)...
    %CSC% /nologo /target:winexe /optimize+ /out:"ElectroCad-DIN.exe" Launcher.cs
    
    if exist "ElectroCad-DIN.exe" (
        echo.
        echo ==============================================================================
        echo  [SUCESSO] O ficheiro 'ElectroCad-DIN.exe' foi gerado com sucesso!
        echo ==============================================================================
        echo.
        echo O executavel 'ElectroCad-DIN.exe' esta agora disponivel nesta pasta.
        echo.
        echo Pode:
        echo  1. Dar duplo clique diretamente em 'ElectroCad-DIN.exe' para abrir o programa.
        echo  2. Clicar com o botao direito em 'ElectroCad-DIN.exe' ^> 'Criar atalho'
        echo     e move-lo para o seu Ambiente de Trabalho (Desktop).
        echo.
        echo Pretende testar e abrir o 'ElectroCad-DIN.exe' agora mesmo? (S/N)
        set /p RUN_NOW="Escolha [S/N]: "
        if /i "%RUN_NOW%"=="S" (
            start "" "ElectroCad-DIN.exe"
        )
        goto finish
    ) else (
        echo [AVISO] A compilacao direta falhou. A tentar metodo alternativo...
    )
)

:: Metodo Alternativo: PowerShell com script executavel
echo A gerar executavel auxiliar via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$source = Get-Content -Raw 'Launcher.cs'; Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly 'ElectroCad-DIN.exe' -OutputType WindowsApplication" 2>nul

if exist "ElectroCad-DIN.exe" (
    echo [SUCESSO] Ficheiro 'ElectroCad-DIN.exe' gerado com sucesso via PowerShell!
    goto finish
)

:: Fallback se o compilador nao estiver acessivel: Criar atalho no Ambiente de Trabalho
echo.
echo [INFO] A criar atalho direto '.lnk' no seu Ambiente de Trabalho com icone proprio...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\ElectroCad DIN.lnk'); $s.TargetPath = [System.IO.Path]::GetFullPath('standalone.bat'); $s.WorkingDirectory = [System.IO.Path]::GetFullPath('.'); $s.WindowStyle = 7; $s.Description = 'ElectroCad DIN - Software de Quadros Eletricos'; $s.Save();"
echo [OK] Atalho 'ElectroCad DIN' criado no seu Ambiente de Trabalho!

:finish
echo.
echo Pressione qualquer tecla para terminar...
pause >nul
exit
