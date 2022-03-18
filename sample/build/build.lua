
do
	_PATH = "/prelude.lua"
	print("test")
end
local StringLiterals = {
	'[^/]+',
	".lua",
	'/',
	"a",
	"b",
	"relative path test",
	"sample module"
}
local moduleDictionary = {};
local function split(path)
	local sections = {};
	for section in path:gmatch(StringLiterals[1]) do
		table.insert(sections, section)
	end
	return sections;
end
local pathCache = {};
local function joinPath(start, path)
	local pathId = (start .. (("|") .. path));
	if (pathCache[pathId]) then
		return pathCache[pathId];
	end
	local output = start;
	for token in path:gmatch(StringLiterals[1]) do
		local sections = split(output);
		if ((token == ('.'))) then
			if ((sections[# sections]:sub(- 4, - 1) == StringLiterals[2])) then
				table.remove(sections)
			end
		elseif ((token == ('..'))) then
			if ((sections[# sections]:sub(- 4, - 1) == StringLiterals[2])) then
				table.remove(sections)
				table.remove(sections)
			end
		else
			table.insert(sections, token)
		end
		output = (((# sections > 0) and (("/") .. table.concat(sections, StringLiterals[3]))) or StringLiterals[3]);
	end
	pathCache[pathId] = output;
	return output;
end
local load = setmetatable({}, {
	__call = function (a, b)
		return a[b];
	end,
	__index = function (a, b)
		local moduleName = moduleDictionary[joinPath(getfenv(2)._PATH, b)];
        print(moduleName)
		if (moduleName) then
			return rawget(a, moduleName);
		end
		error((("Cannot find module. If the path is relative relative paths must be enabled in the config.") .. b))
	end
});
local import = setmetatable({}, {
	__call = function (a, b)
		return a[b];
	end,
	__index = function (a, b)
		local file = rawget(a, joinPath(getfenv(2)._PATH, b));
		if (file) then
			return file;
		end
		error((("Cannot load file. If the path is relative relative paths must be enabled in the config.") .. b))
	end
});
import[("/a.txt")] = ("\72\101\108\108\111\32\87\111\114\108\100");
import[("/test.json")] = {
	[StringLiterals[4]] = ("test"),
	[StringLiterals[5]] = true,
	[("c")] = 1,
	[("d")] = {
		StringLiterals[4],
		StringLiterals[5]
	},
	[("e")] = {
		[StringLiterals[4]] = StringLiterals[5]
	}
};
do
	load[StringLiterals[6]] = (function ()
		_NAME = StringLiterals[6];
		_PATH = ("/modules/relative_path.lua");
		moduleDictionary[_PATH] = _NAME;
		print(("relative"))
	end)();
end
do
	load[StringLiterals[7]] = (function ()
		_NAME = StringLiterals[7];
		_PATH = ("/modules/sample_module.lua");
		moduleDictionary[_PATH] = _NAME;
		local e = {};
		function e.test()
			return ("This is a working module");
		end
		return e;
	end)();
end
do
	_PATH = ("/entry.lua");
	local sample = load(("./modules/relative_path.lua"));
	print(load(('sample module')))
	print(import(("./a.txt")))
end