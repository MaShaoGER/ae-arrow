#target aftereffects
(function () {
    var report = new File("D:/project/ae-arrow/test-results/ae-smoke.txt");
    report.encoding = "UTF-8";
    if (report.open("w")) {
        report.writeln("AE=" + app.version);
        report.writeln("items=" + app.project.numItems);
        report.writeln("scriptFileAccess=" + app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY"));
        report.close();
    }
}());
