# lua-pack

lua-pack is an advanced lua bundler similar to webpack made for lua 5.1+ written in js that makes working on large scale projects easy and fast.
it takes all the files in your project and packs them into a single production ready file.

# usage
to define a module in your project the first line must be like the following.

```lua
_NAME = "module name here";

return { whatever = true };
```
to load that module in any other source file you can just call the load function
```lua
local module = load("module name here");
print(module.whatever);
```

## initialize project

to start your project start by making a new folder which will contain all your lua files then open a terminal in that folder and run

```bash
luapack init
```

it will first ask for what the name of the project and then for which of the files is going to be the entry/main file and then go through all the options for you to select.

## building project

you can build your project in two different ways directly building it and serving it to a webserver.

### build

by running the following, it will output the build into a newly created folder inside your project folder

```bash
luapack build
```

### serve

serving the project will allow for hot updating the build every time a script is changed and host that build on your localhost to allow easy testing of your code.

```bash
luapack serve
```

after running the command it will build your script and put it on the first open port it can find on your localhost, from then on every time you make a change or add a source file it will create a new build and update the site


# features

lua-pack has many unique features to make your life easier.

## file importing and relative paths

you can easily import any file and interact between the files in your project.

### relative file paths

luapack allows you to use relative file paths when loading modules and importing files. let's say you are want to load a module name by file name in the same directory you can do something like the following.

```lua
local module = load('./module.lua') -- load file via relative path
local module2 = load('../folder/module2.lua') -- load file from up a directory
```
**relative paths can be disabled**.
when relative paths are disabled file based paths are relative to the project folder instead of the current file. to disabled them change "enableRelativePaths" in your luapack.config.json file to false

### importing files

all files in the project folder are automatically bundled into the project for ease of use. let's say your file structure looks like the following :

```
project
|-folder
| |-sample.txt
| `-test.json
`-main.lua
```

to load both files from inside of main.lua all you have to dos

```lua
local sampleTxt = import('./folder/sample.txt')
local testJson  = import('./folder/test.json') -- json files are automatically converted to lua tables on compilation so you can directly index them after importing
```

## prelude
adding the "prelude" variable to your config file will put the selected file before the modules get loaded in the package.

## string literal caching

if enabled, repeated use of the same string literals will cause the bundler to automatically localize them to save on storage space

```lua
print("test")
local b = "test"
local c = "test"

-- string literal caching enabled
local a = "test"
print(a)
local b = a
local c = a
```

## instruction optimization

when enabled, any large repetition of instructions will automatically be put in a for loop in the output

```lua
print("test")
print("test")
print("test")
print("test")

-- instruction optimization enabled
for i = 1, 4 do
    print("test")
end
```

# installation

## installing pre-built release

1. download the .zip file from the releases page
2. unpack that .zip file to any folder on your computer
3. add that folder to your windows PATH [(tutorial)](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/)

## install with scoop

1. open cmd
2. install
    ```bash
    scoop install https://raw.githubusercontent.com/Bork0038/lua-pack/main/scoop-manifest.json
    ```
3. scoop shims should already be added to your windows PATH [(tutorial)](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/), if they aren't then add `%UserProfile%\scoop\shims`

## building from source

***must have node.js installed***

1. open cmd

3. install pkg

   ```bash
    npm i -g pkg
   ```

3. open the source folder 

4. install the node modules
   
    ```bash
    npm i
    ```
5. run the build script

   ```bash
   npm run build
   ```

6. add that folder to your windows PATH [(tutorial)](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/)
 
