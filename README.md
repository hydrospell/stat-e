# Static Electricity!

## Getting started:
1. Configure directories in `config.json`

```
{
	"source_dir": "drafts",
	"template_dir": "templates",
	"public_dir": "public"
}
```

2. Write some markdown in your `source_dir`

3. Write a Mustache template in your `template_dir`

4. stat-e will bake all files in `source_dir` with template found in `template_dir`


Here are some rules:

1. `template_dir` needs to have at least `index.mustache`
2. If there is a more specific template, it will use it:
	- `index.mustache` in same directory takes precendence if your file is in a subdirectory
	- `.mustache` bearing exact same file name as your source takes precendence over `index.mustache`

Here are some features:
1. File name of source file be file name of output file:  
    `test-this-stuff.md` => `test-this.stuff.html`

