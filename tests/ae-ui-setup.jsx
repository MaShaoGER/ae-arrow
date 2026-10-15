#target aftereffects
(function () {
    var comp = app.project.items.addComp("AE Arrow UI Verification", 1280, 720, 1, 2, 30);
    $.global.AEArrowUIVerificationComp = comp;
    comp.selected = true; comp.openInViewer();
    $.evalFile(new File("D:/project/ae-arrow/dist/AE Arrow.jsx"));
}());
