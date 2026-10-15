#target aftereffects
(function () {
    var comp = $.global.AEArrowUIVerificationComp;
    if (!comp) { throw new Error("UI verification composition missing"); }
    var file = new File("D:/project/ae-arrow/test-results/ui-state.txt"), i, layer;
    file.encoding = "UTF-8"; file.open("w");
    file.writeln("compId=" + comp.id + "; layers=" + comp.numLayers);
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i); file.writeln("id=" + layer.id + "; " + layer.comment);
    }
    file.close();
}());
