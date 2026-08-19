# dsh-desktop-setup

把我在 DSH Desktop 上用的插件和模型配置，打包成朋友也能直接装的套件。

> 这里**不含** DSH Desktop 安装包本身。朋友需要先自己安装官方 DSH Desktop，再套用这套插件和配置。

## 里面有什么

- `plugins/dsh-plugin-workspace-native`：**Windows 原生文件夹选择对话框与文件夹拖拽工作区支持**（带桌面、此电脑、各个盘符）
- `plugins/dsh-plugin-task-panel`：任务摘要与上下文用量浮动面板（`Ctrl + Alt + B`）
- `plugins/dsh-plugin-linus-ssh`：常驻 OpenSSH 工具，让 AI 连 Linux 服务器
- `profile/`：desktop profile 的 `package.json`、`cordis.patch.yml` 和 `pnpm-workspace.yaml`
- `templates/settings.yaml.example`：模型路由模板（hu / lin / gemini）
- `templates/credentials.yaml.example`：凭据文件模板（只有占位符）

## 不会上传的东西

- DSH Desktop.exe 和官方 Electron 运行时
- `~/.dsh/.credentials.yaml` 里的真实 API Key
- `~/.dsh/linus-ssh.json` 里的主机密码
- 会话记录、缓存、node_modules

## 给朋友的安装方法

### 1. 先装官方 DSH Desktop

让朋友自己安装 DeepSeek Harness Desktop，打开一次，生成 `~/.dsh`。

### 2. 把这套插件拷进 desktop profile

PowerShell：

```powershell
$profile = "$env:USERPROFILE\.dsh\profiles\desktop"
git clone https://github.com/xiaogu619520/dsh-desktop-setup.git "$env:TEMP\dsh-desktop-setup"
Copy-Item -Recurse -Force "$env:TEMP\dsh-desktop-setup\plugins\*" "$profile\plugins\"
Copy-Item -Force "$env:TEMP\dsh-desktop-setup\profile\package.json" "$profile\package.json"
Copy-Item -Force "$env:TEMP\dsh-desktop-setup\profile\cordis.patch.yml" "$profile\cordis.patch.yml"
Copy-Item -Force "$env:TEMP\dsh-desktop-setup\profile\pnpm-workspace.yaml" "$profile\pnpm-workspace.yaml"
```

也可以在 DSH 里直接对 AI 说：

```text
帮我安装并启用这些 DSH 插件：
https://github.com/xiaogu619520/dsh-plugin-task-panel.git
https://github.com/xiaogu619520/dsh-plugin-linus-ssh.git
```

### 3. 可选：同步模型配置

如果朋友要用同一套模型路由，把模板拷过去再填自己的 Key：

```powershell
Copy-Item "$env:TEMP\dsh-desktop-setup\templates\settings.yaml.example" "$env:USERPROFILE\.dsh\settings.yaml"
Copy-Item "$env:TEMP\dsh-desktop-setup\templates\credentials.yaml.example" "$env:USERPROFILE\.dsh\.credentials.yaml"
notepad "$env:USERPROFILE\.dsh\.credentials.yaml"
```

把 `replace-me` 换成朋友自己的 Key。不要把填好的凭据文件发回仓库。

### 4. 重启 DSH Desktop

重启后应能看到：

- **原生系统文件夹选择框**：点击添加工作区直接打开 Windows 原生资源管理器对话框（带桌面、此电脑、C/D/E/F 盘），且支持直接将文件夹拖入窗口作为工作区
- **任务面板**（`Ctrl + Alt + B`）
- **Linus SSH** 常驻工具

## 单独仓库

- 任务面板：https://github.com/xiaogu619520/dsh-plugin-task-panel
- SSH 插件：https://github.com/xiaogu619520/dsh-plugin-linus-ssh

## License

MIT
