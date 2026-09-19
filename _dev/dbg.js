const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=process.argv[2];
const dom=new JSDOM(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
['library.js','papers.js','domain.js','pdftext.js','extract.js','paper.js','charts.js','figures2.js','data.js','app.js','views2-core.js','views2-stages.js','views2-paper.js'].forEach(f=>{
  try{ w.eval(fs.readFileSync(path.join(ROOT,'assets/js',f),'utf8')); console.log('OK ',f); }
  catch(e){ console.log('FAIL',f,e.message); }
});
console.log('MR?',!!w.MR,'domain?',!!(w.MR&&w.MR.domain),'pdftext?',!!(w.MR&&w.MR.pdftext));
process.exit(0);
