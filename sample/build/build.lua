print"test"local e={"relative path test","sample module","test"}local t=setmetatable({},{__call=function(e,t)return e[t]end,__index=function(t,e)error((("Cannot find module ")..e))end})do t[e[1]]=(function()_NAME=e[1]end)()end do t[e[2]]=(function()_NAME=e[2]local e={}function e.test()return("This is a working module")end return e end)()end local t=t(e[2])local t=1 t+=1 local t=("")t..=e[3]print({e[3]})