const fs=require('fs'),path=require('path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('_dev/cfcheck.html','utf8').replace(/<script src="[^"]*"><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.addEventListener('error',e=>console.log('WINDOW ERROR:',e.message));
const base='lattice-platform/assets/js/';
['library.js','papers.js','domain.js','extract.js','paper.js','charts.js','app.js','views2-core.js','views2-stages.js'].forEach(f=>{
  try{w.eval(fs.readFileSync(base+f,'utf8'))}catch(e){console.log('EVAL FAIL',f,'→',e.message)}});
try{ w.eval(fs.readFileSync('_dev/cftext.js','utf8')); }catch(e){console.log('TEXT FAIL',e.message);}
try{
  w.eval(`(function(){var an=MR.extract.analyze(window.__CFTEXT.text,{name:window.__CFTEXT.name});
  MR.state.analysis=an; MR.state.profile=MR.paper.build(an, window.__CFTEXT.text);
  console.log('type='+an.paperType+' cats='+an.concepts.length+' tl='+an.timeline.length);
  var C=MR.views2.concept;
  console.log('route len', C.route(900).length, 'matrix len', C.matrix(430).length, 'time len', C.time(430).length);
  })();`);
}catch(e){console.log('RUN FAIL:', e.message, e.stack?e.stack.split('\n')[1]:'');}
