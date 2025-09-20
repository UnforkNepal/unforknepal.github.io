gen:
	deno run -A bin/json2schema.ts src/data/unfork-nepal-data.json --root-name=UnforkNepalData --typescript=src/types/data.ts --output=src/types/schema.json
	pandoc docs/manifesto.md -o public/pdfs/manifesto.pdf --pdf-engine typst --variable geometry:margin=1in --variable fontsize=11pt --variable sectionpagebreak=true
	deno fmt src/types/schema.json src/types/data.ts

fmt:
	deno fmt .

pdf in out:
	pandoc {{in}} -o {{out}} --pdf-engine typst --variable geometry:margin=1in --variable fontsize=11pt --variable sectionpagebreak=true
