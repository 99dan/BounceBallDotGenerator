const colors=[[255,255,255],[207,202,206],[163,166,163],[131,129,132],[89,89,89],[48,53,49],[255,0,40],[255,154,172],[255,102,133],[255,53,82],[189,0,33],[132,0,24],[254,129,0],[255,203,156],[255,178,100],[254,154,48],[189,96,0],[133,65,0],[254,215,0],[255,238,156],[255,231,99],[255,223,50],[188,158,0],[132,105,0],[74,231,0],[164,231,141],[132,219,90],[89,194,40],[48,146,0],[33,97,0],[0,189,182],[147,231,223],[99,219,207],[49,202,197],[0,146,141],[0,97,90],[0,170,255],[157,223,255],[98,202,255],[49,186,255],[0,128,189],[0,85,132],[41,69,205],[163,174,230],[123,137,223],[81,101,214],[34,53,157],[25,36,98],[115,28,255],[197,162,255],[164,113,254],[139,69,255],[91,24,189],[58,20,133],[254,28,215],[255,162,240],[254,113,231],[255,68,222],[189,24,163],[132,19,107],[157,121,107],[215,198,190],[189,170,164],[173,145,131],[114,89,74],[75,61,58]];

function dether(im,w,h,opt={})
{
    opt=Object.assign(
        {
            minColor:0,
            maxColor:255,
            gamma:1,
            gainColor:1,
            detherDiffusion:1
        },
        opt
    );

    var pl=colors;
    var plyuv=pl.map(x=>rgb2yuv(...x));
    
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
            ((n/255)**(1/opt.gamma))
            *(opt.maxColor-opt.minColor)
            +opt.minColor
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
            return c1.map((x,i)=>dis(x,c2[i])*(i==0?1:opt.gainColor)).reduce((a,c)=>a+c);
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
                qe.map((v,ci)=>v*[7,3,5,1][i]/16*opt.detherDiffusion+nc[ci])
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
    
    return nim;
}

String.prototype.format = function() {
    var formatted = this;
    for( var arg in arguments ) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
};