$(document).foundation();

$(window).load(function() {
   $("#demo-video-pointer").videopointer({points:[
       {x:30,y:30,color:"#fff",time:7},
       {x:20,y:20,color:"#fff",time:8},
       {x:75,y:75,color:"#fff",time:9},
       {x:25,y:75,color:"#aaa",time:1},
       {x:80,y:80,color:"#aaa",time:2},
       {x:80,y:80,color:"#aaa",time:3},
       {x:90,y:90,color:"#fff",time:4},
       {x:50,y:50,color:"#fff",time:5},
       {x:40,y:10,color:"#fff",time:6},
       {x:30,y:30,color:"#fff",time:7},
       {x:20,y:20,color:"#fff",time:8},
       {x:75,y:75,color:"#fff",time:9}
   ]
   }); 
});