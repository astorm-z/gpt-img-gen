# gpt-image-gen2

这是一个前端工程化版本。源码被拆分到 `src/`，生产环境通过 `npm run build` 输出到 `dist/`。

项目的构建脚本只依赖本机 Node.js，不需要额外安装打包器。构建时会生成 hash 命名的静态资源，并且不输出 sourcemap。

## 开发

先复制运行时配置示例：

```powershell
Copy-Item app.config.example.json app.config.json
```

然后在 `app.config.json` 中填写接口配置：

```json
{
  "apiUrl": "https://你的接口域名",
  "apiKey": "你的默认 API Key，也可以留空",
  "apiPathPrefix": "/v1",
  "keyUrl": "获取专属 key 的页面地址，也可以留空",
  "apiKeyButtonText": "填充默认key",
  "apiKeyNotice": "当前使用配置文件中的默认 API Key。"
}
```

`app.config.json` 是本地和部署环境的运行时配置文件，已加入 `.gitignore`，不要把真实 API Key 写进 `src/`、`index.html` 或提交到仓库。生产构建会优先复制 `app.config.json` 到 `dist/app.config.json`；如果该文件不存在，则复制空值示例配置。

```bash
npm run dev
```

## 生产构建

```bash
npm run build
```

实际部署时只部署 `dist/` 目录，不要把项目源码目录作为静态站点根目录。

前端工程化只能提高直接复制完整 HTML 源码的难度，不能防止浏览器端资源被抓取或反混淆。如果需要保护密钥、接口策略或计费逻辑，应放到服务端处理。
