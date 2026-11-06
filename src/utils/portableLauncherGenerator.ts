import JSZip from 'jszip';

export interface PortableFileBundle {
  targetUrl: string;
  batContent: string;
  vbsContent: string;
  macContent: string;
  linuxContent: string;
  urlShortcutContent: string;
  criarExeBatContent: string;
  launcherCsContent: string;
  ps1Content: string;
  readmeContent: string;
}

export function getPortableScripts(customUrl?: string): PortableFileBundle {
  const targetUrl = customUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-4jvcirr6ca7apbvk3kljic-752728037562.europe-west2.run.app');

  const batContent = `@echo off
REM ==============================================================================
REM ElectroCad DIN - Script de Arranque Blindado para Windows
REM ==============================================================================

:: Fixa obrigatoriamente a pasta de trabalho onde este script se encontra
cd /d "%~dp0"

:: Forca suporte para caracteres UTF-8
chcp 65001 >nul 2>&1

title ElectroCad DIN - Software de Quadros Eletricos
color 0b
cls

echo ==============================================================================
echo   ⚡ ElectroCad DIN - Software de Desenho e Dimensionamento de Quadros
echo ==============================================================================
echo.
echo A iniciar a aplicacao em modo de janela nativa (estilo desktop)...
echo.

set TARGET_URL=${targetUrl}

:: 1. Procurar Microsoft Edge nos caminhos padrao do Windows (Mais fiavel que o PATH)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)

:: 2. Procurar Google Chrome nos caminhos padrao
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)

:: 3. Tentar utilitarios registados no PATH do sistema
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)

where brave >nul 2>&1
if %errorlevel% equ 0 (
    start "" brave --app="%TARGET_URL%" --start-maximized
    goto ok_exit
)

:: 4. Fallback final: Abrir no navegador predefinido do sistema
start "" "%TARGET_URL%"

:ok_exit
echo [OK] ElectroCad DIN iniciado com sucesso!
timeout /t 3 >nul 2>&1
exit
`;

  const vbsContent = `' ElectroCad DIN - Arranque Silencioso sem janela preta de terminal
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

batPath = currentDir & "\\ElectroCad-DIN.bat"

If fso.FileExists(batPath) Then
    WshShell.Run "cmd /c """ & batPath & """", 0, False
Else
    TARGET_URL = "${targetUrl}"
    WshShell.Run "msedge.exe --app=""" & TARGET_URL & """ --start-maximized", 1, False
End If
`;

  const ps1Content = `# ElectroCad DIN - Script de Arranque PowerShell
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptPath

$targetUrl = "${targetUrl}"

$browsers = @(
    "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
    "\${env:ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe",
    "\${env:ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe",
    "\${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe"
)

$started = $false
foreach ($b in $browsers) {
    if (Test-Path $b) {
        Start-Process -FilePath $b -ArgumentList "--app=\`"$targetUrl\`" --start-maximized"
        $started = $true
        break
    }
}

if (-not $started) {
    Start-Process $targetUrl
}
`;

  const launcherCsContent = `using System;
using System.Diagnostics;
using System.IO;

namespace ElectroCadDIN {
    class Program {
        [STAThread]
        static void Main(string[] args) {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            string[] scripts = new string[] {
                Path.Combine(baseDir, "standalone.bat"),
                Path.Combine(baseDir, "ElectroCad-DIN.bat"),
                Path.Combine(baseDir, "ElectroCad-Silencioso.vbs")
            };

            foreach (string s in scripts) {
                if (File.Exists(s)) {
                    try {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        if (s.EndsWith(".vbs", StringComparison.OrdinalIgnoreCase)) {
                            psi.FileName = "wscript.exe";
                            psi.Arguments = "\\"" + s + "\\"";
                        } else {
                            psi.FileName = "cmd.exe";
                            psi.Arguments = "/c \\"" + s + "\\"";
                        }
                        psi.WorkingDirectory = baseDir;
                        psi.UseShellExecute = true;
                        Process.Start(psi);
                        return;
                    } catch {}
                }
            }

            string targetUrl = "${targetUrl}";
            string[] browsers = new string[] {
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) + @"\\Microsoft\\Edge\\Application\\msedge.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) + @"\\Microsoft\\Edge\\Application\\msedge.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) + @"\\Google\\Chrome\\Application\\chrome.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) + @"\\Google\\Chrome\\Application\\chrome.exe"
            };

            foreach (string b in browsers) {
                if (File.Exists(b)) {
                    try {
                        Process.Start(b, "--app=\\"" + targetUrl + "\\" --start-maximized");
                        return;
                    } catch {}
                }
            }

            try {
                Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
            } catch {}
        }
    }
}
`;

  const criarExeBatContent = `@echo off
REM ==============================================================================
REM ElectroCad DIN - Gerador de Executavel Windows (.EXE) 1-Clique
REM Compila nativamente utilizando as ferramentas Microsoft .NET do Windows
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

set CSC64="C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe"
set CSC32="C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"
set CSC=""

if exist %CSC64% (
    set CSC=%CSC64%
) else if exist %CSC32% (
    set CSC=%CSC32%
)

if not %CSC%=="" (
    echo [OK] Compilador nativo Microsoft .NET encontrado: %CSC%
    echo A compilar 'ElectroCad-DIN.exe' em modo de janela nativa (Windows GUI)...
    %CSC% /nologo /target:winexe /optimize+ /out:"ElectroCad-DIN.exe" Launcher.cs
    
    if exist "ElectroCad-DIN.exe" (
        echo.
        echo ==============================================================================
        echo  [SUCESSO] O ficheiro 'ElectroCad-DIN.exe' foi criado com sucesso!
        echo ==============================================================================
        echo.
        echo O executavel 'ElectroCad-DIN.exe' esta pronto nesta pasta.
        echo.
        echo Pode dar duplo clique diretamente em 'ElectroCad-DIN.exe' para abrir!
        echo.
        set /p RUN_NOW="Pretende abrir o 'ElectroCad-DIN.exe' agora mesmo? (S/N): "
        if /i "%RUN_NOW%"=="S" start "" "ElectroCad-DIN.exe"
        goto finish
    )
)

:: Metodo PowerShell alternativo
echo A tentar compilacao via PowerShell nativo...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$source = Get-Content -Raw 'Launcher.cs'; Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly 'ElectroCad-DIN.exe' -OutputType WindowsApplication" 2>nul

if exist "ElectroCad-DIN.exe" (
    echo.
    echo [SUCESSO] 'ElectroCad-DIN.exe' gerado com sucesso via PowerShell!
    goto finish
)

:: Fallback: Criar atalho no ambiente de trabalho
echo.
echo [INFO] A criar atalho direto '.lnk' no seu Ambiente de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\ElectroCad DIN.lnk'); $s.TargetPath = [System.IO.Path]::GetFullPath('ElectroCad-DIN.bat'); $s.WorkingDirectory = [System.IO.Path]::GetFullPath('.'); $s.WindowStyle = 7; $s.Description = 'ElectroCad DIN'; $s.Save();"
echo [OK] Atalho criado no seu Ambiente de Trabalho!

:finish
echo.
echo Pressione qualquer tecla para sair...
pause >nul
exit
`;

  const macContent = `#!/usr/bin/env bash
# ElectroCad DIN - Launcher para macOS
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
TARGET_URL="${targetUrl}"

echo "A abrir ElectroCad DIN em modo de janela nativa..."
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$TARGET_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$TARGET_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args --app="$TARGET_URL"
else
  open "$TARGET_URL"
fi
`;

  const linuxContent = `#!/usr/bin/env bash
# ElectroCad DIN - Launcher para Linux
TARGET_URL="${targetUrl}"

if command -v google-chrome &> /dev/null; then
  google-chrome --app="$TARGET_URL" &
elif command -v chromium &> /dev/null; then
  chromium --app="$TARGET_URL" &
elif command -v microsoft-edge &> /dev/null; then
  microsoft-edge --app="$TARGET_URL" &
else
  xdg-open "$TARGET_URL" &
fi
`;

  const urlShortcutContent = `[InternetShortcut]
URL=${targetUrl}
IconIndex=0
`;

  const readmeContent = `================================================================================
ELECTROCAD DIN - PACOTE EXECUTÁVEL E PORTÁTIL (WINDOWS / MAC / LINUX)
Norma EN 61439 & IEC 60898 - Software de Quadros Elétricos
================================================================================

PROBLEMA FREQUENTE: "PORQUE É QUE O .BAT NÃO ARRANCA NO MEU COMPUTADOR?"
--------------------------------------------------------------------------------
Se deu duplo clique no ficheiro .bat e a janela preta fechou num segundo sem abrir
a aplicação, as causas mais comuns no Windows são:

1. Diretório de Execução:
   No Windows, quando se executa um script sem permissões ou a partir de um atalho,
   o Windows assume a pasta C:\\Windows\\System32.
   -> SOLUÇÃO: O novo ficheiro incluído já tem "cd /d %~dp0" para corrigir isto.

2. Se estiver a tentar rodar o servidor local com código-fonte:
   O modo local com servidor requer o Node.js instalado (https://nodejs.org/).
   Se o Node.js não estiver no sistema, o comando fecha de imediato.
   -> SOLUÇÃO: Se não quiser instalar o Node.js, use o executável ou o modo PWA!

3. Bloqueio de Segurança do Windows SmartScreen:
   O Windows costuma proteger os utilizadores de ficheiros .bat descarregados da net.
   -> SOLUÇÃO: Clique com o botão direito no ficheiro .bat -> Propriedades ->
      marque a caixa "Desbloquear" (Unblock) em baixo -> clique em OK.


COMO TRANSFORMAR NUM FICHEIRO .EXE NATIVO (SEM INSTALAR PROGRAMAS EXTRAS):
--------------------------------------------------------------------------------
Incluímos um gerador automático que utiliza o compilador Microsoft .NET já presente
no Windows 10 e Windows 11:

Passo a Passo:
1. Dê 2 cliques no ficheiro: Criar-EXE.bat
2. O script localiza o compilador nativo (csc.exe) e gera 'ElectroCad-DIN.exe'
3. Fica com o ficheiro 'ElectroCad-DIN.exe' autêntico na pasta!
4. Pode enviar para o Ambiente de Trabalho ou fixar na Barra de Tarefas.


OUTRA FORMA DIRETA: INSTALAÇÃO OFICIAL COMO APLICAÇÃO DESKTOP (PWA)
--------------------------------------------------------------------------------
O Microsoft Edge e o Google Chrome têm a funcionalidade oficial da Microsoft
para criar um executável nativo do Windows:
1. Abra a aplicação no Edge ou Chrome.
2. Na barra de endereço, clique no ícone "Instalar aplicação" (ou no menu ... > Apps).
3. O Windows cria um programa oficial no Menu Iniciar e Ambiente de Trabalho com
   o logótipo do ElectroCad DIN e suporte 100% offline para trabalhar em obra.
================================================================================
`;

  return {
    targetUrl,
    batContent,
    vbsContent,
    macContent,
    linuxContent,
    urlShortcutContent,
    criarExeBatContent,
    launcherCsContent,
    ps1Content,
    readmeContent,
  };
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPortableZip(customUrl?: string, onProgress?: (msg: string) => void): Promise<void> {
  if (onProgress) onProgress('A preparar pacote com gerador de .EXE...');
  const scripts = getPortableScripts(customUrl);
  const zip = new JSZip();

  const folder = zip.folder('ElectroCad-DIN-Portatil');
  if (folder) {
    folder.file('ElectroCad-DIN.bat', scripts.batContent);
    folder.file('Criar-EXE.bat', scripts.criarExeBatContent);
    folder.file('Launcher.cs', scripts.launcherCsContent);
    folder.file('ElectroCad-Silencioso.vbs', scripts.vbsContent);
    folder.file('ElectroCad-DIN.ps1', scripts.ps1Content);
    folder.file('ElectroCad-Mac.command', scripts.macContent);
    folder.file('ElectroCad-Linux.sh', scripts.linuxContent);
    folder.file('ElectroCad-DIN.url', scripts.urlShortcutContent);
    folder.file('LEIA-ME_Como_Usar.txt', scripts.readmeContent);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ElectroCad-DIN-Executavel-Portatil.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
