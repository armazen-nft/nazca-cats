const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const solc = require('solc');
const ganache = require('ganache');
const { ethers } = require('ethers');
const input = {language:'Solidity',sources:{'NazcaCats.sol':{content:fs.readFileSync('contracts/NazcaCats.sol','utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const compiled = JSON.parse(solc.compile(JSON.stringify(input), {import: name => {
  try { return {contents:fs.readFileSync(path.join('node_modules',name.replace('@openzeppelin/contracts@5.0.2','@openzeppelin/contracts')),'utf8')}; }
  catch(e) { return {error:e.message}; }
}}));
const errors = (compiled.errors || []).filter(e=>e.severity==='error');
assert.equal(errors.length,0,JSON.stringify(errors));
const artifact = compiled.contracts['NazcaCats.sol'].NazcaCats;
fs.mkdirSync('build',{recursive:true});
fs.writeFileSync('build/NazcaCats.json',JSON.stringify(artifact,null,2));
async function fails(f) { await assert.rejects(async()=>{const r = await f(); if(r.wait) await r.wait();}); }
(async()=>{
 const engine=ganache.provider({logging:{quiet:true},chain:{hardfork:'shanghai'},wallet:{totalAccounts:3}});
 try {
 const provider = new ethers.BrowserProvider(engine); provider.pollingInterval=10;
 const owner = await provider.getSigner(0), buyer=await provider.getSigner(1);
 const oa=await owner.getAddress(), ba=await buyer.getAddress();
 const treasury=await provider.getSigner(2), ta=await treasury.getAddress();
 const c=await new ethers.ContractFactory(artifact.abi,artifact.evm.bytecode.object,owner).deploy(oa,ta,'ipfs://example/',10000);
 await c.waitForDeployment();
 await fails(()=>c.connect(buyer).mint(1,{value:1000}));
 await fails(()=>c.connect(buyer).configureSale(true,0));
 await (await c.configureSale(true,10000)).wait();
 await fails(()=>c.connect(buyer).mint(0));
 await fails(()=>c.connect(buyer).mint(21,{value:21000}));
 await fails(()=>c.connect(buyer).mint(1,{value:999}));
 await fails(()=>c.connect(buyer).mint(1,{value:1001}));
 await (await c.connect(buyer).mint(2,{value:2000})).wait();
 assert.equal(await c.ownerOf(1),ba);
 assert.equal(await c.tokenURI(2),'ipfs://example/2.json');
 await fails(()=>c.tokenURI(3));
 const royalty=await c.royaltyInfo(1,10000); assert.equal(royalty[0],oa); assert.equal(royalty[1],1000n);
 for(const id of ['0x80ac58cd','0x5b5e139f','0x2a55205a','0x49064906']) assert.equal(await c.supportsInterface(id),true);
 await fails(()=>c.configureMetadata('no-trailing-slash',ethers.id('manifest')));
 await fails(()=>c.freezeMetadata());
 await (await c.configureMetadata('ipfs://final/',ethers.id('manifest'))).wait();
 await (await c.freezeMetadata({gasLimit:200000})).wait();
 await fails(()=>c.configureMetadata('ipfs://changed/',ethers.id('new')));
 await (await c.connect(buyer).transferFrom(ba,oa,1)).wait();
 const before=BigInt(await engine.request({method:'eth_getBalance',params:[ta,'latest']}));
 await (await c.connect(buyer).withdraw()).wait();
 const after=BigInt(await engine.request({method:'eth_getBalance',params:[ta,'latest']}));
 assert.equal(after-before,2000n);
 assert.equal(await provider.getBalance(await c.getAddress()),0n);
 await (await c.transferOwnership(ba)).wait();
 assert.equal(await c.owner(),oa);
 await (await c.connect(buyer).acceptOwnership()).wait();
 await fails(()=>c.ownerMint(oa,1));
 assert.equal(await c.mintFee(),1000n);
 await (await c.connect(buyer).configureSale(true,10001)).wait();
 assert.equal(await c.mintFee(),1001n);
 await (await c.connect(buyer).configureSale(true,10000)).wait();
 await fails(()=>c.connect(buyer).ownerMint(ba,1));
 // Fill the full cap in bounded batches, checking actual state transitions.
 for(let remaining=4998;remaining>0;remaining-=20) {
   const tx=await c.connect(buyer).ownerMint(ba,Math.min(20,remaining),{gasLimit:2500000,value:1000n*BigInt(Math.min(20,remaining))});
   const receipt=await engine.request({method:"eth_getTransactionReceipt",params:[tx.hash]});
   assert.equal(receipt.status,"0x1");
 }
 assert.equal((await c.royaltyInfo(1,10000))[0],oa);
 assert.equal(await c.totalMinted(),5000n);
 assert.equal(await c.ownerOf(5000),ba);
 await fails(()=>c.connect(buyer).ownerMint(ba,1));
 await fails(()=>c.connect(buyer).mint(1,{value:1000}));
 console.log('PASS: compile; payment; access; metadata freeze; royalties; transfers; withdrawal; ownership; full 5000 cap.');
 } finally { await engine.disconnect(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
