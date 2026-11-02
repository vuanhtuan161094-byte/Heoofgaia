/* Node entry point for the real installed-Chrome CLI acceptance run. */
'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const python=process.env.PYTHON||'python';
const result=spawnSync(python,[path.join(__dirname,'qa-hg10-parallel-browser.py')],{stdio:'inherit',windowsHide:true});
if(result.error){console.error(result.error.message);process.exitCode=1}
else process.exitCode=result.status??1;
