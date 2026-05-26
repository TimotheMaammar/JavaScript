"use strict";

//
// depwalker.js
//
// Dependency analysis between modules loaded in the process.
//
// Recursive dependency tree between modules (with cycle guard)
// Reverse lookup: which modules depend on a given module
//
// Load:
//   .scriptload C:\Tools\WinDBG_Scripts\depwalker.js
//
// Usage:
//   dx @$scriptContents.dependencyTree("myapp")
//   dx @$scriptContents.importedBy("ws2_32.dll")
//

function initializeScript()
{
    return [new host.apiVersionSupport(1, 7)];
}


// Case-insensitive resolution: exact name first, then partial match.
function getModByName(modName)
{
    modName = modName.toLowerCase();

    var matches = host.currentProcess.Modules.Where(function (x) {
        return baseName(x.Name).toLowerCase() == modName;
    });

    if (matches.Count() == 0)
    {
        matches = host.currentProcess.Modules.Where(function (x) {
            return x.Name.toLowerCase().includes(modName);
        });
    }

    return matches.Count() == 0 ? undefined : matches.First();
}

// Strips the full path and returns only the module filename.
function baseName(name)
{
    if (name === undefined || name === null) { return ""; }
    if (name.includes("\\")) { name = name.substring(name.lastIndexOf("\\") + 1); }
    return name;
}

// ---------------------------------------------------------------------------
// Forward dependency tree (with cycle guard)
// ---------------------------------------------------------------------------

class dependencyWalker
{
    constructor(modName, visited)
    {
        this.__modName  = modName;
        this.__visited  = visited || {};
    }

    toString()
    {
        var mod = getModByName(this.__modName);
        return mod === undefined
            ? this.__modName + "  (not found / not loaded)"
            : baseName(mod.Name);
    }

    *[Symbol.iterator]()
    {
        var rootMod = getModByName(this.__modName);
        if (rootMod === undefined) { return; }

        var key = baseName(rootMod.Name).toLowerCase();
        if (this.__visited[key]) { return; }
        this.__visited[key] = true;

        for (var imp of rootMod.Contents.Imports)
        {
            yield new dependencyWalker(imp.ModuleName, this.__visited);
        }
    }
}

// ---------------------------------------------------------------------------
// Reverse dependency tree (which modules import this one)
// ---------------------------------------------------------------------------

class importedByWalker
{
    constructor(modName, visited)
    {
        this.__modName  = modName;
        this.__visited  = visited || {};
    }

    toString()
    {
        var mod = getModByName(this.__modName);
        return mod === undefined
            ? this.__modName + "  (not found / not loaded)"
            : baseName(mod.Name);
    }

    *[Symbol.iterator]()
    {
        var rootMod = getModByName(this.__modName);
        if (rootMod === undefined) { return; }

        var cleanModName = baseName(rootMod.Name).toLowerCase();
        if (this.__visited[cleanModName]) { return; }
        this.__visited[cleanModName] = true;

        var visited = this.__visited;
        var matches = host.currentProcess.Modules.Where(function (x) {
            return x.Contents.Imports.Any(function (y) {
                return baseName(y.ModuleName).toLowerCase() == cleanModName;
            });
        });

        for (var mod of matches)
        {
            yield new importedByWalker(mod.Name, visited);
        }
    }
}

// ---------------------------------------------------------------------------
// Exported entry points
// ---------------------------------------------------------------------------

// Tree of modules that modName depends on (recursive, cycle-safe).
function dependencyTree(modName) { return new dependencyWalker(modName); }

// Tree of modules that import modName (recursive, cycle-safe).
function importedBy(modName)     { return new importedByWalker(modName); }
