# AE Arrow 0.6.0 安装与三维使用

安装只需要一个文件：AE Arrow.jsx。伪效果预设已经内嵌，不需要另外安装 FFX、Python 或 Node.js，也不需要修改 AE 的 XML。

1. 把 AE Arrow.jsx 放入 Adobe After Effects 的 Support Files/Scripts/ScriptUI Panels 目录。
   本机：E:\Programs\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\
2. 重启 AE，从“窗口 → AE Arrow”打开面板，可以拖动停靠。
3. 在偏好设置的“脚本和表达式”中启用“允许脚本写入文件和访问网络”，用于将内嵌控件写入临时目录。
4. 选中开放的钢笔路径或蒙版路径，点击“从选中路径创建”。三维场景勾选“创建三维箭头”；三维源层自动启用。
5. 在源图层上调整 X/Y/Z 位置、旋转、缩放和动画。按 F3 调整箭头样式，使用路径点的 X/Y 偏移编辑路径。

如果只想临时运行，无需复制或重启：选择“文件 → 脚本 → 运行脚本文件”，打开 AE Arrow.jsx 即可。
直接放在 Scripts 根目录也可从“文件 → 脚本”访问，但以停靠面板使用时应放在 ScriptUI Panels。

三维箭头是参与摄像机透视的平面图形，没有挤出厚度，路径点不支持独立 Z 深度。保留箭头、源层和控制点的三维开关及父子关系，定位操作源层。

旧箭头请从原源路径重新创建三维版。旧箭头的样式及路径点偏移不会自动迁移。
