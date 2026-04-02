# GitHub 设置 SSH Key

配置 SSH Key 后，推送代码无需每次输入密码，更加方便快捷。

---

## 生成 SSH 密钥

打开终端（Git Bash、PowerShell 或 Terminal），执行以下命令：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

按提示操作：
1. 密钥保存位置：直接回车（使用默认路径）
2. 设置密码：直接回车（不设置密码，使用更方便）

执行完成后，会在 `~/.ssh/` 目录下生成两个文件：
- `id_rsa` - 私钥（不要泄露）
- `id_rsa.pub` - 公钥（需要添加到 GitHub）

---

## 添加密钥到 GitHub

### 1. 复制公钥内容

执行命令查看公钥：
```bash
cat ~/.ssh/id_rsa.pub
```

输出示例：
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDN5k55g... admin@DESKTOP-EDVEJOB
```

**需要复制的内容**：从 `ssh-rsa` 开始，到邮箱地址结束，完整的一整行。

> ⚠️ **注意**：Git Bash 中 `Set-Clipboard` 命令不可用，请直接选中终端输出的内容复制，或手动复制。

**各系统复制方式：**

- **Windows PowerShell：**
  ```powershell
  Get-Content ~/.ssh/id_rsa.pub | Set-Clipboard
  ```

- **macOS：**
  ```bash
  pbcopy < ~/.ssh/id_rsa.pub
  ```

- **Linux：**
  ```bash
  xclip -selection clipboard < ~/.ssh/id_rsa.pub
  ```

### 2. 在 GitHub 添加

1. 登录 GitHub → 右上角头像 → **Settings**
2. 左侧选择 **SSH and GPG keys**
3. 点击 **New SSH key**
4. 填写信息：
   - **Title**：设备名称（如 "My Laptop"）
   - **Key**：粘贴刚才复制的公钥内容
5. 点击 **Add SSH key**

### 3. 验证连接

```bash
ssh -T git@github.com
```

看到以下提示表示成功：
```
Hi username! You've successfully authenticated...
```

---

## 修改仓库地址为 SSH

### 已有仓库

```bash
# 查看当前地址
git remote -v

# 修改为 SSH 地址
git remote set-url origin git@github.com:用户名/仓库名.git
```

### 新克隆仓库

```bash
git clone git@github.com:用户名/仓库名.git
```

---

## 常见问题

**提示 Permission denied (publickey)**

```bash
# 重新添加私钥
ssh-add ~/.ssh/id_rsa
```

---

完成！现在可以免密推送代码到 GitHub 了。
