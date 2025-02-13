# Super-Resolution Toolbox

## 项目描述

**Super-Resolution Toolbox** 是一个基于 [Electron](https://www.electronjs.org/) 和深度学习的超分辨率图像处理工具，集成了多个深度学习模型，可用于图像分辨率增强和质量提升。

## 功能特点

1. **多模型支持**
   - 支持通过配置文件加载不同的超分模型（如 EDSR、ATD 等）。
   - 模型可通过动态注册使用，无需修改代码。

2. **用户友好界面**
   - 基于 Electron 实现跨平台桌面应用。
   - 简单易用的图形化操作界面（GUI）。

3. **高可定制性**
   - 支持用户上传自定义架构、模型权重和配置文件。
   - 提供简单直观的配置保存和管理功能。

4. **自动化处理**
   - 可将低分辨率图像通过超分模型转换为高质量的高分辨率图像。
   - 自动保存输出结果，方便后续使用。

5. **本地运行**
   - 无需依赖外部 Python 环境，内置虚拟环境支持运行深度学习模型。
   - 确保运行时稳定性和性能。

---

## 技术栈

- **前端**：Electron
- **后端**：Node.js
- **深度学习框架**：PyTorch
- **语言**：JavaScript / Python
- **配置管理**：YAML

---

## 使用方法

### 1. 克隆代码仓库
```bash
git clone https://github.com/<your-username>/super-resolution-toolbox.git
cd super-resolution-toolbox
