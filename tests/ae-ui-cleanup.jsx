#target aftereffects
(function () {
    var comp = $.global.AEArrowUIVerificationComp;
    if (comp && comp.name === "AE Arrow UI Verification") { comp.remove(); }
    $.global.AEArrowUIVerificationComp = null;
}());
