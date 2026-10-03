const fs=require('fs'),path=require('path'),solc=require('solc');
const seen=new Set(),parts=[];
function visit(file){
 file=path.resolve(file); if(seen.has(file))return; seen.add(file);
 const source=fs.readFileSync(file,'utf8');
 const imports=[...source.matchAll(/import\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']\s*;/g)];
 for(const m of imports){const name=m[1];visit(name.startsWith('.')?path.resolve(path.dirname(file),name):path.join('node_modules',name.replace('@openzeppelin/contracts@5.0.2','@openzeppelin/contracts')));}
 parts.push('// Source: '+path.relative(process.cwd(),file)+'\n'+source.replace(/import\s+(?:[\s\S]*?from\s+)?["'][^"']+["']\s*;/g,'').replace(/pragma solidity[^;]*;/g,'').replace(/\/\/ SPDX-License-Identifier:[^\n]*/g,''));
}
visit('contracts/NazcaCats.sol');
const source='// SPDX-License-Identifier: MIT\npragma solidity 0.8.24;\n\n'+parts.join('\n');
const result=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'NazcaCats.flat.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
const errors=(result.errors||[]).filter(x=>x.severity==='error');if(errors.length)throw new Error(JSON.stringify(errors));
fs.writeFileSync('contracts/NazcaCats.flat.sol',source);
console.log('PASS: standalone flattened contract compiles with no external imports.');
