// 主入口文件
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // 修改为使用 Promise 的文件系统方法
const { spawn } = require('child_process');
const yaml = require("js-yaml"); // 需要安装 js-yaml 模块解析 YAML 文件
const pythonExecutable = path.join(__dirname, 'python-basicSR', 'python.exe'); // 嵌入式 Python
const visionScript = path.join(__dirname, 'SR_process', 'vision.py');

// 创建窗口
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // 指定 preload
            enableRemoteModule: false, // 禁用 remote 模块（推荐）
            contextIsolation: true, // 启用上下文隔离
        },
        icon: path.join(__dirname, 'icon.png') // 设置窗口图标
    });

    // 打开开发者工具
    // mainWindow.webContents.openDevTools();

    mainWindow.setMenuBarVisibility(false);
    
    mainWindow.loadFile('pages\\index\\index.html');
    //mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 处理超分辨率图像的逻辑
ipcMain.handle('process-image', async (event, imagePath, configFile) => {
    try {
        const userDataPath = app.getPath('userData'); // Electron 提供的用户可写目录
        const outputImagePath = path.join(userDataPath, 'output_image.png');

        // 判断当前环境是否为打包环境
        const basePath = app.isPackaged ? process.resourcesPath : __dirname;
        const pythonExecutable = path.join(basePath, 'python-PyQt5', 'python.exe');
        const visionScript = path.join(basePath, 'SR_process', 'vision.py');
        const configFilePath = path.join(basePath, 'SR_process', 'options', configFile) + '.yml';

        console.log("Python Executable Path:", pythonExecutable);
        console.log("Vision Script Path:", visionScript);
        console.log("Input Image Path:", imagePath);
        console.log("Output Image Path:", outputImagePath);
        console.log("Config File Path:", configFilePath);

        const pythonProcess = spawn(
            pythonExecutable,
            [visionScript, imagePath, outputImagePath, configFilePath], // 传递参数
            {
                shell: true,
                env: {
                    ...process.env,
                    PYTHONPATH: path.join(basePath, 'SR_process'), // 确保 Python 可以正确找到 SR_process 模块
                    PYTHONIOENCODING: 'utf-8' // 设置 Python 输出为 UTF-8
                }
            }
        );

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python stdout: ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data.toString()}`);
        });

        return new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(outputImagePath);
                } else {
                    reject(new Error(`Python 脚本执行失败，退出码：${code}`));
                }
            });
        });
    } catch (error) {
        console.error('处理图像时发生错误:', error);
        throw error;
    }
});


// 文件选择逻辑
ipcMain.handle('dialog:openFile', async (event, fileType) => {
    const filters = {
        python: [{ name: 'Python Files', extensions: ['py'] }],
        yaml: [{ name: 'YAML Files', extensions: ['yml', 'yaml'] }],
        all: [{ name: 'All Files', extensions: ['*'] }]
    };

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters[fileType] || filters.all,
    });

    if (!result.canceled) {
        return result.filePaths[0]; // 返回选择的文件路径
    } else {
        return null; // 未选择文件时返回 null
    }
});


ipcMain.handle('dialog:saveFile', async () => {
    const result = await dialog.showSaveDialog({
        filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    return result.filePath;
});

ipcMain.handle('saveConfig', async (event, { archContent, configContent, modelFilePath }) => {
    try {
        // 获取打包后的资源路径或开发环境路径
        const isPackaged = app.isPackaged; // Electron 提供的方法，用于检测是否是打包后的环境
        const resourcesPath = isPackaged ? process.resourcesPath : __dirname;
        const archTargetDir = path.join(resourcesPath, 'SR_process', 'basicsr', 'archs');
        const configTargetDir = path.join(resourcesPath, 'SR_process', 'options');
        const modelTargetDir = path.join(resourcesPath, 'SR_process', 'pretrained_models');

        // 确保目标目录存在
        await fs.mkdir(archTargetDir, { recursive: true });
        await fs.mkdir(configTargetDir, { recursive: true });
        await fs.mkdir(modelTargetDir, { recursive: true });

        // 从配置内容中解析 `name`
        const parsedConfig = yaml.load(configContent); // 使用 `js-yaml` 解析 YAML 内容
        const name = parsedConfig.name;
        if (!name) {
            throw new Error('配置文件中未找到 `name` 字段！');
        }

        // 保存路径
        const archTargetPath = path.join(archTargetDir, `${name}_arch.py`);
        const configTargetPath = path.join(configTargetDir, `${name}.yml`);
        const modelTargetPath = path.join(modelTargetDir, path.basename(modelFilePath));

        // 保存架构文件
        await fs.writeFile(archTargetPath, archContent, 'utf-8');

        // 保存配置文件
        await fs.writeFile(configTargetPath, configContent, 'utf-8');

        // 复制模型文件
        await fs.copyFile(modelFilePath, modelTargetPath);

        // 更新配置文件中的 `pretrain_network_g` 路径
        if (parsedConfig.path && parsedConfig.path.pretrain_network_g) {
            parsedConfig.path.pretrain_network_g = modelTargetPath; // 更新路径
        } else {
            if (!parsedConfig.path) {
                parsedConfig.path = {}; // 如果 `path` 字段不存在，初始化它
            }
            parsedConfig.path.pretrain_network_g = modelTargetPath; // 添加路径
        }

        // 将更新后的配置写回配置文件
        const updatedConfigContent = yaml.dump(parsedConfig);
        await fs.writeFile(configTargetPath, updatedConfigContent, 'utf-8');

        console.log(`文件已保存并更新成功：
        - Arch: ${archTargetPath}
        - ConfigFile: ${configTargetPath}
        - ModelFile: ${modelTargetPath}`);
        return true;
    } catch (error) {
        console.error('保存配置失败：', error);
        return false;
    }
});



// 文件读取方法
ipcMain.handle('read-file', async (event, filePath) => {
    console.log('收到读取文件请求，路径为:', filePath); // 打印文件路径
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log('文件读取成功，内容为:', content.slice(0, 100)); // 打印部分内容
        return content;
    } catch (err) {
        console.error('文件读取失败:', err);
        throw err;
    }
});

ipcMain.handle('save-image', async (event, sourcePath, targetPath) => {
    console.log('收到保存图像请求:', sourcePath, targetPath);
    const fs = require('fs').promises;
    try {
        // 复制文件
        await fs.copyFile(sourcePath, targetPath);
        console.log(`结果已保存到：${targetPath}`);
        return true; // 保存成功
    } catch (error) {
        console.error('保存结果失败：', error);
        return false; // 保存失败
    }
});

// 加载模型配置文件列表
ipcMain.handle('load-model-options', async () => {
    try {
        const optionsPath = path.join(__dirname, 'SR_process', 'options'); // 配置文件夹路径
        const files = await fs.readdir(optionsPath); // 异步读取文件夹内容

        const modelOptions = [];
        for (const file of files) {
            if (file.endsWith('.yml')) { // 确保只处理 yml 文件
                const filePath = path.join(optionsPath, file);
                const content = await fs.readFile(filePath, 'utf-8'); // 异步读取文件内容
                const nameMatch = content.match(/name:\s*(.+)/); // 从文件中提取 `name` 字段
                if (nameMatch) {
                    modelOptions.push(nameMatch[1].trim()); // 提取字段值
                }
            }
        }

        return modelOptions; // 返回提取的模型选项
    } catch (error) {
        console.error('加载模型配置失败:', error);
        throw error;
    }
});