import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';

function encodeCommand(script) {
  let binary = '';
  for (let i = 0; i < script.length; i++) {
    const code = script.charCodeAt(i);
    binary += String.fromCharCode(code & 255, (code >> 8) & 255);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

function folderDialogScript() {
  return [
    '$ErrorActionPreference = "Stop"',
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public static class WorkspaceFolderDialog {',
    '  [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]',
    '  private class FileOpenDialogRCW {}',
    '  [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]',
    '  private interface IFileDialog {',
    '    [PreserveSig] int Show(IntPtr parent);',
    '    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);',
    '    void SetFileTypeIndex(uint iFileType);',
    '    void GetFileTypeIndex(out uint piFileType);',
    '    void Advise(IntPtr pfde, out uint pdwCookie);',
    '    void Unadvise(uint dwCookie);',
    '    void SetOptions(uint fos);',
    '    void GetOptions(out uint fos);',
    '    void SetDefaultFolder(IShellItem psi);',
    '    void SetFolder(IShellItem psi);',
    '    void GetFolder(out IShellItem ppsi);',
    '    void GetCurrentSelection(out IShellItem ppsi);',
    '    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);',
    '    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);',
    '    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);',
    '    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);',
    '    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);',
    '    void GetResult(out IShellItem ppsi);',
    '    void AddPlace(IShellItem psi, uint fdap);',
    '    void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);',
    '    void Close(int hr);',
    '    void SetClientGuid(ref Guid guid);',
    '    void ClearClientData();',
    '    void SetFilter(IntPtr pFilter);',
    '  }',
    '  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]',
    '  private interface IShellItem {',
    '    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);',
    '    void GetParent(out IShellItem ppsi);',
    '    void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);',
    '    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);',
    '    void Compare(IShellItem psi, uint hint, out int piOrder);',
    '  }',
    '  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]',
    '  private static extern void SHCreateItemFromParsingName(string pszPath, IntPtr pbc, ref Guid riid, out IShellItem ppv);',
    '  public static string Pick() {',
    '    var dialog = (IFileDialog)new FileOpenDialogRCW();',
    '    dialog.SetOptions(0x20 | 0x40);',
    '    dialog.SetTitle("\u9009\u62e9\u6587\u4ef6\u5939");',
    '    try {',
    '      var iid = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");',
    '      IShellItem desktop;',
    '      SHCreateItemFromParsingName(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), IntPtr.Zero, ref iid, out desktop);',
    '      dialog.SetDefaultFolder(desktop);',
    '      dialog.SetFolder(desktop);',
    '    } catch {}',
    '    if (dialog.Show(IntPtr.Zero) != 0) return "";',
    '    IShellItem item;',
    '    dialog.GetResult(out item);',
    '    string path;',
    '    item.GetDisplayName(0x80058000, out path);',
    '    return path ?? "";',
    '  }',
    '}',
    '"@',
    'try {',
    '  [Console]::Out.Write([WorkspaceFolderDialog]::Pick())',
    '} catch {',
    '  Add-Type -AssemblyName System.Windows.Forms',
    '  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    '  $dialog.Description = "Select workspace folder"',
    '  $dialog.ShowNewFolderButton = $true',
    '  $dialog.RootFolder = [System.Environment+SpecialFolder]::Desktop',
    '  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
    '    [Console]::Out.Write($dialog.SelectedPath)',
    '  }',
    '}',
  ].join('\n');
}

function runPickerPowerShell() {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-STA',
      '-WindowStyle',
      'Hidden',
      '-EncodedCommand',
      encodeCommand(folderDialogScript())
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      const path = stdout.trim();
      if (path) {
        resolve(path);
      } else if (code === 0) {
        resolve(null);
      } else {
        reject(new Error(stderr.trim() || `PowerShell dialog exited with code ${code}`));
      }
    });
  });
}

export const name = 'dsh-plugin-workspace-native';

export function apply(ctx) {
  const connection = ctx.get('connection');
  if (connection && typeof connection.handle === 'function') {
    ctx.effect(() => {
      return connection.handle('dsh-workspace-native:pick', async () => {
        try {
          const path = await runPickerPowerShell();
          return { ok: true, path };
        } catch (err) {
          return { ok: false, error: err.message || String(err) };
        }
      });
    }, 'dsh-workspace-native: rpc handler');
  }
}
