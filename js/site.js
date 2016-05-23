$(document).foundation();

$(window).load(function() {
   $("#demo-video-pointer").videopointer({points:[
       {x:10,y:10,color:"#9BC9BD",time:1},
       {x:20,y:20,color:"#A2B5C4",time:2},
       {x:30,y:30,color:"#A2B5C4",time:3},
       {x:40,y:40,color:"#A2B5C4",time:4},
       {x:50,y:50,color:"#A2B5C4",time:5},
       {x:60,y:60,color:"#A2B5C4",time:6},
       {x:70,y:70,color:"#A2B5C4",time:7},
       {x:80,y:80,color:"#A2B5C4",time:8},
       {x:90,y:90,color:"#A2B5C4",time:9}
   ],
   expanderSelector:".pointer-anchor"
   }); 
});