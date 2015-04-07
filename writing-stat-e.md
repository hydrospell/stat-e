Writing a static website generator

## Spec

I want a command line tool that takes a directory of Markdown files, preserves the directory hierarchy, and spits out a website made of html files based on a set of Mustache templates. 

I want to manage as little meta data as possible, preferably none, so through this project I want to avoid adding a json or yaml section of meta data to my Markdown files. Meta data will be inferred from file name (slug) and created/modified dates (post dates). Should use `touch --date` and `touch --date -m` to manually change dates of posts when it is necessary to do so. 

I want directory indices ('collection' views) to be generated automatically. If I have a subdirectory named `/blogs`, a `blogs.html` containing a list of all files inside the directory should be generated automatically and placed in the same directory as `/blogs`.  This can then be extended at will to become a "category view" of sorts. 
