var ctx=canvas.getContext('2d');
var minColor=0,
maxColor=255,
gammaColor=0,
gainColor=1,
w=null,h;

file.onchange=()=>
{
  var r=new FileReader();
  r.onload=()=>
  {
    w=null;
    img.onload=main;
    img.src=r.result;
  };
  r.readAsDataURL(file.files[0]);
}

var img=new Image();

function oneCalc()
{
  let mw=img.width/(2*45);
  let mh=img.height/(2*15);
  let mv=Math.max(mw,mh);
  
  w=canvas.width=img.width/mv|0;
  h=canvas.height=img.height/mv|0;
  
  //console.log(w,h);
  
  maxc.oninput();
}

function main()
{
  if(w===null)oneCalc();
  
  ctx.drawImage(img,0,0,w,h);
  
  let imd=ctx.getImageData(0,0,w,h);
  
  dether(imd.data,w,h).forEach((v,i)=>imd.data[i]=v);
  
  ctx.putImageData(imd,0,0);
}

colorGain.oninput=
gamma.oninput=
maxc.oninput=
minc.oninput=()=>
{
  minColor=+minc.value;
  maxColor=+maxc.value;
  gammaColor=16**(+gamma.value/100);
  gainColor=+colorGain.value/10;
  
  logs.innerText=
`w:${w}
h:${h}
min color:${minColor}
max color:${maxColor}
gamma:${gammaColor}
color:${gainColor}`;
  main();
};

function dether(im,w,h)
{
  var pl=colors;
  var plyuv=pl.map(x=>rgb2yuv(...x));
  
  var piStr='';//w+','+h+',';
  var nim=new Array(im.length).fill(0);
  var bit=im.length/(w*h);
  
  function sv(im,x,y,[r,g,b,a=255])
  {
    if(x<0||y<0||x>=w||y>=h)return;
    let p=(x+y*w)*bit;
    im[p]=r;
    im[p+1]=g;
    im[p+2]=b;
    if(bit==4)im[p+3]=a;
  }
  
  function gv(im,x,y)
  {
    let p=(x+y*w)*bit;
    return im.slice(p,p+bit);
  }
  
  function rgb2yuv(r,g,b)
  {
    let y=.299*r+.587*g+.114*b;
    return[y,(b-y)*.565,(r-y)*.713];
  }
  
  function df(x,y)
  {
    var [rr,gr,br,ar]=gv(im,x,y).map(n=>
      
      ((n/255)**(2**gammaColor))
      *(maxColor-minColor)
      +minColor
    );
    var [rb,gb,bb]=gv(nim,x,y);
    var r=rr+rb,g=gr+gb,b=br+bb;
    
    function dis(n1,n2)
    {
      return (n1-n2)**2;
    }
    let c1=rgb2yuv(r,g,b);
    var dm=plyuv.map((c2)=>
    {
      return c1.map((x,i)=>dis(x,c2[i])*(i==0?1:gainColor)).reduce((a,c)=>a+c);
    });
    
    var minv=Infinity,mini=0;
    
    dm.forEach((v,i)=>
    {
      if(minv>v)
      {
        minv=v
        mini=i;
      }
    });
    
    piStr+=((mini%6)+Math.floor(mini/6)*16).toString(16).padStart(2,'0');
    
    var mc=pl[mini];
    
    sv(nim,x,y,mc);
    
    var qe=[r-mc[0],g-mc[1],b-mc[2]];
    
    for(let i=0;i<4;i++)
    {
      let qx=x+(i+2)%3-1,qy=y+(i>=1);
      let nc=gv(nim,qx,qy);
      sv(
        nim,
        qx,
        qy,
        qe.map((v,ci)=>v*[7,3,5,1][i]/16+nc[ci])
      );
    }
  }
  
  for(let y=0;y<h;y++)
  {
    for(let x=0;x<w;x++)
    {
      df(x,y);
    }
  }
  
  resultB.value=piStr;
  return nim;
}