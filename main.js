var ctx=canvas.getContext('2d');
const imageProcessingOptions=
{
  minColor:0,
  maxColor:255,
  gamma:1,
  gainColor:1,
  detherDiffusion:1,
  legacyColor:false,
  getColorIndex:false
};
var minColor=0,
maxColor=255,
gammaColor=0,
gainColor=1;

const offcanvas=new OffscreenCanvas(0,0);
const offctx=offcanvas.getContext('2d',{willReadFrequently :true});
offctx.imageSmoothingQuality='high';

const canvasDiv=document.getElementsByClassName('canvas-div')[0];
const rightContainerDiv=document.getElementsByClassName('right-container')[0];

const backgroundBitmap=(function()
{
  let size=20;
  const canvas=new OffscreenCanvas(size,size);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#ccc';
  ctx.fillRect(0,0,size/2,size/2);
  ctx.fillRect(size/2,size/2,size/2,size/2);
  return canvas;
})();

let imageStatus=
{
  view:
  {
    zoom:1,
    x:0,
    y:0
  },
  crop:
  {
    x:0,y:0,w:null,h:null
  },
  scaledImage:null,
  processedImage:null,
  originalImage:null
};

const CANVAS_STATUS=
{
  NONE:0,
  VIEW:1,
  CROP:2,
};
let canvasStatus=CANVAS_STATUS.NONE;

const options=
{
  controller:
  [
    {
      title:'최소 밝기: {0}',
      type:'range',
      attr:[
        ['min',0],
        ['max',255],
        ['value',4]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.minColor=+this.value);
          processImage().then(draw);
        }
      }
    },
    {
      title:'최대 밝기: {0}',
      type:'range',
      attr:[
        ['min',0],
        ['max',255],
        ['value',252]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.maxColor=+this.value);
          processImage().then(draw);
        }
      }
    },
    {
      title:'감마: {0}',
      type:'range',
      attr:[
        ['min',1],
        ['max',100],
        ['value',10]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.gamma=(+this.value/10));
          processImage().then(draw);
        }
      }
    },/*
    {
      title:'색상 우선선택률: {0}',
      type:'range',
      attr:[
        ['min',0],
        ['max',100],
        ['value',10]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.gainColor=+this.value/10);
          processImage().then(draw());
        }
      }
    },*/
    {
      title:'디더링 에러 확산률: {0}',
      type:'range',
      attr:[
        ['min',0],
        ['max',200],
        ['value',100]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.detherDiffusion=+this.value/100);
          processImage().then(draw);
        }
      }
    },
    {
      title:'올드 66색: {0}',
      titleIsLabel:true,
      type:'checkbox',
      attr:[
        ['.checked',false]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format((imageProcessingOptions.legacyColor=this.checked)?'사용':'사용안함');
          processImage().then(draw);
        }
      }
    },
    {
      type:'button',
      attr:[
        ['.value','사진 자르기']
      ],
      eventListener:{
        click:function(){
          if(canvasStatus==CANVAS_STATUS.VIEW)
          {
            changeCanvasStatus(CANVAS_STATUS.CROP);
            this.value='완료';
            draw();
          }
          else if(canvasStatus==CANVAS_STATUS.CROP)
          {
            changeCanvasStatus(CANVAS_STATUS.VIEW);
            this.value='사진 자르기';
            scaleImage().then(()=>processImage().then(draw));
          }
        }
      }
    },
    {
      tag:'hr',
      attr:[
        ['name','option--crop']
      ],
      eventListener:{}
    },
    {
      tag:'h3',
      attr:[
        ['.innerText','사진 자르기 옵션'],
        ['name','option--crop']
      ],
      eventListener:{}
    },
    {
      tag:'p',
      attr:[
        ['name','option--crop'],
        ['id','option--crop--image--size']
      ],
      eventListener:{}
    },
    {
      title:'',
      type:'button',
      attr:[
        ['.value','영역 초기화'],
        ['name','option--crop']
      ],
      eventListener:{
        click:function(){
          imageStatus.crop.x=0;
          imageStatus.crop.y=0;
          imageStatus.crop.w=imageStatus.originalImage.width;
          imageStatus.crop.h=imageStatus.originalImage.height;
          draw();
        }
      }
    },
    /*{
      title:'',
      type:'button',
      attr:[
        ['.value','to BBB data']
      ],
      eventListener:{
        click:function(){
          processImage().then(()=>
          {
            let res=toBBBData(imageStatus.scaledImage.width,imageStatus.scaledImage.height,getColorArray());
            console.log(res);
          });
        }
      }
    }*/
  ]
};

function toBBBData(w,h,indexs)
{
  const DV=19532n;
  const M='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const ML=BigInt(M.length);
  const L=5;
  const P=12;
  indexs=indexs.slice(0).concat(Array((L-indexs.length%L)%L).fill(0));
  let s='';
  for(let i=0;i<indexs.length;i+=L)
  {
    let n=0n;
    for(let j=L-1;j>=0;j--)
    {
      n=n*DV+BigInt(indexs[i+j]);
    }
    for(let j=P-1;j>=0;j--)
    {
      s+=M[n%ML];
      n/=ML;
    }
  }
  return w+','+h+','+s;
}

function changeCanvasStatus(status)
{
  switch(status)
  {
    case CANVAS_STATUS.NONE:
    {
      
    }
    break;
    case CANVAS_STATUS.VIEW:
    {
      document.getElementsByName('option--crop').forEach(e=>e.style.display='none');
    }
    break;
    case CANVAS_STATUS.CROP:
    {
      document.getElementsByName('option--crop').forEach(e=>e.style.display='block');
    }
    break;
  }
  canvasStatus=status;
}

function getCanvasZoom()
{
  let org1px=imageStatus.processedImage.width/imageStatus.originalImage.width;
  return imageStatus.view.zoom*org1px;
}
function getCanvasMousePos()
{
  let zoom=getCanvasZoom();
  let cx=(mouseStatus.x-canvas.width/2-imageStatus.view.x)/zoom+imageStatus.originalImage.width/2;
  let cy=(mouseStatus.y-canvas.height/2-imageStatus.view.y)/zoom+imageStatus.originalImage.height/2;
  return[cx,cy];
}

function getCanvasEdgePos()
{
  let zoom=getCanvasZoom();
  return[
    (-canvas.width/2-imageStatus.view.x)/zoom+imageStatus.originalImage.width/2,
    (-canvas.height/2-imageStatus.view.y)/zoom+imageStatus.originalImage.height/2,
    (canvas.width/2-imageStatus.view.x)/zoom+imageStatus.originalImage.width/2,
    (canvas.height/2-imageStatus.view.y)/zoom+imageStatus.originalImage.height/2
  ];
}

function getCropRectPosList()
{
  return[
    [imageStatus.crop.x,imageStatus.crop.y],
    [imageStatus.crop.x+imageStatus.crop.w,imageStatus.crop.y],
    [imageStatus.crop.x+imageStatus.crop.w,imageStatus.crop.y+imageStatus.crop.h],
    [imageStatus.crop.x,imageStatus.crop.y+imageStatus.crop.h]
  ]
}
function getCropRectValueList()
{
  return[
    [imageStatus.crop.x,imageStatus.crop.y],
    [imageStatus.crop.w,imageStatus.crop.y],
    [imageStatus.crop.w,imageStatus.crop.h],
    [imageStatus.crop.x,imageStatus.crop.h]
  ]
}

function getNearCropRectPosIndex()
{
  let cp=getCanvasMousePos();
  let list=getCropRectPosList();
  let nearCropRect=list.slice(0).sort((a,b)=>getPowDistance(a,cp)-getPowDistance(b,cp))[0];
  return list.indexOf(nearCropRect);
}

function setCropRectPos(index,p)
{
  imageStatus.crop.w+=[1,2].includes(index)?p[0]-imageStatus.crop.w:imageStatus.crop.x-p[0];
  imageStatus.crop.h+=[2,3].includes(index)?p[1]-imageStatus.crop.h:imageStatus.crop.y-p[1];

  imageStatus.crop.x+=[1,2].includes(index)?0:p[0]-imageStatus.crop.x;
  imageStatus.crop.y+=[2,3].includes(index)?0:p[1]-imageStatus.crop.y;
}

function getPowDistance(p1,p2)
{
  return (p1[0]-p2[0])**2+(p1[1]-p2[1])**2;
}

function updateImageCrop()
{
  let cp=getCanvasMousePos();
  if(mouseStatus.selectedCropRect.index==-1)
  {
    imageStatus.crop.x=cp[0]-mouseStatus.selectedCropRect.dx;
    imageStatus.crop.y=cp[1]-mouseStatus.selectedCropRect.dy;
  }
  else
  {
    setCropRectPos(
      mouseStatus.selectedCropRect.index,
      [
        cp[0]-mouseStatus.selectedCropRect.dx,
        cp[1]-mouseStatus.selectedCropRect.dy
      ]
    );
  }

  let w=imageStatus.crop.w,h=imageStatus.crop.h,cw,ch;
  if(h*90/w>=30)
  {
    ch=30;
    cw=Math.ceil(w*30/h);
  }
  else if(w*30/h>90)
  {
    cw=90;
    ch=Math.ceil(h*90/w);
  }
  document.getElementById('option--crop--image--size').innerText=`크기: ${cw} x ${ch}`;
}

const CROP_CURSOR_SCALE=0.02;
let mouseStatus=
{
  selectedCropRect:null
};
window.onmousedown=e=>
{
  if(e.srcElement!=canvas)return;
  mouseStatus.x=e.clientX;
  mouseStatus.y=e.clientY;
  mouseStatus.isPress=true;
  if(canvasStatus==CANVAS_STATUS.CROP)
  {
    let cp=getCanvasMousePos(),idx=getNearCropRectPosIndex(),crpl=getCropRectPosList(),pos=crpl[idx],value=getCropRectValueList()[idx];
    if(getPowDistance(cp,pos)>(canvas.width/getCanvasZoom()*CROP_CURSOR_SCALE)**2)
    {
      if(cp[0]>=crpl[0][0]&&cp[1]>=crpl[0][1]&&cp[0]<=crpl[2][0]&&cp[1]<=crpl[2][1])
      {
        mouseStatus.selectedCropRect=
        {
          index:-1,
          dx:cp[0]-crpl[0][0],
          dy:cp[1]-crpl[0][1]
        };
      }
    }
    else
    {
      mouseStatus.selectedCropRect=
      {
        index:idx,
        dx:cp[0]-value[0],
        dy:cp[1]-value[1]
      };
    }
  }
};
window.onmousemove=e=>
{
  if(e.srcElement!=canvas)return;
  if(mouseStatus.isPress==true&&mouseStatus.selectedCropRect===null)
  {
    let dx=e.clientX-mouseStatus.x;
    let dy=e.clientY-mouseStatus.y;
    imageStatus.view.x+=dx;
    imageStatus.view.y+=dy;
  }
  mouseStatus.x=e.clientX;
  mouseStatus.y=e.clientY;
  if(canvasStatus==CANVAS_STATUS.CROP)
  {
    if(mouseStatus.selectedCropRect!==null)
    {
      updateImageCrop();
    }
  }
  draw();
};
window.onmousewheel=e=>
{
  if(mouseStatus!==null||e.srcElement==canvas)
  {
    imageStatus.view.zoom/=1.2**Math.sign(e.deltaY);
    draw();
  }
};
window.onmouseup=e=>
{
  if(e.srcElement!=canvas)return;
  mouseStatus.x=e.clientX;
  mouseStatus.y=e.clientY;
  mouseStatus.isPress=false;
  if(canvasStatus==CANVAS_STATUS.CROP)
  {
    if(mouseStatus.selectedCropRect!==null)
    {
      updateImageCrop();
      mouseStatus.selectedCropRect=null;
    }
  }
  draw();
};
window.onselectstart=()=>false;
window.ontouchstart=e=>
{
  if(e.srcElement!=canvas)return;
  let t=e.touches[0];
  t.srcElement=canvas;
  window.onmousedown(t);
};
window.ontouchmove=e=>
{
  let t=e.changedTouches[0];
  window.onmousemove(t);
};
window.ontouchend=e=>
{
  let t=e.touches[0];
  window.onmouseup(t);
};

window.onload=()=>
{
  window.onresize();

  options.controller.forEach(ctr=>
  {
    let title=document.createElement(ctr.titleIsLabel==true?'span':'p');
    let input=document.createElement(ctr.tag??'input');
    input.type=ctr.type;
    input._title=title;
    input._opt=ctr;
    ctr.attr.forEach(attr=>
    {
      if(attr[0][0]=='.')input[attr[0].slice(1)]=attr[1];
      else input.setAttribute(attr[0],attr[1]);
    });
    for(let e in ctr.eventListener)
    {
      input.addEventListener(e,ctr.eventListener[e]);
    }
    if(ctr.eventListener['input'])ctr.eventListener['input'].call(input);
    rightContainerDiv.append(title);
    rightContainerDiv.append(input);
  });

  const fileElement=document.getElementById('file--element');

  imageStatus.view.zoom=canvas.width/60;

  fileElement.onchange=()=>
  {
    var r=new FileReader();
    r.onload=()=>
    {
      w=null;
      img.onload=imageOnLoad;
      img.src=r.result;
    };
    r.readAsDataURL(fileElement.files[0]);
  };
  draw();
};

window.onresize=()=>
{
  let b=canvasDiv.getBoundingClientRect();
  setCanvasSize(b.width,b.height);
  ctx.imageSmoothingEnabled=false;
  draw();
};

var img=new Image();

function oneCalc()
{
  let mw=img.width/(2*45);
  let mh=img.height/(2*15);
  let mv=Math.max(mw,mh);
  
  w=canvas.width=img.width/mv|0;
  h=canvas.height=img.height/mv|0;
  
  maxc.oninput();
}

function setCanvasSize(x,y)
{
  canvas.width=x;
  canvas.height=y;
}

async function imageOnLoad()
{
  changeCanvasStatus(CANVAS_STATUS.VIEW);
  document.getElementsByClassName('first-screen')[0].style.display='none';
  imageStatus.originalImage=img;
  imageStatus.crop.w=imageStatus.originalImage.width;
  imageStatus.crop.h=imageStatus.originalImage.height;
  await scaleImage();
  await processImage();
  draw();
}

async function scaleImage()
{
  let offcanvas=new OffscreenCanvas(imageStatus.crop.w,imageStatus.crop.h);
  let offctx=offcanvas.getContext('2d');
  offctx.drawImage(img,-imageStatus.crop.x,-imageStatus.crop.y);
  await imageResize(offcanvas,0,0,offcanvas.width,offcanvas.height);
}

function getColorArray()
{
  imageProcessingOptions.getColorIndex=true;
  let d=getDetherData();
  imageProcessingOptions.getColorIndex=false;
  return d;
}

function getDetherData()
{
  let w=offcanvas.width=imageStatus.scaledImage.width;
  let h=offcanvas.height=imageStatus.scaledImage.height;

  offctx.drawImage(imageStatus.scaledImage,0,0);
  let imd=offctx.getImageData(0,0,w,h);
  return dether(imd.data,w,h,imageProcessingOptions);
}

async function processImage()
{
  if(imageStatus.scaledImage===null)return;
  let imd=new ImageData(imageStatus.scaledImage.width,imageStatus.scaledImage.height);
  getDetherData().forEach((v,i)=>imd.data[i]=v);
  offctx.putImageData(imd,0,0);

  imageStatus.processedImage=await createImageBitmap(offcanvas);
}

async function imageResize(img,x,y,w,h,stretch=false,mw=0,mh=0)
{
  let fixAxis=null;
  let cw,ch;
  if(mw!=0||mh!=0)
  {
    if(mw==0)
    {
      mw=Math.ceil(w*mh/h);
    }
    else if(mh==0)
    {
      mh=Math.ceil(h*mw/w);
    }
    offcanvas.width=mw;
    offcanvas.height=mh;
  }
  else
  {
    if(h*90/w>=30)
    {
      ch=30;
      cw=Math.ceil(w*30/h);
      fixAxis=0;
    }
    else if(w*30/h>90)
    {
      cw=90;
      ch=Math.ceil(h*90/w);
      fixAxis=1;
    }
    else
    {
      alert(`예상치 못한 오류: 리사이즈관련\nw: ${w}, h: ${h}`);
    }
    offcanvas.width=cw;
    offcanvas.height=ch;
  }
  
  if(stretch)
  {
    offctx.drawImage(img,x,y,w,h,0,0,offcanvas.width,offcanvas.height);
  }
  else
  {
    if(fixAxis==0)
      offctx.drawImage(img,x,y,w,h,0,0,cw*30/ch,ch);
    if(fixAxis==1)
      offctx.drawImage(img,x,y,w,h,0,0,cw,ch*90/cw);
  }
  imageStatus.scaledImage=await createImageBitmap(offcanvas);
  offcanvas.width=0;
  offcanvas.height=0;
}

function drawBackground(ctx)
{
  for(let x=0;x<canvas.width;x+=backgroundBitmap.width)
    for(let y=0;y<canvas.height;y+=backgroundBitmap.height)
      ctx.drawImage(backgroundBitmap,x,y);
}

let isWaitDraw=false;
function draw()
{
  if(isWaitDraw)return;
  isWaitDraw=true;
  requestAnimationFrame(realDraw);
}

function realDraw()
{
  isWaitDraw=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  switch(canvasStatus)
  {
    case CANVAS_STATUS.NONE:
    {
      
    }
    break;
    case CANVAS_STATUS.VIEW:
    {
      drawBackground(ctx);
      ctx.translate(canvas.width/2,canvas.height/2);
      ctx.translate(imageStatus.view.x,imageStatus.view.y);
      ctx.scale(imageStatus.view.zoom,imageStatus.view.zoom);

      let org1px=imageStatus.processedImage.width/imageStatus.originalImage.width;
      
      ctx.translate(org1px*imageStatus.crop.x,org1px*imageStatus.crop.y);

      ctx.translate(-imageStatus.processedImage.width/2,-imageStatus.processedImage.height/2);

      ctx.drawImage(imageStatus.processedImage,0,0);

      ctx.setTransform(1,0,0,1,0,0);
    }
    break;
    case CANVAS_STATUS.CROP:
    {
      let org1px=imageStatus.processedImage.width/imageStatus.originalImage.width;
      let zoom=imageStatus.view.zoom*org1px;

      drawBackground(ctx);

      ctx.translate(canvas.width/2,canvas.height/2);
      ctx.translate(imageStatus.view.x,imageStatus.view.y);
      ctx.scale(zoom,zoom);
      ctx.translate(-imageStatus.originalImage.width/2,-imageStatus.originalImage.height/2);

      ctx.drawImage(imageStatus.originalImage,0,0);

      let cep=getCanvasEdgePos(),crpl=getCropRectPosList(),crvl=getCropRectValueList();
      ctx.beginPath();
      ctx.moveTo(cep[0],cep[1]);
      ctx.lineTo(cep[2],cep[1]);
      ctx.lineTo(cep[2],cep[3]);
      ctx.lineTo(cep[0],cep[3]);

      
      ctx.moveTo(...crpl[0]);
      ctx.lineTo(...crpl[3]);
      ctx.lineTo(...crpl[2]);
      ctx.lineTo(...crpl[1]);

      ctx.fillStyle='#000';
      ctx.globalAlpha=0.7;
      ctx.fill();
      ctx.globalAlpha=1;

      ctx.strokeStyle='#bbb';
      ctx.fillStyle='#fff';
      ctx.lineWidth=3/zoom;
      ctx.strokeRect(...crvl[0],...crvl[2]);
      crpl.forEach(p=>
      {
        ctx.beginPath();
        ctx.arc(...p,canvas.width*CROP_CURSOR_SCALE/zoom/1.5,0,Math.PI*2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      })

      ctx.setTransform(1,0,0,1,0,0);
    }
    break;
  }
}

function main()
{
  if(w===null)oneCalc();
  
  ctx.drawImage(img,0,0,w,h);
  
  let imd=ctx.getImageData(0,0,w,h);
  
  dether(imd.data,w,h).forEach((v,i)=>imd.data[i]=v);
  
  ctx.putImageData(imd,0,0);
}