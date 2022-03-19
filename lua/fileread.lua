local filePath = arg[1];
local file = io.open(filePath, "rb");

local content = file:read("*a");
local out = "";

content:gsub('.', function(s)
    out = out .. "\\" .. s:byte();
end)

print(out);