$(document).foundation();

$(window).load(function() {
   $("#demo-video-pointer").videopointer({points:[
       {x:30,y:30,time:7},
       {x:20,y:20,time:8},
       {x:75,y:75,time:9},
       {x:25,y:75,time:1},
       {x:80,y:80,time:2},
       {x:80,y:80,time:3},
       {x:90,y:90,time:4},
       {x:50,y:50,time:5},
       {x:40,y:10,time:6},
       {x:30,y:30,time:7},
       {x:20,y:20,time:8},
       {x:75,y:75,time:9}
   ],
    endPoint:{style:"circle",radius:3}
   }); 
});