
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
import[("/test.txt")] = ("\1\2\3\4\5\6\7\8\9\10\11\12\13\14\15\16\17\18\19\20\21\22\23\24\25\26\27\28\29\30\31\32\33\34\35\36\37\38\39\40\41\42\43\44\45\46\47\48\49\50\51\52\53\54\55\56\57\58\59\60\61\62\63\64\65\66\67\68\69\70\71\72\73\74\75\76\77\78\79\80\81\82\83\84\85\86\87\88\89\90\91\92\93\94\95\96\97\98\99\100\101\102\103\104\105\106\107\108\109\110\111\112\113\114\115\116\117\118\119\120\121\122\123\124\125\126\127\128\129\130\131\132\133\134\135\136\137\138\139\140\141\142\143\144\145\146\147\148\149\150\151\152\153\154\155\156\157\158\159\160\161\162\163\164\165\166\167\168\169\170\171\172\173\174\175\176\177\178\179\180\181\182\183\184\185\186\187\188\189\190\191\192\193\194\195\196\197\198\199\200\201\202\203\204\205\206\207\208\209\210\211\212\213\214\215\216\217\218\219\220\221\222\223\224\225\226\227\228\229\230\231\232\233\234\235\236\237\238\239\240\241\242\243\244\245\246\247\248\249\250\251\252\253\254\255");
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
	local file = import(('./test.txt'));
	for i = 1, 255 do
		local byte = file:sub(i, i):byte();
		if ((byte ~= i)) then
			print(i, byte)
		end
	end
end