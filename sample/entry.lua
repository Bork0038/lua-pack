local sample = load("./modules/relative_path.lua");

local file = import('./test.txt');
for i = 1, 255 do
    local byte = file:sub(i,i):byte()

    if (byte ~= i) then
        print(i, byte)
    end
end