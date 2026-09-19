const fs=require('fs'),path=require('path');const {JSDOM}=require('jsdom');
const ROOT=process.argv[2],PDF=process.argv[3],OUT=process.argv[4];
const dom=new JSDOM('<html></html>',{runScripts:'outside-only'});const w=dom.window;
['library.js','papers.js','domain.js','pdftext.js','extract.js'].forEach(f=>{try{w.eval(fs.readFileSync(path.join(ROOT,'assets/js',f),'utf8'))}catch(e){console.log('EVAL FAIL',f,e.message)}});
(async()=>{const buf=fs.readFileSync(PDF);const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
const text=await w.MR.pdftext.extract(ab);
fs.writeFileSync(OUT, JSON.stringify({name:path.basename(PDF), text:text}));
console.log('wrote', OUT, text.length);})();
