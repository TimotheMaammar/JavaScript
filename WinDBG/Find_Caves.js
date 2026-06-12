// findcaves.js  (v2)
//   0:000> .scriptload C:\Tools\Find_Caves.js
//   0:000> dx @$scriptContents.findCaves("MODULE")
//   0:000> dx @$scriptContents.findCaves("MODULE", 0x200)        // Longueur minimale
//   0:000> dx @$scriptContents.findCaves("MODULE", 0x40, 0xCC)   // Padding exécutable

"use strict";

function log(s) { host.diagnostics.debugLog(s + "\n"); }

function getProt(addr) {
    // !vprot pour récupérer la vraie protection runtime de la page
    var ctl = host.namespace.Debugger.Utility.Control;
    var prot = "?";
    try {
        for (var line of ctl.ExecuteCommand("!vprot 0x" + addr.toString(16))) {
            var m = line.match(/Protect:\s+\S+\s+(PAGE_\S+)/);
            if (m) prot = m[1];
        }
    } catch (e) {}
    return prot;
}

function findCaves(modName, minCave, caveByte) {
    minCave  = minCave  || 0x100;
    caveByte = (caveByte === undefined) ? 0 : caveByte;
    var PAGE = 0x1000;

    var mods = host.currentProcess.Modules.Where(function (m) {
        return m.Name.toLowerCase().indexOf(modName.toLowerCase()) != -1;
    });
    if (mods.Count() == 0) { log("[-] module introuvable: " + modName); return; }
    if (mods.Count() > 1) {
        log("[!] plusieurs modules matchent '" + modName + "' :");
        for (var mm of mods) log("      " + mm.Name);
    }

    var mod  = mods.First();
    var base = mod.BaseAddress;
    var size = mod.Size;
    log("[+] " + mod.Name + "  base: 0x" + base.toString(16) +
        "  size: 0x" + size.toString(16) +
        "  (byte 0x" + caveByte.toString(16) + ", min 0x" + minCave.toString(16) + ")");

    var run = 0, rstart = base;

    function flush() {
        if (run >= minCave) {
            var prot = getProt(rstart);
            var tag  = (prot.indexOf("EXECUTE") != -1) ? "   <== EXEC" : "";
            log("  cave 0x" + run.toString(16) + " o @ 0x" + rstart.toString(16) +
                "  (base+0x" + rstart.subtract(base).toString(16) + ")  " + prot + tag);
        }
        run = 0;
    }

    for (var off = 0; off < size; off += PAGE) {
        var pageAddr = base.add(off);
        var data;
        try {
            data = host.memory.readMemoryValues(pageAddr, PAGE, 1);
        } catch (e) {
            flush();
            continue;
        }
        for (var i = 0; i < PAGE; i++) {
            if (data[i] == caveByte) {
                if (run == 0) rstart = pageAddr.add(i);
                run++;
            } else {
                flush();
            }
        }
    }
    flush(); 
}

function invokeScript() { findCaves("libeay32IBM019"); }
