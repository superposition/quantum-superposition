import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { init, effect, draw, frame, target } from 'vgpu/node';
import { backgroundShader, particleShader, uniforms } from '../src/shaders.js';

await mkdir('artifacts', { recursive:true });
const gpu = await init();
const errors=[];
gpu.onError(error=>errors.push(error));
try {
  const size=[900,565];
  const output=target(gpu,{size});
  const background=effect(gpu,backgroundShader,{set:{params:{width:size[0],height:size[1],mode:0,padding:0}}});
  const field=draw(gpu,{shader:particleShader,vertices:6,instances:32768,blend:'additive'});
  const captures=[];
  for(const [name,state] of [
    ['wave',{p1:.5,phase:0,mode:0,time:.7}],
    ['wave-pi',{p1:.5,phase:Math.PI,mode:0,time:.7}],
    ['bloch-plus',{p1:.5,phase:0,mode:1}],
    ['bloch-zero',{p1:0,phase:0,mode:1}],
    ['measurement',{p1:.5,phase:0,mode:2}],
  ]) {
    field.set({params:uniforms(state,size)});
    await Promise.all([background.compile(output),field.compile(output)]);
    frame(gpu,f=>f.pass({target:output},pass=>{pass.draw(background);pass.draw(field);}));
    const pixels=await output.read();
    await gpu.settled();
    assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
    const png=new PNG({width:size[0],height:size[1]});png.data.set(pixels);
    await writeFile(`artifacts/${name}.png`,PNG.sync.write(png));
    let bright=0,peak=0;
    for(let i=0;i<pixels.length;i+=4){const luminance=Math.max(pixels[i],pixels[i+1],pixels[i+2]);if(luminance>70)bright++;peak=Math.max(peak,luminance);}
    if(state.mode!==2)assert.ok(bright>200,`${name}: field must contain visible rendered particles; got ${bright}`);
    captures.push(pixels);
    console.log(`${name}: ${bright} bright pixels, peak ${peak}, no GPU errors`);
  }
  const difference=(a,b)=>a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0);
  assert.ok(difference(captures[0],captures[1])>100000,'Changing phase must change the wave field');
  assert.ok(difference(captures[2],captures[3])>10000,'Changing balance must move the Bloch vector');
  console.log('GPU checks passed: compiled shaders, five actual renders, phase and balance response.');
} finally { gpu.dispose(); }
