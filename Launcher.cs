using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace ElectroCadDIN {
    class Program {
        [STAThread]
        static void Main(string[] args) {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            // 1. Procurar scripts de arranque existentes na mesma pasta
            string[] possibleScripts = new string[] {
                Path.Combine(baseDir, "standalone.bat"),
                Path.Combine(baseDir, "ElectroCad-DIN.bat"),
                Path.Combine(baseDir, "ElectroCad-Silencioso.vbs")
            };

            string scriptToLaunch = null;
            foreach (string path in possibleScripts) {
                if (File.Exists(path)) {
                    scriptToLaunch = path;
                    break;
                }
            }

            if (!string.IsNullOrEmpty(scriptToLaunch)) {
                try {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    if (scriptToLaunch.EndsWith(".vbs", StringComparison.OrdinalIgnoreCase)) {
                        psi.FileName = "wscript.exe";
                        psi.Arguments = "\"" + scriptToLaunch + "\"";
                    } else {
                        psi.FileName = "cmd.exe";
                        psi.Arguments = "/c \"" + scriptToLaunch + "\"";
                    }
                    psi.WorkingDirectory = baseDir;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                    return;
                } catch {
                    // Segue para fallback direto de abertura de janela
                }
            }

            // Fallback direto: Abrir Edge ou Chrome em modo aplicacao standalone
            string targetUrl = "http://localhost:3000";
            string[] browserPaths = new string[] {
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) + @"\Microsoft\Edge\Application\msedge.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) + @"\Microsoft\Edge\Application\msedge.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) + @"\Google\Chrome\Application\chrome.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) + @"\Google\Chrome\Application\chrome.exe"
            };

            foreach (string bPath in browserPaths) {
                if (File.Exists(bPath)) {
                    try {
                        Process.Start(bPath, "--app=\"" + targetUrl + "\" --start-maximized");
                        return;
                    } catch {}
                }
            }

            // Ultimo recurso: navegador predefinido
            try {
                Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
            } catch {}
        }
    }
}
