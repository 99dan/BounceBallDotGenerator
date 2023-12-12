var ctx=canvas.getContext('2d');
const imageProcessingOptions=
{
  minColor:0,
  maxColor:255,
  gamma:1,
  gainColor:1,
  detherDiffusion:1
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
    isCrop:false,
    x:0,y:0,w:0,h:0
  },
  scaledImage:null,
  processedImage:null
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
        ['value',50]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.minColor=+this.value);
          processImage().then(draw());
        }
      }
    },
    {
      title:'최대 밝기: {0}',
      type:'range',
      attr:[
        ['min',0],
        ['max',255],
        ['value',255]
      ],
      eventListener:{
        input:function(){
          this._title.innerText=this._opt.title.format(imageProcessingOptions.maxColor=+this.value);
          processImage().then(draw());
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
          processImage().then(draw());
        }
      }
    },
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
    },
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
          processImage().then(draw());
        }
      }
    }
  ]
};

let mouseStatus=null;
window.onmousedown=e=>
{
  if(e.srcElement!=canvas)return;
  mouseStatus=
  {
    x:e.clientX,
    y:e.clientY
  };
};
window.onmousemove=e=>
{
  if(mouseStatus===null)return;
  let dx=e.clientX-mouseStatus.x;
  let dy=e.clientY-mouseStatus.y;
  mouseStatus=
  {
    x:e.clientX,
    y:e.clientY
  };
  imageStatus.view.x+=dx;
  imageStatus.view.y+=dy;
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
  mouseStatus=null;
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
    let title=document.createElement('p');
    let input=document.createElement('input');
    input.type=ctr.type;
    input._title=title;
    input._opt=ctr;
    ctr.attr.forEach(attr=>
    {
      input.setAttribute(attr[0],attr[1]);
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
  canvasStatus=CANVAS_STATUS.VIEW;
  document.getElementsByClassName('first-screen')[0].style.display='none';
  await scaleImage();
  await processImage();
  draw();
}

async function scaleImage()
{
  await imageResize(img,0,0,img.width,img.height);
}

async function processImage()
{
  if(imageStatus.scaledImage===null)return;
  let w=offcanvas.width=imageStatus.scaledImage.width;
  let h=offcanvas.height=imageStatus.scaledImage.height;

  offctx.drawImage(imageStatus.scaledImage,0,0);
  let imd=offctx.getImageData(0,0,w,h);
  dether(imd.data,w,h,imageProcessingOptions).forEach((v,i)=>imd.data[i]=v);
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
      ctx.translate(-imageStatus.processedImage.width/2,-imageStatus.processedImage.height/2);

      ctx.drawImage(imageStatus.processedImage,0,0);

      ctx.setTransform(1,0,0,1,0,0);
    }
    break;
    case CANVAS_STATUS.CROP:
    {

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